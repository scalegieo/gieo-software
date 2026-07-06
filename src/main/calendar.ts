import { createServer, type Server } from 'http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { shell } from 'electron'
import { GIEO_SECRETS } from './gieo-config'

const OAUTH_PORT = 42857
const REDIRECT_URI = `http://127.0.0.1:${OAUTH_PORT}/oauth/callback`
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

export interface CalendarEvent {
  id: string
  source: 'google' | 'calendly'
  title: string
  start: string
  end: string
  location?: string
  attendees?: string
  htmlLink?: string
  status?: string
}

export interface CalendarConnectionStatus {
  google: {
    connected: boolean
    email?: string
    configured: boolean
    error?: string
  }
  calendly: {
    connected: boolean
    email?: string
    name?: string
    error?: string
  }
}

interface PersistedCalendar {
  google?: {
    accessToken: string
    refreshToken?: string
    expiresAt: number
    email?: string
  }
  calendly?: {
    token: string
    userUri?: string
    email?: string
    name?: string
  }
}

let storePath = ''
let state: PersistedCalendar = {}

export function initCalendarStore(userDataPath: string): void {
  storePath = join(userDataPath, 'calendar-connections.json')
  if (!existsSync(userDataPath)) mkdirSync(userDataPath, { recursive: true })
  loadState()
}

function loadState(): void {
  if (!storePath || !existsSync(storePath)) {
    state = {}
    return
  }
  try {
    state = JSON.parse(readFileSync(storePath, 'utf-8')) as PersistedCalendar
  } catch {
    state = {}
  }
}

function saveState(): void {
  if (!storePath) return
  writeFileSync(storePath, JSON.stringify(state, null, 2), 'utf-8')
}

function googleConfigured(): boolean {
  const id = GIEO_SECRETS.googleCalendar.clientId
  return Boolean(id && !id.includes('REPLACE'))
}

async function exchangeGoogleCode(code: string): Promise<void> {
  const { clientId, clientSecret } = GIEO_SECRETS.googleCalendar
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    }),
    signal: AbortSignal.timeout(30_000)
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(body || `Google token exchange failed (${res.status})`)
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }

  state.google = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? state.google?.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000 - 60_000
  }

  const email = await fetchGoogleEmail(data.access_token)
  if (email) state.google.email = email
  saveState()
}

async function fetchGoogleEmail(accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000)
    })
    if (!res.ok) return undefined
    const data = (await res.json()) as { email?: string }
    return data.email
  } catch {
    return undefined
  }
}

async function refreshGoogleTokenIfNeeded(): Promise<string | null> {
  if (!state.google?.accessToken) return null
  if (state.google.expiresAt > Date.now()) return state.google.accessToken
  if (!state.google.refreshToken) return null

  const { clientId, clientSecret } = GIEO_SECRETS.googleCalendar
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: state.google.refreshToken,
      grant_type: 'refresh_token'
    }),
    signal: AbortSignal.timeout(20_000)
  })

  if (!res.ok) return null

  const data = (await res.json()) as { access_token: string; expires_in: number }
  state.google.accessToken = data.access_token
  state.google.expiresAt = Date.now() + data.expires_in * 1000 - 60_000
  saveState()
  return state.google.accessToken
}

function waitForGoogleOAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    let server: Server | null = null
    const timeout = setTimeout(() => {
      server?.close()
      reject(new Error('Google sign-in timed out — try again'))
    }, 120_000)

    server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://127.0.0.1:${OAUTH_PORT}`)
        if (url.pathname !== '/oauth/callback') {
          res.writeHead(404)
          res.end()
          return
        }

        const err = url.searchParams.get('error')
        const code = url.searchParams.get('code')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(
          '<html><body style="font-family:system-ui;background:#09090b;color:#fafafa;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><h1>GIEO connected</h1><p>Google Calendar linked — close this tab and return to GIEO.</p></div></body></html>'
        )
        clearTimeout(timeout)
        server?.close()
        if (err) reject(new Error(err))
        else if (code) resolve(code)
        else reject(new Error('No authorization code received'))
      } catch (e) {
        clearTimeout(timeout)
        server?.close()
        reject(e)
      }
    })

    server.listen(OAUTH_PORT, '127.0.0.1')
  })
}

export async function connectGoogleCalendar(): Promise<{ success: boolean; error?: string; email?: string }> {
  if (!googleConfigured()) {
    return {
      success: false,
      error: 'Add Google OAuth client ID & secret in src/main/gieo-config.ts (Google Cloud Console → Desktop app).'
    }
  }

  try {
    const { clientId } = GIEO_SECRETS.googleCalendar
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', GOOGLE_SCOPES)
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')

    const codePromise = waitForGoogleOAuthCode()
    await shell.openExternal(authUrl.toString())
    const code = await codePromise
    await exchangeGoogleCode(code)

    return { success: true, email: state.google?.email }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function disconnectGoogleCalendar(): void {
  delete state.google
  saveState()
}

export async function connectCalendly(token: string): Promise<{ success: boolean; error?: string; email?: string }> {
  const trimmed = token.trim()
  if (!trimmed) return { success: false, error: 'Calendly personal access token required' }

  try {
    const res = await fetch('https://api.calendly.com/users/me', {
      headers: {
        Authorization: `Bearer ${trimmed}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(15_000)
    })

    if (!res.ok) {
      const body = await res.text()
      return { success: false, error: body || `Calendly auth failed (${res.status})` }
    }

    const data = (await res.json()) as {
      resource?: { uri?: string; email?: string; name?: string }
    }

    state.calendly = {
      token: trimmed,
      userUri: data.resource?.uri,
      email: data.resource?.email,
      name: data.resource?.name
    }
    saveState()
    return { success: true, email: state.calendly.email }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export function disconnectCalendly(): void {
  delete state.calendly
  saveState()
}

export function getCalendarStatus(): CalendarConnectionStatus {
  return {
    google: {
      connected: Boolean(state.google?.accessToken),
      email: state.google?.email,
      configured: googleConfigured()
    },
    calendly: {
      connected: Boolean(state.calendly?.token),
      email: state.calendly?.email,
      name: state.calendly?.name
    }
  }
}

async function fetchGoogleEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const token = await refreshGoogleTokenIfNeeded()
  if (!token) return []

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '50')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000)
  })

  if (!res.ok) return []

  const data = (await res.json()) as {
    items?: {
      id: string
      summary?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
      location?: string
      htmlLink?: string
      status?: string
      attendees?: { email?: string }[]
    }[]
  }

  return (data.items ?? []).map((ev) => ({
    id: `google-${ev.id}`,
    source: 'google' as const,
    title: ev.summary || 'Untitled',
    start: ev.start?.dateTime ?? ev.start?.date ?? '',
    end: ev.end?.dateTime ?? ev.end?.date ?? '',
    location: ev.location,
    attendees: ev.attendees?.map((a) => a.email).filter(Boolean).join(', '),
    htmlLink: ev.htmlLink,
    status: ev.status
  }))
}

async function fetchCalendlyEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  if (!state.calendly?.token || !state.calendly.userUri) return []

  const url = new URL('https://api.calendly.com/scheduled_events')
  url.searchParams.set('user', state.calendly.userUri)
  url.searchParams.set('min_start_time', timeMin)
  url.searchParams.set('max_start_time', timeMax)
  url.searchParams.set('count', '50')
  url.searchParams.set('status', 'active')

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${state.calendly.token}`,
      'Content-Type': 'application/json'
    },
    signal: AbortSignal.timeout(20_000)
  })

  if (!res.ok) return []

  const data = (await res.json()) as {
    collection?: {
      uri: string
      name?: string
      start_time: string
      end_time: string
      status: string
      location?: { location?: string; join_url?: string }
    }[]
  }

  return (data.collection ?? []).map((ev) => ({
    id: `calendly-${ev.uri}`,
    source: 'calendly' as const,
    title: ev.name || 'Calendly meeting',
    start: ev.start_time,
    end: ev.end_time,
    location: ev.location?.join_url || ev.location?.location,
    htmlLink: ev.location?.join_url,
    status: ev.status
  }))
}

export async function fetchCalendarEvents(daysAhead = 14): Promise<{
  events: CalendarEvent[]
  error?: string
}> {
  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + daysAhead)

  const timeMin = now.toISOString()
  const timeMax = end.toISOString()

  try {
    const [google, calendly] = await Promise.all([
      fetchGoogleEvents(timeMin, timeMax),
      fetchCalendlyEvents(timeMin, timeMax)
    ])

    const events = [...google, ...calendly].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    )

    return { events }
  } catch (error) {
    return { events: [], error: (error as Error).message }
  }
}
