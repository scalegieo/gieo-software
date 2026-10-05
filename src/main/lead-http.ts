/** Shared HTTP helpers for the lead scraper: rate limiting, retries, user-agent rotation. */

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
]

let uaIndex = Math.floor(Math.random() * USER_AGENTS.length)

export function nextUserAgent(): string {
  uaIndex = (uaIndex + 1) % USER_AGENTS.length
  return USER_AGENTS[uaIndex]
}

export class CancelledError extends Error {
  constructor() {
    super('Cancelled')
  }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new CancelledError())
    const onAbort = (): void => {
      clearTimeout(t)
      reject(new CancelledError())
    }
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/** Enforces a minimum gap between requests to the same rate-limit bucket. */
export class RateLimiter {
  private last = 0
  constructor(private readonly minGapMs: number) {}

  async wait(signal?: AbortSignal): Promise<void> {
    const gap = this.last + this.minGapMs - Date.now()
    if (gap > 0) await sleep(gap, signal)
    this.last = Date.now()
  }
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number; signal?: AbortSignal } = {}
): Promise<T> {
  const retries = opts.retries ?? 2
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (opts.signal?.aborted) throw new CancelledError()
    try {
      return await fn(attempt)
    } catch (err) {
      if (err instanceof CancelledError) throw err
      lastErr = err
      if (attempt < retries) await sleep((opts.baseDelayMs ?? 1500) * 2 ** attempt, opts.signal)
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

export interface FetchedPage {
  url: string
  status: number
  html: string
  ms: number
}

export async function fetchPage(
  url: string,
  opts: { signal?: AbortSignal; timeoutMs?: number; limiter?: RateLimiter; retries?: number } = {}
): Promise<FetchedPage> {
  return withRetry(
    async () => {
      await opts.limiter?.wait(opts.signal)
      const started = Date.now()
      const timeout = AbortSignal.timeout(opts.timeoutMs ?? 12_000)
      const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout
      const res = await fetch(url, {
        redirect: 'follow',
        signal,
        headers: {
          'User-Agent': nextUserAgent(),
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      const html = (await res.text()).slice(0, 1_500_000)
      return { url: res.url || url, status: res.status, html, ms: Date.now() - started }
    },
    { retries: opts.retries ?? 2, signal: opts.signal }
  )
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    if (!url.hostname.includes('.')) return null
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid|fbclid|y_source)/i.test(key)) url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return null
  }
}

export function hostOf(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}
