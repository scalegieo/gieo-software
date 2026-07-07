import { useMemo, useState, useEffect, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  Circle,
  AlertCircle,
  MessageSquare,
  ListTodo,
  CheckCheck,
  BellRing,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn, formatDate, formatRelativeTime } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { getProfileById } from '@/lib/auth'
import {
  getNotificationsLastRead,
  markNotificationsRead,
  isAfterLastRead
} from '@/lib/notificationInbox'
import {
  getSystemNotificationPermission,
  requestSystemNotificationPermission,
  openSystemNotificationSettings,
  sendTestNotification,
  areSystemNotificationsEnabled,
  setSystemNotificationsEnabled,
  type NotificationPermission
} from '@/lib/notifications'
import type { Task, Message } from '@/lib/types'

function taskIcon(status: string): JSX.Element {
  if (status === 'overdue') return <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
  if (status === 'in_progress') return <Circle className="h-3.5 w-3.5 text-violet-300 shrink-0" />
  return <Circle className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
}

export function NotificationsPanel(): JSX.Element {
  const navigate = useNavigate()
  const { profile, tasks, messages, clients, setActiveTask, updateTaskStatus } = useStore()
  const [open, setOpen] = useState(false)
  const [lastRead, setLastRead] = useState(getNotificationsLastRead)
  const [macPermission, setMacPermission] = useState<NotificationPermission>('not-determined')
  const [notifBusy, setNotifBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    void getSystemNotificationPermission().then(setMacPermission)
  }, [open])

  const macNotificationsOn = macPermission === 'granted' && areSystemNotificationsEnabled()

  const myOpenTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.assignee_id === profile?.id && t.status !== 'done')
        .sort((a, b) => {
          if (a.status === 'overdue' && b.status !== 'overdue') return -1
          if (b.status === 'overdue' && a.status !== 'overdue') return 1
          return new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime()
        }),
    [tasks, profile?.id]
  )

  const recentSystemMessages = useMemo(
    () =>
      [...messages]
        .filter((m) => m.message_type === 'system')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8),
    [messages]
  )

  const badgeCount = myOpenTasks.length

  const handleOpenChange = (next: boolean): void => {
    setOpen(next)
    if (next) {
      markNotificationsRead()
      setLastRead(new Date().toISOString())
    }
  }

  const markAllRead = (): void => {
    markNotificationsRead()
    setLastRead(new Date().toISOString())
  }

  const goToTask = (task: Task): void => {
    setActiveTask(task.id)
    setOpen(false)
    navigate('/tasks')
  }

  const markTaskDone = (e: MouseEvent, taskId: string): void => {
    e.stopPropagation()
    void updateTaskStatus(taskId, 'done')
  }

  const enableMacNotifications = async (): Promise<void> => {
    setNotifBusy(true)
    try {
      const permission = await requestSystemNotificationPermission()
      setMacPermission(permission)
      if (permission === 'granted') {
        await sendTestNotification()
      }
    } finally {
      setNotifBusy(false)
    }
  }

  const openMacSettings = async (): Promise<void> => {
    await openSystemNotificationSettings()
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-8 w-8 rounded-lg border border-transparent',
            'hover:border-white/10 hover:bg-white/5',
            open && 'border-white/15 bg-white/5'
          )}
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {badgeCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-zinc-950 shadow-sm">
              {badgeCount > 9 ? '9+' : badgeCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="liquid-glass-popover w-80 p-0 border-white/10 shadow-2xl shadow-black/50"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <DropdownMenuLabel className="p-0 text-sm font-semibold text-zinc-100">
            Notifications
          </DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200"
            onClick={markAllRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark read
          </Button>
        </div>

        <section className="border-b border-white/10 px-3 py-3">
          <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <BellRing className={cn('h-4 w-4 shrink-0 mt-0.5', macNotificationsOn ? 'text-emerald-400' : 'text-amber-400')} />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <p className="text-xs font-medium text-zinc-100">Mac system notifications</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                  {macPermission === 'unsupported'
                    ? 'Not available on this platform.'
                    : macNotificationsOn
                      ? 'Alerts appear in Notification Center for tasks and team chat.'
                      : macPermission === 'denied'
                        ? 'Blocked in System Settings — turn on for GIEO CRM.'
                        : 'Allow macOS to show GIEO alerts when you get tasks or messages.'}
                </p>
              </div>
              {macPermission !== 'unsupported' && (
                <div className="flex flex-wrap gap-1.5">
                  {macPermission !== 'granted' && (
                    <Button
                      size="sm"
                      className="h-7 text-[11px]"
                      disabled={notifBusy}
                      onClick={() => void enableMacNotifications()}
                    >
                      {notifBusy ? 'Requesting…' : 'Allow notifications'}
                    </Button>
                  )}
                  {macPermission === 'granted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      disabled={notifBusy}
                      onClick={() => void sendTestNotification()}
                    >
                      Test alert
                    </Button>
                  )}
                  {(macPermission === 'denied' || macPermission === 'granted') && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => void openMacSettings()}
                    >
                      <Settings2 className="h-3 w-3" />
                      System Settings
                    </Button>
                  )}
                  {macPermission === 'granted' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => {
                        setSystemNotificationsEnabled(!areSystemNotificationsEnabled())
                        void getSystemNotificationPermission().then(setMacPermission)
                      }}
                    >
                      {areSystemNotificationsEnabled() ? 'Mute in GIEO' : 'Unmute in GIEO'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="max-h-[min(420px,70vh)] overflow-y-auto">
          <section className="px-3 py-2">
            <p className="px-1 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              My tasks ({myOpenTasks.length})
            </p>
            {myOpenTasks.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-zinc-500">No open tasks assigned to you</p>
            ) : (
              <ul className="space-y-1">
                {myOpenTasks.slice(0, 6).map((task) => {
                  const client = clients.find((c) => c.id === task.client_id)
                  const highlight = task.status === 'overdue'
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => goToTask(task)}
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
                          'hover:bg-white/5',
                          highlight && 'bg-red-500/5 ring-1 ring-red-500/20'
                        )}
                      >
                        {taskIcon(task.status)}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-zinc-100 line-clamp-2">{task.title}</p>
                          <p className="mt-0.5 text-[10px] text-zinc-500">
                            {client?.company ?? 'No client'}
                            {task.due_date && ` · Due ${formatDate(task.due_date)}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          title="Mark done"
                          className="shrink-0 rounded p-1 text-zinc-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                          onClick={(e) => markTaskDone(e, task.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {myOpenTasks.length > 6 && (
              <button
                type="button"
                className="mt-1 w-full rounded-lg py-2 text-center text-[11px] text-violet-400 hover:bg-white/5"
                onClick={() => {
                  setOpen(false)
                  navigate('/tasks')
                }}
              >
                View all {myOpenTasks.length} tasks
              </button>
            )}
          </section>

          <DropdownMenuSeparator className="bg-white/10" />

          <section className="px-3 py-2">
            <p className="px-1 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              Team activity
            </p>
            {recentSystemMessages.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-zinc-500">No recent team updates</p>
            ) : (
              <ul className="space-y-1">
                {recentSystemMessages.map((msg) => (
                  <ActivityRow key={msg.id} message={msg} lastRead={lastRead} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex gap-2 border-t border-white/10 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => {
              setOpen(false)
              navigate('/tasks')
            }}
          >
            <ListTodo className="h-3.5 w-3.5" />
            Tasks
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            onClick={() => {
              setOpen(false)
              useStore.getState().setChatOpen(true)
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Team chat
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ActivityRow({ message, lastRead }: { message: Message; lastRead: string }): JSX.Element {
  const unread = isAfterLastRead(message.created_at, lastRead)
  const author = message.profile?.name ?? getProfileById(message.user_id)?.name ?? 'Team'

  return (
    <li
      className={cn(
        'rounded-lg px-2.5 py-2',
        unread && 'bg-white/[0.03] ring-1 ring-white/5'
      )}
    >
      <p className="text-[11px] leading-relaxed text-zinc-300 line-clamp-3">{message.content}</p>
      <p className="mt-1 text-[10px] text-zinc-500">
        {author} · {formatRelativeTime(message.created_at)}
      </p>
    </li>
  )
}
