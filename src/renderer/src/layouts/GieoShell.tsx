import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  Users,
  MessageSquare,
  ChevronRight,
  Search,
  Sheet,
  Trophy,
  PenTool,
  ListTodo,
  CalendarDays
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BUSINESSES, clientBusiness } from '@/lib/types'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { TeamChat } from '@/components/TeamChat'
import { EbonicsPanel } from '@/components/EbonicsPanel'
import { FridayAvatar } from '@/components/FridayAvatar'
import { CreateTaskDialog } from '@/components/CreateTaskDialog'
import { NotificationsPanel } from '@/components/NotificationsPanel'
import { OllamaBootIndicator } from '@/components/OllamaBootIndicator'
import { useTeamNotificationListener } from '@/hooks/useTeamNotificationListener'
import { Input } from '@/components/ui/input'
import { GieoLogo } from '@/components/GieoLogo'
import { PageWatermark } from '@/components/PageWatermark'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tasks', icon: ListTodo, label: 'Tasks' },
  { to: '/crm', icon: Kanban, label: 'CRM Pipeline' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/leads', icon: Sheet, label: 'Lead Sheet' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/whiteboard', icon: PenTool, label: 'Whiteboard' },
  { to: '/team', icon: Trophy, label: 'Team Stats' }
]

export function GieoShell(): JSX.Element {
  const location = useLocation()

  const {
    profile,
    chatOpen,
    aiSidebarOpen,
    connectionError,
    setChatOpen,
    setAiSidebarOpen,
    signOut,
    getPendingTaskCount,
    activeBusiness,
    setActiveBusiness,
    clients
  } = useStore()

  const pendingTasks = getPendingTaskCount()
  const currentPage = navItems.find((item) => item.to === location.pathname)?.label ?? 'GIEO'

  useTeamNotificationListener()

  return (
    <div className="relative flex h-screen overflow-hidden bg-zinc-950">
      <PageWatermark />

      <aside className="relative z-10 flex w-56 shrink-0 flex-col liquid-glass-sidebar">
        <div className="flex h-[7.5rem] w-full shrink-0 flex-col border-b border-zinc-800 px-2 pb-3 pt-9">
          <div className="flex min-h-0 flex-1 w-full items-center overflow-hidden">
            <GieoLogo fill className="origin-left scale-[2.1]" />
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {to === '/tasks' && pendingTasks > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-zinc-950">
                  {pendingTasks > 9 ? '9+' : pendingTasks}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          {connectionError && (
            <Badge variant="warning" className="mb-2 w-full justify-center text-[10px]">
              Offline — can&apos;t reach server
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-full justify-start gap-2.5 text-zinc-200 border-white/15 liquid-glass-inset',
              'hover:border-violet-400/30 hover:bg-violet-500/10',
              aiSidebarOpen && 'border-violet-400/40 bg-violet-500/10'
            )}
            onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
          >
            <FridayAvatar size="sm" />
            FRIDAY
            <span className="ml-auto text-[10px] text-zinc-600">⌥</span>
          </Button>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between liquid-glass-header px-4">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/70 p-0.5">
              {BUSINESSES.map((b) => {
                const count = clients.filter((c) => clientBusiness(c) === b.id).length
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBusiness(b.id)}
                    className={cn(
                      'rounded-md px-3.5 py-1 text-sm font-medium transition-colors',
                      activeBusiness === b.id
                        ? 'bg-zinc-100 text-zinc-950'
                        : 'text-zinc-500 hover:text-zinc-200'
                    )}
                  >
                    {b.label}
                    <span className={cn('ml-1.5 text-[11px] tabular-nums', activeBusiness === b.id ? 'text-zinc-500' : 'text-zinc-600')}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-100">{currentPage}</span>
          </div>

          <div className="flex items-center gap-2">
            <OllamaBootIndicator />
            <CreateTaskDialog />

            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <Input placeholder="Search clients, leads..." className="h-8 w-56 pl-8 text-xs" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              title="FRIDAY chat"
              className={cn(
                'relative h-8 w-8 rounded-lg border border-transparent overflow-hidden',
                'hover:border-violet-400/25 hover:bg-violet-500/10',
                aiSidebarOpen && 'border-violet-400/35 bg-violet-500/10 shadow-[0_0_16px_rgba(139,92,246,0.25)]'
              )}
              onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
            >
              <FridayAvatar size="sm" className="h-5 w-5" />
              {aiSidebarOpen && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              title="Team chat"
              className={cn(
                'relative h-8 w-8 rounded-lg border border-transparent',
                'hover:border-white/10 hover:bg-white/5',
                chatOpen && 'border-white/15 bg-white/5'
              )}
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare className="h-4 w-4" />
              {chatOpen && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet-400" />
              )}
            </Button>

            <NotificationsPanel />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-900 transition-colors">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium border border-zinc-700">
                    {profile?.name?.charAt(0) ?? 'U'}
                  </div>
                  <span className="hidden text-sm text-zinc-300 sm:block">{profile?.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <p className="text-sm">{profile?.name}</p>
                  <p className="text-xs font-normal text-zinc-500 capitalize">{profile?.role}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <main className="relative min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>

          {chatOpen && (
            <aside className="w-80 shrink-0 liquid-glass-panel border-l border-white/10 rounded-none">
              <TeamChat />
            </aside>
          )}

          <EbonicsPanel />
        </div>
      </div>
    </div>
  )
}
