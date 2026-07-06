export type CalendarEventSource = 'google' | 'calendly'

export interface CalendarEvent {
  id: string
  source: CalendarEventSource
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

export function formatEventTime(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const sameDay = s.toDateString() === e.toDateString()
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

  if (start.includes('T') === false) {
    return dateFmt.format(s) + ' · All day'
  }

  if (sameDay) {
    return `${dateFmt.format(s)} · ${timeFmt.format(s)} – ${timeFmt.format(e)}`
  }
  return `${dateFmt.format(s)} ${timeFmt.format(s)} → ${dateFmt.format(e)} ${timeFmt.format(e)}`
}

export function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString()
}
