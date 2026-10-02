import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { workspaceData, type WorkspaceData } from '@/lib/workspace'

/** Clients, tasks, leads, and billing scoped to the active GIEO / Python workspace. */
export function useWorkspace(): WorkspaceData {
  const business = useStore((s) => s.activeBusiness)
  const clients = useStore((s) => s.clients)
  const tasks = useStore((s) => s.tasks)
  const leads = useStore((s) => s.leads)
  const campaigns = useStore((s) => s.campaigns)
  const financials = useStore((s) => s.financials)
  const clientProfiles = useStore((s) => s.clientProfiles)

  return useMemo(
    () => workspaceData(business, { clients, tasks, leads, campaigns, financials, clientProfiles }),
    [business, clients, tasks, leads, campaigns, financials, clientProfiles]
  )
}
