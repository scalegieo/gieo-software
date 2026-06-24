import { formatCurrency, formatCompactCurrency, LEAD_STAGES } from '@/lib/types'
import type { Profile, Client, Lead, Campaign, Task, ClientProfile, ScrapedLead, TeamMemberMetrics } from '@/lib/types'
import { GIEO_USERS } from '@/lib/auth'

interface StoreSnapshot {
  profile: Profile | null
  clients: Client[]
  leads: Lead[]
  campaigns: Campaign[]
  tasks: Task[]
  clientProfiles: Record<string, ClientProfile>
  scrapedLeads: ScrapedLead[]
  teamMetrics: Record<string, TeamMemberMetrics>
  getTotalMRR: () => number
  getTotalAdSpend: () => number
  getActiveClientCount: () => number
}

export function buildFullPlatformContext(state: StoreSnapshot): string {
  const mrr = state.getTotalMRR()
  const adSpend = state.getTotalAdSpend()
  const activeClients = state.getActiveClientCount()

  const clientsDetail = state.clients.map((c) => {
    const p = state.clientProfiles[c.id]
    return `- ${c.company ?? c.name} | MRR ${formatCurrency(c.mrr)} | status: ${c.status}
  Contact: ${p?.primary_contact || c.name || '—'} | ${p?.email || '—'} | ${p?.phone || '—'}
  Services: ${p?.services.join(', ') || 'none'}
  Industry: ${p?.industry || '—'}
  Retainer notes: ${p?.retainer_notes || '—'}
  Internal notes: ${p?.internal_notes || '—'}
  Meetings: ${p?.meeting_notes?.length ?? 0} | Calls: ${p?.call_logs?.length ?? 0}
  ${p?.meeting_notes?.slice(0, 2).map((m) => `  Meeting "${m.title}": ${m.notes}`).join('\n') || ''}`
  }).join('\n')

  const leadsDetail = state.leads.map((l) =>
    `- ${l.name} @ ${l.company} | stage: ${l.stage} | value ${formatCurrency(l.value)}`
  ).join('\n')

  const scrapedDetail = state.scrapedLeads.slice(0, 30).map((l) =>
    `- ${l.name} @ ${l.company} | ${l.phone || l.email || 'no contact'} | source: ${l.source} | status: ${l.status}${l.notes ? ` | notes: ${l.notes}` : ''}`
  ).join('\n')

  const tasksDetail = state.tasks.map((t) => {
    const client = state.clients.find((c) => c.id === t.client_id)
    const assignee = GIEO_USERS.find((u) => u.profile.id === t.assignee_id)?.profile.name ?? 'Unassigned'
    return `- [${t.status}] ${t.title} — ${assignee}${client ? ` (${client.company})` : ''}`
  }).join('\n')

  const campaignsDetail = state.campaigns.map((c) => {
    const client = state.clients.find((cl) => cl.id === c.client_id)
    return `- ${client?.company ?? 'Client'}: spend ${formatCurrency(c.spend)}, ROAS ${c.roas}x, ${c.status}`
  }).join('\n')

  const teamDetail = Object.entries(state.teamMetrics).map(([userId, m]) => {
    const name = GIEO_USERS.find((u) => u.profile.id === userId)?.profile.name ?? userId
    return `- ${name}: ${m.lovable_sites} lovable sites, ${m.ads_created} ads, ${formatCompactCurrency(m.ad_spend_managed)} ad spend managed, ${m.software_shipped} software shipped`
  }).join('\n')

  const pipelineCounts = LEAD_STAGES.map((s) => {
    const count = state.leads.filter((l) => l.stage === s.id).length
    return `${s.label}: ${count}`
  }).join(', ')

  return `You are GIEO AI — the internal brain of GIEO agency CRM. You have LIVE access to all platform data below.
Answer questions directly using this data. Never output safety classifications or moderation labels.
If asked about MRR, leads, clients, or team stats — quote exact numbers from the data.

=== LOGGED-IN USER ===
${state.profile?.name ?? 'Unknown'} (${state.profile?.role ?? 'member'})

=== AGENCY SNAPSHOT ===
Total MRR: ${formatCurrency(mrr)}
Active Clients: ${activeClients}
Total Ad Spend Managed: ${formatCompactCurrency(adSpend)}
Pipeline: ${pipelineCounts}

=== CLIENTS (${state.clients.length}) ===
${clientsDetail || 'No clients'}

=== CRM PIPELINE LEADS (${state.leads.length}) ===
${leadsDetail || 'No pipeline leads'}

=== SCRAPED LEADS / LEAD SHEET (${state.scrapedLeads.length}) ===
${scrapedDetail || 'No scraped leads yet'}

=== TASKS (${state.tasks.length}) ===
${tasksDetail || 'No tasks'}

=== META AD CAMPAIGNS ===
${campaignsDetail || 'No campaigns'}

=== TEAM PERFORMANCE ===
${teamDetail || 'No metrics yet'}

Be concise, specific, and reference real names/numbers. For "what does X want" — check their lead entry, client profile notes, meeting notes, and services.`
}
