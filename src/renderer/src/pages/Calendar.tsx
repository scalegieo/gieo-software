import { ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CalendarConnectPanel } from '@/components/CalendarConnectPanel'
import { useCalendar } from '@/hooks/useCalendar'
import { formatEventTime, isToday } from '@/lib/calendarTypes'
import { cn } from '@/lib/utils'

export function CalendarPage(): JSX.Element {
  const {
    events,
    status,
    loading,
    error,
    refresh,
    connectGoogle,
    disconnectGoogle,
    connectCalendly,
    disconnectCalendly
  } = useCalendar(21)

  const connected = status?.google.connected || status?.calendly.connected
  const upcoming = events.filter((e) => new Date(e.end) >= new Date())

  const grouped = upcoming.reduce<Record<string, typeof upcoming>>((acc, ev) => {
    const key = new Date(ev.start).toDateString()
    acc[key] = acc[key] ?? []
    acc[key].push(ev)
    return acc
  }, {})

  return (
    <div className="relative z-10 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Google Calendar + Calendly — synced into GIEO
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => void refresh()}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <CalendarConnectPanel
        status={status}
        onConnectGoogle={connectGoogle}
        onDisconnectGoogle={disconnectGoogle}
        onConnectCalendly={connectCalendly}
        onDisconnectCalendly={disconnectCalendly}
      />

      {error && <p className="text-xs text-amber-400">{error}</p>}

      <div className="liquid-glass-panel rounded-xl border border-white/10 p-4 space-y-4">
        <h2 className="text-sm font-medium text-zinc-200">Next 3 weeks</h2>

        {!connected && (
          <p className="text-sm text-zinc-500 py-8 text-center">
            Connect a calendar above to see your meetings here.
          </p>
        )}

        {connected && loading && upcoming.length === 0 && (
          <div className="flex justify-center py-12 text-zinc-500 gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading events…
          </div>
        )}

        {connected && !loading && upcoming.length === 0 && (
          <p className="text-sm text-zinc-500 py-8 text-center">No upcoming events.</p>
        )}

        {Object.entries(grouped).map(([day, dayEvents]) => (
          <div key={day}>
            <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 mb-2">
              {isToday(dayEvents[0].start)
                ? 'Today'
                : new Date(dayEvents[0].start).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
            </p>
            <div className="space-y-2">
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 rounded-lg liquid-glass-inset px-3 py-2.5"
                >
                  <Badge
                    variant="secondary"
                    className={cn(
                      'shrink-0 text-[9px] mt-0.5',
                      ev.source === 'google' ? 'text-sky-300' : 'text-violet-300'
                    )}
                  >
                    {ev.source === 'google' ? 'Google' : 'Calendly'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{ev.title}</p>
                    <p className="text-xs text-zinc-500">{formatEventTime(ev.start, ev.end)}</p>
                    {ev.location && (
                      <p className="text-xs text-zinc-600 truncate mt-0.5">{ev.location}</p>
                    )}
                  </div>
                  {ev.htmlLink && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => window.open(ev.htmlLink, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
