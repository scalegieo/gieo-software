import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  Users,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Bell,
  Search,
  Sheet,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { AISidebar } from '@/components/AISidebar'
import { Input } from '@/components/ui/input'
import { GieoLogo } from '@/components/GieoLogo'
import { PageWatermark } from '@/components/PageWatermark'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/crm', icon: Kanban, label: 'CRM Pipeline' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/leads', icon: Sheet, label: 'Lead Sheet' },
  { to: '/team', icon: Trophy, label: 'Team Stats' }
]

export function GieoShell(): JSX.Element {
  const location = useLocation()
  const {
    profile,
    chatOpen,
    aiSidebarOpen,
    isUsingLocalData,
    setChatOpen,
    setAiSidebarOpen,
    signOut
  } = useStore()

  const currentPage = navItems.find((item) => item.to === location.pathname)?.label ?? 'GIEO'

  return (
    <div className="relative flex h-screen overflow-hidden bg-zinc-950">
      <PageWatermark />

      <aside className="relative z-10 flex w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="flex h-16 items-center border-b border-zinc-800 px-4 py-3">
          <GieoLogo className="h-10" />
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
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
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          {isUsingLocalData && (
            <Badge variant="warning" className="mb-2 w-full justify-center">
              Sample Data
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-zinc-400"
            onClick={() => setAiSidebarOpen(!aiSidebarOpen)}
          >
            <Sparkles className="h-4 w-4 text-zinc-200" />
            AI Assistant
          </Button>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-4">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <GieoLogo variant="icon" iconClassName="h-5 w-5 hidden sm:block" />
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-zinc-100">{currentPage}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <Input placeholder="Search clients, leads..." className="h-8 w-56 pl-8 text-xs" />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8"
              onClick={() => setChatOpen(!chatOpen)}
            >
              <MessageSquare className="h-4 w-4" />
              {chatOpen && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-100" />
              )}
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Bell className="h-4 w-4" />
            </Button>

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
            <aside className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
              <TeamChat />
            </aside>
          )}

          {aiSidebarOpen && <AISidebar />}
        </div>
      </div>
    </div>
  )
}
