import {
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Bell,
  CalendarClock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { formatCompactCurrency, formatCurrency } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { DashboardCalendarWidget } from '@/components/DashboardCalendarWidget'

export function Dashboard(): JSX.Element {
  const {
    tasks,
    leads,
    profile,
    clients,
    campaigns,
    updateTaskStatus,
    getTotalMRR,
    getTotalAdSpend,
    getActiveClientCount,
    getTotalClientCount,
    getAgencyHoursThisMonth,
    getAgencyTotalHours,
    getUpcomingBillingReminders,
    connectionError
  } = useStore()

  const totalMRR = getTotalMRR()
  const totalAdSpend = getTotalAdSpend()
  const activeClients = getActiveClientCount()
  const totalClients = getTotalClientCount()
  const hoursThisMonth = getAgencyHoursThisMonth()
  const totalHours = getAgencyTotalHours()
  const billingReminders = getUpcomingBillingReminders(14)
  const urgentBilling = billingReminders.filter((b) => b.isReminderWindow || b.isOverdue)

  const wonLeads = leads.filter((l) => l.stage === 'won').length
  const pipelineValue = leads
    .filter((l) => !['won', 'lost'].includes(l.stage))
    .reduce((sum, l) => sum + l.value, 0)

  const avgRoas =
    campaigns.length > 0
      ? campaigns.reduce((sum, c) => sum + c.roas, 0) / campaigns.length
      : 0

  const pausedClients = clients.filter((c) => c.status === 'paused').length
  const avgMrrPerClient = activeClients > 0 ? Math.round(totalMRR / activeClients) : 0

  const myTasks = tasks
    .filter((t) => !profile || t.assignee_id === profile.id || t.assignee_id === null)
    .slice(0, 6)

  const metrics = [
    {
      label: 'Total MRR',
      value: formatCompactCurrency(totalMRR),
      sub: `${formatCurrency(totalMRR)}/mo · ${activeClients} active`,
      icon: DollarSign,
      trend: `~${formatCurrency(avgMrrPerClient)}/client`,
      accent: 'text-zinc-200'
    },
    {
      label: 'Total Clients',
      value: String(totalClients),
      sub: `${activeClients} active · ${pausedClients} paused`,
      icon: Users,
      trend: totalClients === 0 ? 'Add clients to start' : `${activeClients} paying`,
      accent: 'text-blue-400'
    },
    {
      label: 'Agency Hours',
      value: `${hoursThisMonth}h`,
      sub: `${totalHours.toFixed(0)}h all-time logged`,
      icon: Clock,
      trend: 'This month',
      accent: 'text-sky-400'
    },
    {
      label: 'Ad Spend Managed',
      value: formatCompactCurrency(totalAdSpend),
      sub: `${campaigns.length} campaigns · ${avgRoas.toFixed(1)}x avg ROAS`,
      icon: TrendingUp,
      trend: `${activeClients} clients`,
      accent: 'text-purple-400'
    }
  ]

  const statusIcon = (status: string) => {
    if (status === 'overdue') return <AlertCircle className="h-3.5 w-3.5 text-red-400" />
    if (status === 'in_progress') return <Circle className="h-3.5 w-3.5 text-zinc-200 fill-zinc-200/20" />
    return <Circle className="h-3.5 w-3.5 text-zinc-600" />
  }

  const statusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
      in_progress: 'success',
      todo: 'secondary',
      overdue: 'destructive',
      done: 'success'
    }
    return (
      <Badge variant={variants[status] ?? 'secondary'} className="capitalize text-[10px]">
        {status.replace('_', ' ')}
      </Badge>
    )
  }

  return (
    <div className="relative z-10 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          {totalClients} clients · {formatCompactCurrency(totalMRR)} MRR · {hoursThisMonth}h logged this month
        </p>
        {connectionError && (
          <p className="text-xs text-amber-400 mt-1">
            Could not sync with server — showing cached data. Check your internet connection.
          </p>
        )}
        {totalClients === 0 && !connectionError && (
          <p className="text-xs text-zinc-500 mt-1">
            No clients yet — add clients under Clients to start tracking real MRR and hours.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, sub, icon: Icon, trend, accent }) => (
          <Card key={label} className="bg-zinc-900/50">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardDescription className="gieo-label">{label}</CardDescription>
                <CardTitle className="gieo-metric mt-1">{value}</CardTitle>
              </div>
              <div className={cn('rounded-md bg-zinc-800 p-2', accent)}>
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">{sub}</p>
                <span className="text-xs font-medium text-zinc-300">{trend}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                Retainer billing — next 14 days
              </CardTitle>
              <CardDescription>
                {urgentBilling.length} need action now · bill 1 week before renewal
              </CardDescription>
            </div>
            <a href="#/clients" className="text-xs text-zinc-400 hover:text-zinc-200">
              All clients →
            </a>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[280px] overflow-y-auto">
            {billingReminders.length === 0 ? (
              <p className="text-sm text-zinc-500 py-6 text-center">No billing due in the next 14 days</p>
            ) : (
              billingReminders.slice(0, 10).map((bill) => (
                <div
                  key={bill.clientId}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2.5',
                    bill.isOverdue
                      ? 'border-red-500/30 bg-red-500/5'
                      : bill.isReminderWindow
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-zinc-800 bg-zinc-950/40'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{bill.company}</p>
                    <p className="text-xs text-zinc-500">
                      {formatCurrency(bill.amountCents)} · {bill.termMonths}-mo retainer · due{' '}
                      {formatDate(bill.dueDate.toISOString())}
                    </p>
                  </div>
                  <Badge
                    variant={bill.isOverdue ? 'destructive' : bill.isReminderWindow ? 'warning' : 'secondary'}
                    className="shrink-0 text-[10px]"
                  >
                    {bill.isOverdue ? 'Overdue' : bill.daysUntil === 0 ? 'Today' : `${bill.daysUntil}d`}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base">Pipeline Snapshot</CardTitle>
            <CardDescription>
              {formatCompactCurrency(pipelineValue)} in pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(['new', 'contacted', 'meeting', 'won', 'lost'] as const).map((stage) => {
              const count = leads.filter((l) => l.stage === stage).length
              const total = leads.length || 1
              const pct = Math.round((count / total) * 100)
              const colors: Record<string, string> = {
                new: 'bg-blue-500',
                contacted: 'bg-amber-500',
                meeting: 'bg-purple-500',
                won: 'bg-zinc-400',
                lost: 'bg-red-500'
              }
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-zinc-400">{stage}</span>
                    <span className="text-zinc-300">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', colors[stage])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">My Tasks</CardTitle>
              <CardDescription>Quick view — see all on Tasks page</CardDescription>
            </div>
            <a href="#/tasks" className="text-xs text-zinc-400 hover:text-zinc-200">
              View all →
            </a>
          </CardHeader>
          <CardContent className="space-y-1">
            {myTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-md px-2 py-2.5 hover:bg-zinc-800/50 transition-colors"
              >
                {statusIcon(task.status)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{task.title}</p>
                  <p className="text-xs text-zinc-500">
                    Due {formatDate(task.due_date)}
                    {task.priority && task.priority !== 'medium' && (
                      <span className="ml-2 capitalize text-zinc-600">· {task.priority}</span>
                    )}
                  </p>
                </div>
                {statusBadge(task.status)}
                {task.status !== 'done' && (
                  <button
                    onClick={() => void updateTaskStatus(task.id, 'done')}
                    className="text-[10px] text-zinc-500 hover:text-zinc-200 ml-2"
                  >
                    Done
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <DashboardCalendarWidget />
          <Card className="bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Agency at a glance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total clients', value: String(totalClients) },
                { label: 'Active MRR', value: formatCompactCurrency(totalMRR) },
                { label: 'Hours (month)', value: `${hoursThisMonth}h` },
                { label: 'Avg ROAS', value: `${avgRoas.toFixed(1)}x` },
                { label: 'Win rate', value: `${Math.round((wonLeads / (leads.length || 1)) * 100)}%` },
                { label: 'Open tasks', value: String(tasks.filter((t) => t.status !== 'done').length) },
                { label: 'Bill due (14d)', value: String(billingReminders.length) },
                { label: 'Overdue tasks', value: String(tasks.filter((t) => t.status === 'overdue').length) }
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-3 rounded-md bg-zinc-950 border border-zinc-800">
                  <p className="gieo-label">{label}</p>
                  <p className="text-lg font-semibold mt-1 tabular-nums">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </div>
      </div>

      <Card className="bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-zinc-200" />
            Client roster summary
          </CardTitle>
          <CardDescription>
            {activeClients} active accounts generating {formatCurrency(totalMRR)}/month across Meta, Google & creative services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Active clients', value: activeClients },
              { label: 'Paused', value: pausedClients },
              { label: 'Total hours logged', value: `${totalHours.toFixed(0)}h` },
              { label: 'Pipeline value', value: formatCompactCurrency(pipelineValue) }
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                <p className="gieo-label">{label}</p>
                <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
