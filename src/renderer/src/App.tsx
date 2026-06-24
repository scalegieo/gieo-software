import { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GieoShell } from '@/layouts/GieoShell'
import { Dashboard } from '@/pages/Dashboard'
import { CRM } from '@/pages/CRM'
import { Clients } from '@/pages/Clients'
import { CompletionCelebration } from '@/components/CompletionCelebration'
import { TeamPerformance } from '@/pages/TeamPerformance'
import { LeadSheet } from '@/pages/LeadSheet'
import { Login } from '@/pages/Login'
import { useStore } from '@/store/useStore'
import { Loader2 } from 'lucide-react'
import { GieoLogo } from '@/components/GieoLogo'

function AppRoutes(): JSX.Element {
  const { initialize, isAuthenticated, isLoading } = useStore()

  useEffect(() => {
    void initialize()
    if (window.gieo?.bootstrapOllama) {
      void window.gieo.bootstrapOllama()
    }
  }, [initialize])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
            <GieoLogo variant="icon" iconClassName="h-6 w-6" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <HashRouter>
      <Routes>
        <Route element={<GieoShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crm" element={<CRM />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/leads" element={<LeadSheet />} />
          <Route path="/team" element={<TeamPerformance />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <CompletionCelebration />
    </HashRouter>
  )
}

export default AppRoutes
