import { useState, useEffect, useCallback } from 'react'
import type { CalendarConnectionStatus, CalendarEvent } from '@/lib/calendarTypes'

export function useCalendar(daysAhead = 14): {
  events: CalendarEvent[]
  status: CalendarConnectionStatus | null
  loading: boolean
  error?: string
  refresh: () => Promise<void>
  connectGoogle: () => Promise<{ success: boolean; error?: string }>
  disconnectGoogle: () => Promise<void>
  connectCalendly: (token: string) => Promise<{ success: boolean; error?: string }>
  disconnectCalendly: () => Promise<void>
} {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState<CalendarConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const refresh = useCallback(async () => {
    if (!window.gieo?.getCalendarStatus) return
    setLoading(true)
    try {
      const st = await window.gieo.getCalendarStatus()
      setStatus(st)
      if (st.google.connected || st.calendly.connected) {
        const res = await window.gieo.fetchCalendarEvents(daysAhead)
        setEvents(res.events ?? [])
        setError(res.error)
      } else {
        setEvents([])
        setError(undefined)
      }
    } finally {
      setLoading(false)
    }
  }, [daysAhead])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), 120_000)
    return () => clearInterval(id)
  }, [refresh])

  const connectGoogle = async () => {
    const res = await window.gieo?.connectGoogleCalendar?.()
    await refresh()
    return { success: res?.success ?? false, error: res?.error }
  }

  const disconnectGoogle = async () => {
    await window.gieo?.disconnectGoogleCalendar?.()
    await refresh()
  }

  const connectCalendly = async (token: string) => {
    const res = await window.gieo?.connectCalendly?.(token)
    await refresh()
    return { success: res?.success ?? false, error: res?.error }
  }

  const disconnectCalendly = async () => {
    await window.gieo?.disconnectCalendly?.()
    await refresh()
  }

  return {
    events,
    status,
    loading,
    error,
    refresh,
    connectGoogle,
    disconnectGoogle,
    connectCalendly,
    disconnectCalendly
  }
}
