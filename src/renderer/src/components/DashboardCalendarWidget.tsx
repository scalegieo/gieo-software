import { Link } from 'react-router-dom'
import { CalendarDays, Loader2, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCalendar } from '@/hooks/useCalendar'
import { formatEventTime, isToday } from '@/lib/calendarTypes'
import { cn } from '@/lib/utils'

export function DashboardCalendarWidget(): JSX.Element {
  const { events, status, loading, refresh } = useCalendar(7)
  const connected = status?.google.connected || status?.calendly.connected
  const upcoming = events.filter((e) => new Date(e.end) >= new Date()).slice(0, 5)

  return (
    <Card className="liquid-glass-panel border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-sky-400" />
          Upcoming
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void refresh()}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link to="/calendar">Calendar</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {!connected && (
          <p className="text-xs text-zinc-500 py-2">
            Connect Google Calendar or Calendly on the{' '}
            <Link to="/calendar" className="text-sky-400 hover:underline">
              Calendar
            </Link>{' '}
            page.
          </p>
        )}
        {connected && loading && upcoming.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading events…
          </div>
        )}
        {connected && !loading && upcoming.length === 0 && (
          <p className="text-xs text-zinc-500 py-2">No events in the next 7 days.</p>
        )}
        {upcoming.map((ev) => (
          <div
            key={ev.id}
            className="flex items-start gap-2 rounded-lg liquid-glass-inset px-2.5 py-2 text-xs"
          >
            <Badge
              variant="secondary"
              className={cn(
                'shrink-0 text-[9px] uppercase',
                ev.source === 'google' ? 'text-sky-300' : 'text-violet-300'
              )}
            >
              {ev.source === 'google' ? 'Google' : 'Calendly'}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-100 truncate">{ev.title}</p>
              <p className="text-zinc-500 truncate">
                {isToday(ev.start) ? 'Today' : ''} {formatEventTime(ev.start, ev.end)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
