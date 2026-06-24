import {
  DollarSign,
  Users,
  TrendingUp,
  CheckCircle2,
  Circle,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { formatCompactCurrency, formatCurrency } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function Dashboard(): JSX.Element {
  const { tasks, leads, profile, updateTaskStatus, getTotalMRR, getTotalAdSpend, getActiveClientCount } = useStore()

  const totalMRR = getTotalMRR()
  const totalAdSpend = getTotalAdSpend()
  const activeClients = getActiveClientCount()
  const wonLeads = leads.filter((l) => l.stage === 'won').length
  const pipelineValue = leads
    .filter((l) => !['won', 'lost'].includes(l.stage))
    .reduce((sum, l) => sum + l.value, 0)

  const myTasks = tasks
    .filter((t) => !profile || t.assignee_id === profile.id || t.assignee_id === null)
    .slice(0, 6)

  const metrics = [
    {
      label: 'Total MRR',
      value: formatCompactCurrency(totalMRR),
      sub: formatCurrency(totalMRR),
      icon: DollarSign,
      trend: '+12.4%',
      accent: 'text-zinc-200'
    },
    {
      label: 'Active Clients',
      value: String(activeClients),
      sub: `${wonLeads} won this quarter`,
      icon: Users,
      trend: '+2',
      accent: 'text-blue-400'
    },
    {
      label: 'Ad Spend Managed',
      value: formatCompactCurrency(totalAdSpend),
      sub: 'Across all campaigns',
      icon: TrendingUp,
      trend: '+8.1%',
      accent: 'text-purple-400'
    },
    {
      label: 'Pipeline Value',
      value: formatCompactCurrency(pipelineValue),
      sub: `${leads.filter((l) => !['won', 'lost'].includes(l.stage)).length} active leads`,
      icon: ArrowUpRight,
      trend: 'Live',
      accent: 'text-amber-400'
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
        <p className="text-sm text-zinc-400 mt-0.5">Agency performance at a glance</p>
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
          <CardHeader>
            <CardTitle className="text-base">My Tasks</CardTitle>
            <CardDescription>Your assigned work across all clients</CardDescription>
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
                  <p className="text-xs text-zinc-500">Due {formatDate(task.due_date)}</p>
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

        <Card className="lg:col-span-2 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base">Pipeline Snapshot</CardTitle>
            <CardDescription>Lead distribution by stage</CardDescription>
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

      <Card className="bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-zinc-200" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Avg ROAS', value: '3.0x' },
              { label: 'Win Rate', value: `${Math.round((wonLeads / (leads.length || 1)) * 100)}%` },
              { label: 'Open Tasks', value: String(tasks.filter((t) => t.status !== 'done').length) },
              { label: 'Overdue', value: String(tasks.filter((t) => t.status === 'overdue').length) }
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-md bg-zinc-950 border border-zinc-800">
                <p className="gieo-label">{label}</p>
                <p className="text-lg font-semibold mt-1">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
