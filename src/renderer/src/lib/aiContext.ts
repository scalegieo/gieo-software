import { formatCurrency, formatCompactCurrency, LEAD_STAGES } from '@/lib/types'
import type {
  Profile,
  Client,
  Lead,
  Campaign,
  Task,
  ClientProfile,
  ScrapedLead,
  TeamMemberMetrics,
  Financial,
  WhiteboardItem
} from '@/lib/types'
import { GIEO_USERS } from '@/lib/auth'
import {
  getTotalHours,
  getHoursThisMonth,
  getUpcomingBillings,
  type BillingReminder
} from '@/lib/retainerBilling'
import { fridayVoiceRules, getFirstName } from '@/lib/fridayVoice'

interface StoreSnapshot {
  profile: Profile | null
  clients: Client[]
  leads: Lead[]
  campaigns: Campaign[]
  tasks: Task[]
  clientProfiles: Record<string, ClientProfile>
  scrapedLeads: ScrapedLead[]
  teamMetrics: Record<string, TeamMemberMetrics>
  financials?: Financial[]
  whiteboardItems?: WhiteboardItem[]
  getTotalMRR: () => number
  getTotalAdSpend: () => number
  getActiveClientCount: () => number
  getTotalClientCount?: () => number
  getAgencyHoursThisMonth?: () => number
  getAgencyTotalHours?: () => number
  getUpcomingBillingReminders?: (withinDays?: number) => BillingReminder[]
}

function clientLine(c: Client, p: ClientProfile | undefined): string {
  const hrs = p ? getTotalHours(p) : 0
  const monthHrs = p ? getHoursThisMonth(p) : 0
  return `[id:${c.id}] ${c.company ?? c.name} | MRR ${formatCurrency(c.mrr)} | ${c.status} | hrs ${monthHrs}mo/${hrs}tot | contact: ${p?.primary_contact || '—'} ${p?.email || ''} | notes: ${(p?.internal_notes || p?.retainer_notes || '—').slice(0, 80)}`
}

export function buildFullPlatformContext(state: StoreSnapshot, currentPage = 'Dashboard'): string {
  const mrr = state.getTotalMRR()
  const adSpend = state.getTotalAdSpend()
  const activeClients = state.getActiveClientCount()
  const totalClients = state.getTotalClientCount?.() ?? state.clients.length
  const agencyHrsMonth = state.getAgencyHoursThisMonth?.() ?? 0
  const agencyHrsTotal = state.getAgencyTotalHours?.() ?? 0
  const billingDue = state.getUpcomingBillingReminders?.(14) ?? []

  const clientsDetail = state.clients.map((c) => {
    const p = state.clientProfiles[c.id]
    const billings = p ? getUpcomingBillings([c], { [c.id]: p }, 30) : []
    return `${clientLine(c, p)}
  Services: ${p?.services.join(', ') || 'none'} | Industry: ${p?.industry || '—'}
  Meetings: ${p?.meeting_notes?.length ?? 0} | Calls: ${p?.call_logs?.length ?? 0}
  ${billings[0] ? `Next bill: ${billings[0].message}` : ''}
  ${p?.meeting_notes?.slice(0, 2).map((m) => `  Meeting "${m.title}": ${m.notes.slice(0, 120)}`).join('\n') || ''}`
  }).join('\n')

  const leadsDetail = state.leads.map((l) =>
    `[id:${l.id}] ${l.name} @ ${l.company} | stage: ${l.stage} | ${formatCurrency(l.value)}`
  ).join('\n')

  const scrapedDetail = state.scrapedLeads.slice(0, 40).map((l) =>
    `[id:${l.id}] ${l.name} @ ${l.company} | ${l.phone || l.email || '—'} | ${l.source} | ${l.status}${l.notes ? ` | ${l.notes.slice(0, 60)}` : ''}`
  ).join('\n')

  const tasksDetail = state.tasks.map((t) => {
    const client = state.clients.find((c) => c.id === t.client_id)
    const assignee = GIEO_USERS.find((u) => u.profile.id === t.assignee_id)?.profile.name ?? 'Unassigned'
    return `[id:${t.id}] [${t.status}] ${t.title} — ${assignee}${client ? ` (${client.company})` : ''}${t.due_date ? ` due ${t.due_date}` : ''}`
  }).join('\n')

  const campaignsDetail = state.campaigns.map((c) => {
    const client = state.clients.find((cl) => cl.id === c.client_id)
    return `- ${client?.company ?? 'Client'}: spend ${formatCurrency(c.spend)}, ROAS ${c.roas}x, ${c.status}`
  }).join('\n')

  const teamDetail = Object.entries(state.teamMetrics).map(([userId, m]) => {
    const name = GIEO_USERS.find((u) => u.profile.id === userId)?.profile.name ?? userId
    return `- ${name}: ${m.lovable_sites} sites, ${m.ads_created} ads, ${formatCompactCurrency(m.ad_spend_managed)} spend, ${m.software_shipped} shipped`
  }).join('\n')

  const pipelineCounts = LEAD_STAGES.map((s) => {
    const count = state.leads.filter((l) => l.stage === s.id).length
    return `${s.label}: ${count}`
  }).join(', ')

  const billingDetail = billingDue.slice(0, 10).map((b) => `- ${b.company}: ${b.message}`).join('\n')

  const firstName = getFirstName(state.profile)
  const role = state.profile?.role ?? 'member'

  const whiteboardDetail = (state.whiteboardItems ?? [])
    .slice(0, 15)
    .map((w) => `[id:${w.id}] ${(w.content || 'empty note').slice(0, 80)}`)
    .join('\n')

  const financialDetail = (state.financials ?? [])
    .slice(0, 15)
    .map((f) => {
      const client = state.clients.find((c) => c.id === f.client_id)
      return `- ${client?.company ?? f.client_id}: ${formatCurrency(f.amount)} ${f.status}`
    })
    .join('\n')

  return `${fridayVoiceRules(firstName)}

You are FRIDAY — built into GIEO CRM on ${firstName}'s machine. LIVE data below is real and current.
Current screen: ${currentPage}
Answer from GIEO data only. Quote exact numbers from SNAPSHOT.

=== LOGGED IN ===
${firstName} (${role}) — address them as ${firstName} when natural.

=== SNAPSHOT ===
MRR: ${formatCurrency(mrr)} | Active clients: ${activeClients}/${totalClients}
Ad spend managed: ${formatCompactCurrency(adSpend)} | Agency hours: ${agencyHrsMonth}h this month, ${agencyHrsTotal}h total
Pipeline: ${pipelineCounts} | Tasks open: ${state.tasks.filter((t) => t.status !== 'done').length}

=== CLIENTS (${state.clients.length}) ===
${clientsDetail || 'None'}

=== CRM PIPELINE (${state.leads.length}) ===
${leadsDetail || 'None'}

=== LEAD SHEET (${state.scrapedLeads.length}) ===
${scrapedDetail || 'None'}

=== TASKS (${state.tasks.length}) ===
${tasksDetail || 'None'}

=== BILLING DUE (14d) ===
${billingDetail || 'None upcoming'}

=== CAMPAIGNS ===
${campaignsDetail || 'None'}

=== TEAM ===
${teamDetail || 'None'}

=== WHITEBOARD ===
${whiteboardDetail || 'Empty'}

=== INVOICES ===
${financialDetail || 'None'}

Team members: ${GIEO_USERS.map((u) => u.profile.name).join(', ')}
Pipeline stages: ${LEAD_STAGES.map((s) => s.id).join(', ')}`
}

/** Compact context for /agent action parsing */
export function buildAgentPlatformContext(state: StoreSnapshot, currentPage: string): string {
  return buildFullPlatformContext(state, currentPage)
}

export function storeSnapshotFromEngine(store: {
  profile: Profile | null
  clients: Client[]
  leads: Lead[]
  campaigns: Campaign[]
  tasks: Task[]
  clientProfiles: Record<string, ClientProfile>
  scrapedLeads: ScrapedLead[]
  teamMetrics: Record<string, TeamMemberMetrics>
  financials?: Financial[]
  whiteboardItems?: WhiteboardItem[]
  getTotalMRR: () => number
  getTotalAdSpend: () => number
  getActiveClientCount: () => number
  getTotalClientCount: () => number
  getAgencyHoursThisMonth: () => number
  getAgencyTotalHours: () => number
  getUpcomingBillingReminders: (withinDays?: number) => import('@/lib/retainerBilling').BillingReminder[]
}): StoreSnapshot {
  return {
    profile: store.profile,
    clients: store.clients,
    leads: store.leads,
    campaigns: store.campaigns,
    tasks: store.tasks,
    clientProfiles: store.clientProfiles,
    scrapedLeads: store.scrapedLeads,
    teamMetrics: store.teamMetrics,
    financials: store.financials,
    whiteboardItems: store.whiteboardItems,
    getTotalMRR: store.getTotalMRR,
    getTotalAdSpend: store.getTotalAdSpend,
    getActiveClientCount: store.getActiveClientCount,
    getTotalClientCount: store.getTotalClientCount,
    getAgencyHoursThisMonth: store.getAgencyHoursThisMonth,
    getAgencyTotalHours: store.getAgencyTotalHours,
    getUpcomingBillingReminders: store.getUpcomingBillingReminders
  }
}
