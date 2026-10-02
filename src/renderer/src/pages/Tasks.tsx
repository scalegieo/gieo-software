import { useEffect, useRef } from 'react'
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  ListTodo
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { useWorkspace } from '@/hooks/useWorkspace'
import { getProfileById } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CreateTaskDialog } from '@/components/CreateTaskDialog'

const STATUSES = ['todo', 'in_progress', 'done', 'overdue'] as const

export function Tasks(): JSX.Element {
  const { tasks, clients } = useWorkspace()
  const { profile, updateTaskStatus, activeTaskId, setActiveTask } = useStore()
  const highlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeTaskId) return
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setActiveTask(null), 4000)
    return () => clearTimeout(t)
  }, [activeTaskId, setActiveTask])

  const myTasks = tasks.filter((t) => t.assignee_id === profile?.id)
  const openTasks = tasks.filter((t) => t.status !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  const statusIcon = (status: string) => {
    if (status === 'overdue') return <AlertCircle className="h-4 w-4 text-red-400" />
    if (status === 'in_progress') return <Circle className="h-4 w-4 text-zinc-200 fill-zinc-200/20" />
    if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    return <Circle className="h-4 w-4 text-zinc-600" />
  }

  const priorityBadge = (priority?: string) => {
    if (!priority || priority === 'medium') return null
    const colors: Record<string, string> = {
      high: 'destructive',
      low: 'secondary'
    }
    return (
      <Badge variant={colors[priority] as 'destructive' | 'secondary'} className="text-[10px] capitalize">
        {priority}
      </Badge>
    )
  }

  const TaskRow = ({ task }: { task: (typeof tasks)[0] }): JSX.Element => {
    const assignee = task.assignee_id ? getProfileById(task.assignee_id)?.name : 'Unassigned'
    const client = clients.find((c) => c.id === task.client_id)
    const highlighted = activeTaskId === task.id

    return (
      <div
        ref={highlighted ? highlightRef : undefined}
        className={cn(
          'flex items-start gap-3 rounded-lg border px-3 py-3 transition-colors',
          highlighted
            ? 'liquid-glass-subtle border-violet-400/40 ring-2 ring-violet-500/30'
            : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/40'
        )}
      >
        <div className="mt-0.5">{statusIcon(task.status)}</div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn('text-sm font-medium', task.status === 'done' && 'line-through text-zinc-500')}>
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span>{assignee}</span>
            {client && (
              <>
                <span>·</span>
                <span>{client.company ?? client.name}</span>
              </>
            )}
            {task.due_date && (
              <>
                <span>·</span>
                <span>Due {formatDate(task.due_date)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {priorityBadge(task.priority)}
          <Badge variant="secondary" className="text-[10px] capitalize">
            {task.status.replace('_', ' ')}
          </Badge>
          {task.status !== 'done' && (
            <div className="flex gap-1">
              {task.status === 'todo' && (
                <button
                  type="button"
                  onClick={() => void updateTaskStatus(task.id, 'in_progress')}
                  className="text-[10px] text-zinc-500 hover:text-zinc-200"
                >
                  Start
                </button>
              )}
              <button
                type="button"
                onClick={() => void updateTaskStatus(task.id, 'done')}
                className="text-[10px] text-zinc-500 hover:text-emerald-400"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative z-10 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Tasks
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {openTasks.length} open · {doneTasks.length} done · team-wide
          </p>
        </div>
        <CreateTaskDialog />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base">My Tasks</CardTitle>
            <CardDescription>
              Assigned to {profile?.name ?? 'you'} · {myTasks.filter((t) => t.status !== 'done').length} open
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {myTasks.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No tasks assigned to you</p>
            ) : (
              myTasks.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base">All Team Tasks</CardTitle>
            <CardDescription>Reda · Yoni · Yeab · Natu · Lydia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
            {tasks.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">No tasks yet — create one above</p>
            ) : (
              tasks.map((task) => <TaskRow key={task.id} task={task} />)
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-base">By Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATUSES.map((status) => {
              const count = tasks.filter((t) => t.status === status).length
              return (
                <div key={status} className="rounded-lg border border-zinc-800 px-3 py-2 text-center">
                  <p className="text-2xl font-semibold tabular-nums">{count}</p>
                  <p className="text-xs text-zinc-500 capitalize">{status.replace('_', ' ')}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
