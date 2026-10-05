import { BrowserWindow } from 'electron'
import { analyzeWebsite, verifyLead, formatUsPhone } from './lead-enrich'
import { RateLimiter, CancelledError, sleep, withRetry, fetchPage, hostOf, normalizeUrl } from './lead-http'
import type {
  RawLead,
  ScrapeRequest,
  ScrapeProgressEvent,
  ScrapedLeadResult,
  ScrapeSource,
  WebsiteReport
} from './lead-types'

type Emit = (event: ScrapeProgressEvent) => void

const SOURCE_GAP_MS = 2000
const CHROME_UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
]

const jobs = new Map<string, AbortController>()

export function parseQuery(query: string, location?: string): { keyword: string; location: string } {
  if (location?.trim()) return { keyword: query.trim(), location: location.trim() }
  const m = query.match(/^(.*?)\s+(?:in|near|around)\s+(.+)$/i)
  return m ? { keyword: m[1].trim(), location: m[2].trim() } : { keyword: query.trim(), location: '' }
}

function splitAddress(address?: string): Pick<RawLead, 'city' | 'state' | 'zip' | 'country'> {
  if (!address) return {}
  const m = address.match(/,\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})?(?:,\s*(.+))?$/)
  if (!m) return {}
  return { city: m[1].trim(), state: m[2], zip: m[3], country: m[4]?.trim() || 'United States' }
}

// ---------------------------------------------------------------------------
// Hidden browser helpers (Google Maps / Yelp render client-side)
// ---------------------------------------------------------------------------

async function openScrapeWindow(show: boolean): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    show,
    width: 1280,
    height: 900,
    title: 'GIEO Lead Scraper',
    webPreferences: {
      partition: 'persist:gieo-scraper',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  })
  win.webContents.setAudioMuted(true)
  win.webContents.setUserAgent(CHROME_UAS[Math.floor(Math.random() * CHROME_UAS.length)])
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  return win
}

async function evalJs<T>(win: BrowserWindow, code: string): Promise<T> {
  return (await win.webContents.executeJavaScript(code, true)) as T
}

async function waitFor(win: BrowserWindow, expr: string, timeoutMs: number, signal: AbortSignal): Promise<boolean> {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    if (win.isDestroyed()) return false
    try {
      if (await evalJs<boolean>(win, `!!(${expr})`)) return true
    } catch {
      /* page mid-navigation */
    }
    await sleep(300, signal)
  }
  return false
}

async function loadPage(win: BrowserWindow, url: string, limiter: RateLimiter, signal: AbortSignal): Promise<void> {
  await withRetry(
    async () => {
      await limiter.wait(signal)
      await win.loadURL(url).catch((err: Error) => {
        if (!/ERR_ABORTED/.test(err.message)) throw err
      })
    },
    { retries: 2, signal }
  )
}

// ---------------------------------------------------------------------------
// Google Maps
// ---------------------------------------------------------------------------

const GMAPS_PLACE_EXTRACT = `(() => {
  const q = (s) => document.querySelector(s);
  const text = (s) => q(s)?.textContent?.trim() || undefined;
  const name = text('h1.DUwDvf') || text('div[role="main"] h1') || text('h1');
  const ratingLabel = q('div.F7nice span[role="img"]')?.getAttribute('aria-label') || q('span[role="img"][aria-label*="star"]')?.getAttribute('aria-label') || '';
  const reviewLabel = q('div.F7nice span[aria-label*="review"]')?.getAttribute('aria-label') || q('button[aria-label*="reviews"]')?.getAttribute('aria-label') || '';
  const f7 = q('div.F7nice')?.textContent || '';
  const rating = parseFloat((ratingLabel.match(/([\\d.]+)/) || f7.match(/^\\s*([\\d.]+)/) || [])[1]);
  const reviews = parseInt(((reviewLabel.match(/([\\d,]+)/) || f7.match(/\\(([\\d,]+)\\)/) || [])[1] || '').replace(/,/g, ''), 10);
  const address = q('button[data-item-id="address"]')?.getAttribute('aria-label')?.replace(/^Address:\\s*/i, '').trim();
  const phoneId = q('button[data-item-id^="phone:tel:"]')?.getAttribute('data-item-id');
  const phone = phoneId ? phoneId.replace('phone:tel:', '') : q('button[aria-label^="Phone:"]')?.getAttribute('aria-label')?.replace(/^Phone:\\s*/i, '');
  let website = q('a[data-item-id="authority"]')?.href;
  if (website && website.includes('/url?')) { try { website = new URL(website).searchParams.get('q') || website } catch {} }
  const category = text('button.DkEaL') || text('button[jsaction*="category"]');
  const hours = q('div[aria-label*="Monday"]')?.getAttribute('aria-label') || q('[aria-label*="Hide open hours"]')?.getAttribute('aria-label') || undefined;
  const description = text('div.PYvSYb') || text('div[aria-label^="About"] .HlvSq');
  return { name, rating: isNaN(rating) ? undefined : rating, reviews: isNaN(reviews) ? undefined : reviews, address, phone, website, category, hours: hours?.replace(/\\. Hide open hours for the week/i, '').slice(0, 400), description };
})()`

interface GmapsPlace {
  name?: string
  rating?: number
  reviews?: number
  address?: string
  phone?: string
  website?: string
  category?: string
  hours?: string
  description?: string
}

async function acceptGoogleConsent(win: BrowserWindow): Promise<void> {
  if (!win.webContents.getURL().includes('consent.')) return
  await evalJs(win, `(() => {
    const btn = [...document.querySelectorAll('button')].find(b => /accept all|i agree|reject all/i.test(b.textContent || ''));
    btn?.click();
  })()`)
  await sleep(2500)
}

async function* scrapeGoogleMaps(
  req: ScrapeRequest,
  signal: AbortSignal,
  phase: (msg: string, progress: number) => void
): AsyncGenerator<RawLead> {
  const { keyword, location } = parseQuery(req.query, req.location)
  const search = [keyword, location && `in ${location}`].filter(Boolean).join(' ')
  const limiter = new RateLimiter(SOURCE_GAP_MS)
  const win = await openScrapeWindow(!!req.showBrowser)

  try {
    phase('Opening Google Maps…', 2)
    await loadPage(win, `https://www.google.com/maps/search/${encodeURIComponent(search)}?hl=en&gl=us`, limiter, signal)
    await acceptGoogleConsent(win)

    const ready = await waitFor(win, `document.querySelector('div[role="feed"]') || document.querySelector('h1.DUwDvf')`, 25_000, signal)
    if (!ready) {
      const blocked = await evalJs<boolean>(win, `/unusual traffic|not a robot|captcha/i.test(document.body?.innerText || '')`).catch(() => false)
      throw new Error(blocked ? 'Google is asking for a captcha — turn on "Show scraper browser" in Settings and solve it once.' : 'Google Maps returned no results for that search.')
    }

    let links: string[] = []
    const single = await evalJs<boolean>(win, `!document.querySelector('div[role="feed"]') && !!document.querySelector('h1.DUwDvf')`)
    if (single) {
      links = [win.webContents.getURL()]
    } else {
      let stale = 0
      while (links.length < req.maxResults && stale < 4) {
        if (signal.aborted) throw new CancelledError()
        const next = await evalJs<string[]>(win, `[...document.querySelectorAll('div[role="feed"] a.hfpxzc, div[role="feed"] a[href*="/maps/place/"]')].map(a => a.href)`)
        const unique = [...new Set(next)]
        stale = unique.length > links.length ? 0 : stale + 1
        links = unique
        phase(`Found ${links.length} listings on Google Maps…`, Math.min(30, 5 + (links.length / req.maxResults) * 25))
        const ended = await evalJs<boolean>(win, `/reached the end of the list/i.test(document.querySelector('div[role="feed"]')?.innerText || '')`)
        if (ended || links.length >= req.maxResults) break
        await evalJs(win, `document.querySelector('div[role="feed"]')?.scrollBy(0, 4000)`)
        await sleep(1800, signal)
      }
    }

    links = links.slice(0, req.maxResults)
    for (let i = 0; i < links.length; i++) {
      if (signal.aborted) throw new CancelledError()
      phase(`Reading listing ${i + 1} of ${links.length}…`, 30 + (i / links.length) * 65)
      try {
        await loadPage(win, links[i], limiter, signal)
        await waitFor(win, `document.querySelector('h1.DUwDvf') || document.querySelector('div[role="main"] h1')`, 12_000, signal)
        await sleep(600, signal)
        const place = await evalJs<GmapsPlace>(win, GMAPS_PLACE_EXTRACT)
        if (!place.name) continue
        yield {
          businessName: place.name,
          phone: place.phone ? formatUsPhone(place.phone) ?? place.phone : undefined,
          website: place.website ? normalizeUrl(place.website) ?? undefined : undefined,
          address: place.address,
          ...splitAddress(place.address),
          category: place.category,
          rating: place.rating,
          reviewCount: place.reviews,
          hours: place.hours,
          description: place.description,
          sourceUrl: links[i]
        }
      } catch (err) {
        if (err instanceof CancelledError) throw err
      }
    }
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

// ---------------------------------------------------------------------------
// Yelp (best effort — Yelp actively blocks automation)
// ---------------------------------------------------------------------------

const YELP_BIZ_EXTRACT = `(() => {
  const q = (s) => document.querySelector(s);
  const body = document.body?.innerText || '';
  const name = q('h1')?.textContent?.trim();
  const phone = (body.match(/Phone number\\s*\\n?\\s*(\\(?\\d{3}\\)?[\\s.-]?\\d{3}[\\s.-]?\\d{4})/) || [])[1];
  const redirect = q('a[href*="/biz_redir?"]')?.getAttribute('href');
  let website;
  if (redirect) { try { website = new URL(redirect, location.origin).searchParams.get('url') || undefined } catch {} }
  const address = q('address')?.innerText?.replace(/\\n/g, ', ').trim() || (body.match(/Get Directions\\s*\\n\\s*([^\\n]+\\n[^\\n]+)/) || [])[1]?.replace(/\\n/g, ', ');
  const ratingLabel = q('[aria-label*="star rating"]')?.getAttribute('aria-label') || '';
  const rating = parseFloat((ratingLabel.match(/([\\d.]+)/) || [])[1]);
  const reviews = parseInt(((body.match(/\\(([\\d,]+) reviews?\\)/) || body.match(/([\\d,]+) reviews?/) || [])[1] || '').replace(/,/g, ''), 10);
  const category = [...document.querySelectorAll('a[href*="find_desc="], a[href*="/c/"]')].map(a => a.textContent.trim()).filter(Boolean).slice(0, 2).join(', ');
  return { name, phone, website, address, rating: isNaN(rating) ? undefined : rating, reviews: isNaN(reviews) ? undefined : reviews, category: category || undefined };
})()`

const YELP_BLOCKED = `/unusual activity|are you a robot|captcha|access denied|verify you are human/i.test(document.body?.innerText || '') || !!document.querySelector('iframe[src*="captcha-delivery"]')`

async function* scrapeYelp(
  req: ScrapeRequest,
  signal: AbortSignal,
  phase: (msg: string, progress: number) => void
): AsyncGenerator<RawLead> {
  const { keyword, location } = parseQuery(req.query, req.location)
  if (!location) throw new Error('Yelp needs a location — e.g. "plumbers in Dallas TX".')
  const limiter = new RateLimiter(SOURCE_GAP_MS)
  const win = await openScrapeWindow(!!req.showBrowser)

  const ensureNotBlocked = async (): Promise<void> => {
    if (!(await evalJs<boolean>(win, YELP_BLOCKED).catch(() => false))) return
    if (!req.showBrowser) {
      throw new Error('Yelp blocked automated access. Turn on "Show scraper browser" in Settings to solve the check, or use Google Maps / OpenStreetMap.')
    }
    phase('Yelp is showing a human check — solve it in the scraper window…', 5)
    const solved = await waitFor(win, `!(${YELP_BLOCKED})`, 90_000, signal)
    if (!solved) throw new Error('Yelp human check not solved in time.')
  }

  try {
    const links: string[] = []
    for (let start = 0; links.length < req.maxResults && start < 240; start += 10) {
      if (signal.aborted) throw new CancelledError()
      phase(`Searching Yelp (page ${start / 10 + 1})…`, Math.min(30, 3 + (links.length / req.maxResults) * 27))
      await loadPage(
        win,
        `https://www.yelp.com/search?find_desc=${encodeURIComponent(keyword)}&find_loc=${encodeURIComponent(location)}&start=${start}`,
        limiter,
        signal
      )
      await sleep(1500, signal)
      await ensureNotBlocked()
      const found = await evalJs<string[]>(
        win,
        `[...document.querySelectorAll('a[href^="/biz/"]')].map(a => a.getAttribute('href').split('?')[0]).filter(h => !h.includes('#'))`
      )
      const before = links.length
      for (const href of found) if (!links.includes(href)) links.push(href)
      if (links.length === before) break
    }

    const targets = links.slice(0, req.maxResults)
    for (let i = 0; i < targets.length; i++) {
      if (signal.aborted) throw new CancelledError()
      phase(`Reading Yelp listing ${i + 1} of ${targets.length}…`, 30 + (i / targets.length) * 65)
      try {
        await loadPage(win, `https://www.yelp.com${targets[i]}`, limiter, signal)
        await sleep(1200, signal)
        await ensureNotBlocked()
        const biz = await evalJs<GmapsPlace>(win, YELP_BIZ_EXTRACT)
        if (!biz.name) continue
        yield {
          businessName: biz.name,
          phone: biz.phone ? formatUsPhone(biz.phone) ?? biz.phone : undefined,
          website: biz.website ? normalizeUrl(biz.website) ?? undefined : undefined,
          address: biz.address,
          ...splitAddress(biz.address),
          category: biz.category,
          rating: biz.rating,
          reviewCount: biz.reviews,
          sourceUrl: `https://www.yelp.com${targets[i]}`
        }
      } catch (err) {
        if (err instanceof CancelledError) throw err
        if ((err as Error).message.includes('blocked')) throw err
      }
    }
  } finally {
    if (!win.isDestroyed()) win.destroy()
  }
}

// ---------------------------------------------------------------------------
// OpenStreetMap (free, open data — Nominatim + Overpass)
// ---------------------------------------------------------------------------

const OSM_TAGS: [RegExp, string[]][] = [
  [/real\s*estate|realtor|realty|broker/i, ['office=estate_agent']],
  [/property\s*manage/i, ['office=property_management', 'office=estate_agent']],
  [/home\s*builder|builder|construction|contractor|developer/i, ['craft=builder', 'office=construction_company', 'office=property_developer']],
  [/plumb/i, ['craft=plumber']],
  [/electric/i, ['craft=electrician']],
  [/hvac|air condition|heating/i, ['craft=hvac']],
  [/roof/i, ['craft=roofer']],
  [/landscap|lawn|garden/i, ['craft=gardener', 'shop=garden_centre']],
  [/dentist|dental/i, ['amenity=dentist', 'healthcare=dentist']],
  [/chiro/i, ['healthcare=chiropractor']],
  [/clinic|doctor|medical|med\s*spa/i, ['amenity=clinic', 'amenity=doctors']],
  [/spa|beauty|salon|nail/i, ['shop=beauty', 'shop=hairdresser', 'leisure=spa']],
  [/barber/i, ['shop=hairdresser']],
  [/gym|fitness|yoga|pilates|crossfit/i, ['leisure=fitness_centre', 'sport=yoga']],
  [/restaurant/i, ['amenity=restaurant']],
  [/cafe|coffee/i, ['amenity=cafe']],
  [/bar\b|pub/i, ['amenity=bar', 'amenity=pub']],
  [/hotel|motel|inn\b/i, ['tourism=hotel', 'tourism=motel']],
  [/vacation rental|airbnb|short.?term/i, ['tourism=apartment', 'tourism=guest_house', 'tourism=chalet']],
  [/law|attorney/i, ['office=lawyer']],
  [/account|cpa|tax/i, ['office=accountant', 'office=tax_advisor']],
  [/insurance/i, ['office=insurance']],
  [/car dealer|auto dealer|dealership/i, ['shop=car']],
  [/auto repair|mechanic|car repair/i, ['shop=car_repair']],
  [/florist/i, ['shop=florist']],
  [/bakery/i, ['shop=bakery']],
  [/jewel/i, ['shop=jewelry']],
  [/furniture/i, ['shop=furniture']],
  [/clothing|boutique|apparel/i, ['shop=clothes', 'shop=boutique']],
  [/architect/i, ['office=architect']],
  [/interior design/i, ['shop=interior_decoration', 'office=interior_design']],
  [/photograph/i, ['craft=photographer', 'shop=photo']],
  [/vet/i, ['amenity=veterinary']],
  [/clean/i, ['shop=dry_cleaning', 'office=cleaning']],
  [/marketing|agency/i, ['office=advertising_agency', 'office=marketing']]
]

interface OsmElement {
  type: string
  id: number
  tags?: Record<string, string>
}

async function* scrapeOpenStreetMap(
  req: ScrapeRequest,
  signal: AbortSignal,
  phase: (msg: string, progress: number) => void
): AsyncGenerator<RawLead> {
  const { keyword, location } = parseQuery(req.query, req.location)
  if (!location) throw new Error('OpenStreetMap needs a location — e.g. "dentists in Austin TX".')

  phase(`Locating ${location}…`, 5)
  const geo = await fetchPage(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=us,ca`,
    { signal, retries: 2 }
  )
  const place = (JSON.parse(geo.html) as { boundingbox?: string[]; display_name?: string }[])[0]
  if (!place?.boundingbox) throw new Error(`Couldn't find "${location}" on the map.`)
  const [south, north, west, east] = place.boundingbox.map(Number)
  const bbox = `${south},${west},${north},${east}`

  const tagFilters = OSM_TAGS.filter(([re]) => re.test(keyword)).flatMap(([, tags]) => tags)
  const safeKw = keyword.replace(/s\b/i, '').replace(/["\\]/g, '').slice(0, 40)
  const clauses = tagFilters.length
    ? tagFilters.map((t) => {
        const [k, v] = t.split('=')
        return `nwr["${k}"="${v}"]["name"](${bbox});`
      })
    : ['shop', 'office', 'craft', 'amenity', 'healthcare'].map((k) => `nwr["${k}"]["name"~"${safeKw}",i](${bbox});`)

  phase(`Searching OpenStreetMap for ${keyword}…`, 15)
  const overpassQuery = `[out:json][timeout:60];(${clauses.join('')});out tags ${Math.min(500, req.maxResults * 3)};`
  const res = await withRetry(
    async () => {
      const r = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        signal: AbortSignal.any([signal, AbortSignal.timeout(70_000)]),
        headers: { 'User-Agent': 'GIEO-CRM/1.0 (lead research)', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`
      })
      if (r.status === 429 || r.status >= 500) throw new Error(`OpenStreetMap busy (HTTP ${r.status})`)
      return (await r.json()) as { elements: OsmElement[] }
    },
    { retries: 2, baseDelayMs: 4000, signal }
  )

  const elements = res.elements
    .filter((e) => e.tags?.name)
    .sort((a, b) => score(b.tags!) - score(a.tags!))
    .slice(0, req.maxResults)
  if (!elements.length) throw new Error(`OpenStreetMap has no "${keyword}" businesses mapped in ${location}. Try Google Maps.`)

  function score(t: Record<string, string>): number {
    return Number(!!(t.phone || t['contact:phone'])) * 2 + Number(!!(t.website || t['contact:website'])) * 2 + Number(!!(t.email || t['contact:email']))
  }

  for (const el of elements) {
    const t = el.tags!
    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
    const city = t['addr:city']
    const state = t['addr:state']
    const zip = t['addr:postcode']
    const phone = t.phone || t['contact:phone']
    const website = t.website || t['contact:website']
    yield {
      businessName: t.name,
      phone: phone ? formatUsPhone(phone.split(';')[0]) ?? phone.split(';')[0] : undefined,
      email: t.email || t['contact:email'],
      website: website ? normalizeUrl(website) ?? undefined : undefined,
      address: [street, city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || undefined,
      city,
      state,
      zip,
      country: t['addr:country'] || 'United States',
      category: (t.office || t.shop || t.craft || t.amenity || t.healthcare || t.tourism || '').replace(/_/g, ' ') || undefined,
      hours: t.opening_hours,
      description: t.description,
      sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`
    }
  }
}

// ---------------------------------------------------------------------------
// Custom website URLs
// ---------------------------------------------------------------------------

async function* scrapeWebsites(req: ScrapeRequest): AsyncGenerator<RawLead> {
  const urls = (req.urls ?? []).map((u) => normalizeUrl(u)).filter((u): u is string => !!u).slice(0, req.maxResults)
  if (!urls.length) throw new Error('Add at least one website URL (one per line).')
  for (const url of urls) {
    yield { businessName: hostOf(url), website: url, sourceUrl: url }
  }
}

// ---------------------------------------------------------------------------
// Job runner
// ---------------------------------------------------------------------------

function cleanTitle(title?: string): string | undefined {
  if (!title) return undefined
  const part = title.split(/\s[|–—-]\s/)[0]?.trim()
  return part && part.length > 2 && part.length < 80 ? part : undefined
}

async function enrich(raw: RawLead, source: ScrapeSource, signal: AbortSignal): Promise<ScrapedLeadResult> {
  let site: WebsiteReport | undefined
  if (raw.website) site = await analyzeWebsite(raw.website, signal)

  const schema = site?.schema
  const lead: RawLead = {
    ...raw,
    businessName:
      source === 'website' ? schema?.name || cleanTitle(site?.title) || raw.businessName : raw.businessName,
    phone: raw.phone || (schema?.telephone && (formatUsPhone(schema.telephone) ?? schema.telephone)) || site?.phones[0],
    email: raw.email || schema?.email || site?.emails[0],
    address: raw.address || schema?.address,
    city: raw.city || schema?.city,
    state: raw.state || schema?.state,
    zip: raw.zip || schema?.zip,
    category: raw.category || schema?.category,
    description: raw.description || site?.description,
    website: site?.reachable ? site.url : raw.website
  }

  const verification = await verifyLead(lead, site)
  return {
    ...lead,
    source,
    hasWebsite: !!lead.website,
    websiteQuality: site ? (site.reachable ? site.quality : 0) : null,
    socialMedia: site?.socials ?? {},
    techStack: site?.tech ?? [],
    verification: { ...verification, qualityNotes: site?.qualityNotes }
  }
}

export function startScrape(req: ScrapeRequest, emit: Emit): void {
  cancelScrape(req.jobId)
  const controller = new AbortController()
  jobs.set(req.jobId, controller)
  const { signal } = controller
  const errors: string[] = []
  let found = 0
  let lastProgress = 0

  const phase = (msg: string, progress: number): void => {
    lastProgress = Math.max(lastProgress, Math.round(progress))
    emit({ jobId: req.jobId, status: 'running', phase: msg, progress: lastProgress, totalFound: found })
  }

  const generator =
    req.source === 'google_maps'
      ? scrapeGoogleMaps(req, signal, phase)
      : req.source === 'yelp'
        ? scrapeYelp(req, signal, phase)
        : req.source === 'openstreetmap'
          ? scrapeOpenStreetMap(req, signal, phase)
          : scrapeWebsites(req)

  void (async () => {
    const seen = new Set<string>()
    const pending: Promise<void>[] = []
    let inFlight = 0

    try {
      phase('Starting…', 1)
      for await (const raw of generator) {
        const key = `${raw.businessName.toLowerCase()}|${(raw.phone ?? '').replace(/\D/g, '')}`
        if (seen.has(key)) continue
        seen.add(key)

        while (inFlight >= 3) await sleep(200, signal)
        inFlight++
        pending.push(
          enrich(raw, req.source, signal)
            .then((lead) => {
              found++
              emit({
                jobId: req.jobId,
                status: 'running',
                phase: `Verified ${lead.businessName}`,
                progress: req.source === 'website' || req.source === 'openstreetmap'
                  ? Math.max(lastProgress, Math.round(15 + (found / Math.max(1, Math.min(req.maxResults, seen.size))) * 80))
                  : lastProgress,
                totalFound: found,
                lead
              })
            })
            .catch((err: Error) => {
              if (!(err instanceof CancelledError)) errors.push(`${raw.businessName}: ${err.message}`)
            })
            .finally(() => {
              inFlight--
            })
        )
      }
      await Promise.all(pending)
      emit({
        jobId: req.jobId,
        status: 'completed',
        phase: found ? `Done — ${found} leads found` : 'Done — no leads found',
        progress: 100,
        totalFound: found,
        errors
      })
    } catch (err) {
      await Promise.allSettled(pending)
      const cancelled = err instanceof CancelledError || signal.aborted
      emit({
        jobId: req.jobId,
        status: cancelled ? 'cancelled' : 'failed',
        phase: cancelled ? `Cancelled — kept ${found} leads` : (err as Error).message,
        progress: lastProgress,
        totalFound: found,
        error: cancelled ? undefined : (err as Error).message,
        errors
      })
    } finally {
      jobs.delete(req.jobId)
    }
  })()
}

export function cancelScrape(jobId: string): void {
  jobs.get(jobId)?.abort()
  jobs.delete(jobId)
}
