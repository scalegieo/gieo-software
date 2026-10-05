import { promises as dns } from 'dns'
import { fetchPage, hostOf, normalizeUrl, RateLimiter, CancelledError } from './lead-http'
import type { RawLead, VerificationCheck, LeadVerification, WebsiteReport } from './lead-types'

const websiteLimiter = new RateLimiter(1000)

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g
const JUNK_EMAIL = /(\.(png|jpe?g|gif|webp|svg|css|js)$)|example\.|sentry|wixpress|godaddy|domain\.com|email\.com|yourname|@2x|u00/i

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  facebook: /https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share|plugins|tr\?|dialog)[A-Za-z0-9_.\-/]+/i,
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore)[A-Za-z0-9_.]+/i,
  linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_\-%]+/i,
  tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+/i,
  youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[A-Za-z0-9_\-]+/i,
  x: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/(?!intent|share|home)[A-Za-z0-9_]+/i
}

const TECH_SIGNATURES: [string, RegExp][] = [
  ['WordPress', /wp-content|wp-includes/i],
  ['Shopify', /cdn\.shopify\.com|Shopify\.theme/i],
  ['Wix', /wixstatic\.com|_wixCssImports|wix-code/i],
  ['Squarespace', /squarespace\.com|static1\.squarespace/i],
  ['Webflow', /webflow\.(?:com|io)|data-wf-page/i],
  ['GoDaddy Builder', /img1\.wsimg\.com|godaddy-website-builder/i],
  ['Weebly', /weebly\.com/i],
  ['Duda', /dudaone|multiscreensite/i],
  ['Next.js', /__NEXT_DATA__|\/_next\//i],
  ['React', /data-reactroot|react-dom/i],
  ['Google Analytics', /gtag\(|google-analytics\.com|googletagmanager\.com\/gtag/i],
  ['Google Tag Manager', /googletagmanager\.com\/gtm/i],
  ['Meta Pixel', /fbq\(|connect\.facebook\.net\/.*fbevents/i],
  ['TikTok Pixel', /analytics\.tiktok\.com/i],
  ['HubSpot', /js\.hs-scripts\.com|hubspot/i],
  ['Mailchimp', /mailchimp|list-manage\.com/i],
  ['Calendly', /calendly\.com/i],
  ['Online booking', /booksy|vagaro|schedulicity|acuityscheduling|square\.site\/book|housecallpro|servicetitan/i],
  ['Live chat', /intercom|drift\.com|tawk\.to|livechatinc|podium/i],
  ['kvCORE', /kvcore/i],
  ['Ylopo', /ylopo/i],
  ['Placester', /placester/i],
  ['Sierra Interactive', /sierrainteractive/i],
  ['Real Geeks', /realgeeks/i],
  ['IDX listings', /idxbroker|showcaseidx|ihomefinder|\bidx\b/i],
  ['Matterport', /matterport\.com/i],
  ['Video embed', /youtube\.com\/embed|player\.vimeo\.com|<video[\s>]/i]
]

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
}

function extractEmails(html: string, preferHost: string): string[] {
  const found = new Set<string>()
  for (const m of html.matchAll(/mailto:([^"'?>\s]+)/gi)) found.add(decodeURIComponent(m[1]).toLowerCase())
  for (const m of stripTags(html).matchAll(EMAIL_RE)) found.add(m[0].toLowerCase())
  const list = [...found].filter((e) => !JUNK_EMAIL.test(e) && e.length < 80)
  return list.sort((a, b) => Number(b.endsWith(preferHost)) - Number(a.endsWith(preferHost)))
}

export function formatUsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  if (digits.length !== 10 || !/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function extractPhones(html: string): string[] {
  const found = new Set<string>()
  for (const m of html.matchAll(/tel:([+\d\s().-]{7,20})/gi)) {
    const p = formatUsPhone(m[1])
    if (p) found.add(p)
  }
  for (const m of stripTags(html).matchAll(PHONE_RE)) {
    const p = formatUsPhone(m[0])
    if (p) found.add(p)
  }
  return [...found].slice(0, 5)
}

function extractSocials(html: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, re] of Object.entries(SOCIAL_PATTERNS)) {
    const m = html.match(re)
    if (m) out[key] = m[0].replace(/["'<>].*$/, '').replace(/\/$/, '')
  }
  return out
}

function findContactLink(html: string, base: string): string | null {
  const m = html.match(/href=["']([^"']*(?:contact|about)[^"']*)["']/i)
  if (!m) return null
  try {
    const url = new URL(m[1], base)
    return hostOf(url.toString()) === hostOf(base) ? url.toString() : null
  } catch {
    return null
  }
}

type JsonLdNode = Record<string, unknown>

function extractSchema(html: string): WebsiteReport['schema'] {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(m[1].trim()) as JsonLdNode | JsonLdNode[]
      const nodes = (Array.isArray(parsed) ? parsed : [parsed]).flatMap((n) =>
        Array.isArray(n['@graph']) ? (n['@graph'] as JsonLdNode[]) : [n]
      )
      const biz = nodes.find((n) => n.telephone || n.address)
      if (!biz) continue
      const addr = (typeof biz.address === 'object' && biz.address ? biz.address : {}) as JsonLdNode
      const type = Array.isArray(biz['@type']) ? biz['@type'][0] : biz['@type']
      return {
        name: typeof biz.name === 'string' ? biz.name : undefined,
        telephone: typeof biz.telephone === 'string' ? biz.telephone : undefined,
        email: typeof biz.email === 'string' ? biz.email.replace(/^mailto:/, '') : undefined,
        address: typeof addr.streetAddress === 'string' ? addr.streetAddress : typeof biz.address === 'string' ? biz.address : undefined,
        city: typeof addr.addressLocality === 'string' ? addr.addressLocality : undefined,
        state: typeof addr.addressRegion === 'string' ? addr.addressRegion : undefined,
        zip: typeof addr.postalCode === 'string' ? addr.postalCode : undefined,
        category: typeof type === 'string' && type !== 'Organization' ? type.replace(/([a-z])([A-Z])/g, '$1 $2') : undefined
      }
    } catch {
      /* malformed JSON-LD */
    }
  }
  return undefined
}

/** Scores website quality 0-100 from free, observable signals. */
function scoreWebsite(html: string, finalUrl: string, ms: number, tech: string[]): { score: number; notes: string[] } {
  const notes: string[] = []
  let score = 0
  const add = (pts: number, ok: boolean, good: string, bad: string): void => {
    if (ok) score += pts
    notes.push(ok ? `✓ ${good}` : `✗ ${bad}`)
  }
  add(15, finalUrl.startsWith('https://'), 'Secure (HTTPS)', 'No HTTPS')
  add(15, /<meta[^>]+name=["']viewport/i.test(html), 'Mobile-friendly', 'Not mobile-optimized')
  add(10, /<title>[^<]{5,}<\/title>/i.test(html), 'Has page title', 'Missing page title')
  add(10, /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{30,}/i.test(html), 'Has SEO description', 'No SEO meta description')
  add(10, ms < 2500, `Loads fast (${(ms / 1000).toFixed(1)}s)`, `Slow load (${(ms / 1000).toFixed(1)}s)`)
  add(10, tech.some((t) => /Analytics|Tag Manager/.test(t)), 'Tracks analytics', 'No analytics tracking')
  add(10, tech.some((t) => /Pixel/.test(t)), 'Has ad pixel', 'No ad pixel (not retargeting)')
  const year = new Date().getFullYear()
  const copyright = html.match(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/i)
  const fresh = !copyright || Number(copyright[1]) >= year - 1
  add(10, fresh, 'Recently updated', `Outdated (© ${copyright?.[1]})`)
  add(10, tech.includes('Video embed'), 'Uses video', 'No video content')
  return { score, notes }
}

export async function analyzeWebsite(rawUrl: string, signal?: AbortSignal): Promise<WebsiteReport> {
  const url = normalizeUrl(rawUrl)
  if (!url) return { url: rawUrl, reachable: false, error: 'Invalid URL', emails: [], phones: [], socials: {}, tech: [], quality: 0, qualityNotes: [] }

  try {
    const page = await fetchPage(url, { signal, limiter: websiteLimiter, retries: 1, timeoutMs: 12_000 })
    if (page.status >= 400) {
      return { url, reachable: false, status: page.status, error: `HTTP ${page.status}`, emails: [], phones: [], socials: {}, tech: [], quality: 0, qualityNotes: [] }
    }
    const host = hostOf(page.url)
    let html = page.html
    let emails = extractEmails(html, host)

    if (!emails.length) {
      const contact = findContactLink(html, page.url)
      if (contact) {
        try {
          const extra = await fetchPage(contact, { signal, limiter: websiteLimiter, retries: 0, timeoutMs: 8000 })
          html += extra.html
          emails = extractEmails(html, host)
        } catch (err) {
          if (err instanceof CancelledError) throw err
        }
      }
    }

    const tech = TECH_SIGNATURES.filter(([, re]) => re.test(html)).map(([name]) => name)
    const { score, notes } = scoreWebsite(page.html, page.url, page.ms, tech)
    const title = page.html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim()
    const description = page.html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim()

    return {
      url: page.url,
      reachable: true,
      status: page.status,
      title,
      description,
      emails: emails.slice(0, 5),
      phones: extractPhones(html),
      socials: extractSocials(html),
      tech,
      quality: score,
      qualityNotes: notes,
      loadMs: page.ms,
      schema: extractSchema(page.html)
    }
  } catch (err) {
    if (err instanceof CancelledError) throw err
    return { url, reachable: false, error: (err as Error).message, emails: [], phones: [], socials: {}, tech: [], quality: 0, qualityNotes: [] }
  }
}

const mxCache = new Map<string, boolean>()

async function hasMx(domain: string): Promise<boolean> {
  if (mxCache.has(domain)) return mxCache.get(domain)!
  try {
    const records = await dns.resolveMx(domain)
    const ok = records.length > 0
    mxCache.set(domain, ok)
    return ok
  } catch {
    mxCache.set(domain, false)
    return false
  }
}

const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|aol|icloud|me|live|msn|comcast|att|sbcglobal|bellsouth)\./i

/** Free, deterministic verification checks run before any AI. */
export async function verifyLead(lead: RawLead, site?: WebsiteReport): Promise<LeadVerification> {
  const checks: VerificationCheck[] = []

  if (lead.phone) {
    const formatted = formatUsPhone(lead.phone)
    checks.push({
      key: 'phone_format',
      label: 'Phone format',
      pass: !!formatted || /^\+\d{8,15}$/.test(lead.phone.replace(/[\s().-]/g, '')),
      detail: formatted ? `Valid US number ${formatted}` : `Unusual format: ${lead.phone}`
    })
  } else {
    checks.push({ key: 'phone_format', label: 'Phone number', pass: false, detail: 'No phone found' })
  }

  if (lead.email) {
    const domain = lead.email.split('@')[1] ?? ''
    const mx = domain ? await hasMx(domain) : false
    checks.push({
      key: 'email_mx',
      label: 'Email can receive mail',
      pass: mx,
      detail: mx ? `${domain} has mail servers` : `${domain || 'domain'} has no mail servers`
    })
    if (lead.website && !FREE_MAIL.test(lead.email)) {
      const match = domain.replace(/^www\./, '') === hostOf(lead.website)
      checks.push({
        key: 'email_domain',
        label: 'Email matches website',
        pass: match,
        detail: match ? 'Same domain as website' : `Email domain ${domain} ≠ ${hostOf(lead.website)}`
      })
    }
  } else {
    checks.push({ key: 'email_mx', label: 'Email', pass: false, detail: 'No email found' })
  }

  if (lead.website) {
    checks.push({
      key: 'website_live',
      label: 'Website online',
      pass: !!site?.reachable,
      detail: site?.reachable ? `Responds (HTTP ${site.status})` : `Unreachable${site?.error ? ` — ${site.error}` : ''}`
    })
    if (site?.reachable && lead.phone) {
      const listed = formatUsPhone(lead.phone)
      const onSite = !!listed && site.phones.includes(listed)
      checks.push({
        key: 'phone_on_site',
        label: 'Phone listed on website',
        pass: onSite,
        detail: onSite ? 'Same phone appears on their site' : 'Phone not found on their site'
      })
    }
  } else {
    checks.push({ key: 'website_live', label: 'Website', pass: false, detail: 'No website listed' })
  }

  if (lead.reviewCount != null) {
    const active = lead.reviewCount >= 3
    checks.push({
      key: 'reviews',
      label: 'Active listing',
      pass: active,
      detail: `${lead.reviewCount} reviews${lead.rating ? ` · ${lead.rating}★` : ''}`
    })
  }

  const passed = checks.filter((c) => c.pass).length
  return { checks, score: Math.round((passed / Math.max(1, checks.length)) * 100), checkedAt: new Date().toISOString() }
}
