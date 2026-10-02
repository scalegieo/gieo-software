import type { BusinessId, Campaign, Client, ClientProfile, Financial, Lead, Task } from '@/lib/types'
import { clientBusiness } from '@/lib/types'

const WORKSPACE_KEY = 'gieo_active_business'

export function loadActiveBusiness(): BusinessId {
  return localStorage.getItem(WORKSPACE_KEY) === 'python' ? 'python' : 'gieo'
}

export function saveActiveBusiness(business: BusinessId): void {
  localStorage.setItem(WORKSPACE_KEY, business)
}

export function clientsFor(business: BusinessId, clients: Client[]): Client[] {
  return clients.filter((c) => clientBusiness(c) === business)
}

export function taskBusiness(task: Task, clients: Client[]): BusinessId {
  if (task.business === 'python' || task.business === 'gieo') return task.business
  const client = task.client_id ? clients.find((c) => c.id === task.client_id) : undefined
  return client ? clientBusiness(client) : 'gieo'
}

export function tasksFor(business: BusinessId, tasks: Task[], clients: Client[]): Task[] {
  return tasks.filter((t) => taskBusiness(t, clients) === business)
}

export function inBusiness(business: BusinessId, row: { business?: BusinessId }): boolean {
  return (row.business === 'python' ? 'python' : 'gieo') === business
}

export function leadsFor(business: BusinessId, leads: Lead[]): Lead[] {
  return leads.filter((l) => inBusiness(business, l))
}

export function byClientIds<T extends { client_id: string }>(rows: T[], clients: Client[]): T[] {
  const ids = new Set(clients.map((c) => c.id))
  return rows.filter((r) => ids.has(r.client_id))
}

export function profilesFor(
  clients: Client[],
  profiles: Record<string, ClientProfile>
): Record<string, ClientProfile> {
  return Object.fromEntries(clients.filter((c) => profiles[c.id]).map((c) => [c.id, profiles[c.id]]))
}

export interface WorkspaceData {
  business: BusinessId
  clients: Client[]
  tasks: Task[]
  leads: Lead[]
  campaigns: Campaign[]
  financials: Financial[]
  clientProfiles: Record<string, ClientProfile>
}

export function workspaceData(
  business: BusinessId,
  all: Omit<WorkspaceData, 'business'>
): WorkspaceData {
  const clients = clientsFor(business, all.clients)
  return {
    business,
    clients,
    tasks: tasksFor(business, all.tasks, all.clients),
    leads: leadsFor(business, all.leads),
    campaigns: byClientIds(all.campaigns, clients),
    financials: byClientIds(all.financials, clients),
    clientProfiles: profilesFor(clients, all.clientProfiles)
  }
}
