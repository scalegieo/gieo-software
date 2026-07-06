import type { Client, Campaign, Financial, ClientProfile, TimeEntry, RetainerSchedule } from './types'
import { createEmptyClientProfile, SERVICE_OPTIONS } from './types'

const INDUSTRIES = [
  'SaaS', 'E-commerce', 'FinTech', 'Healthcare', 'Fitness', 'Beauty / DTC',
  'Real Estate', 'Legal', 'Restaurant', 'B2B Services', 'EdTech', 'Automotive'
]

const FIRST = ['James', 'Maria', 'Tom', 'Anita', 'Chris', 'Sarah', 'Mike', 'Lisa', 'David', 'Emma', 'Ryan', 'Nina', 'Alex', 'Jordan', 'Taylor']
const LAST = ['Chen', 'Okonkwo', 'Richards', 'Park', 'Martinez', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas']

const COMPANY_PREFIX = [
  'Nova', 'Peak', 'Bright', 'Swift', 'Core', 'Prime', 'Alpha', 'Vertex', 'Pulse', 'Apex',
  'Clear', 'Bold', 'True', 'Next', 'Elite', 'Fusion', 'Spark', 'Rise', 'Flow', 'Scale'
]
const COMPANY_SUFFIX = [
  'Labs', 'Digital', 'Media', 'Co', 'Group', 'Studio', 'Works', 'HQ', 'Partners', 'Solutions',
  'Analytics', 'Commerce', 'Health', 'Fit', 'Beauty', 'Legal', 'Auto', 'Tech', 'Growth', 'Ads'
]

const TIME_CATEGORIES: TimeEntry['category'][] = ['strategy', 'creative', 'ads', 'reporting', 'calls', 'other']

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]
}

function mrrForIndex(i: number): number {
  const tiers = [85000, 120000, 150000, 180000, 220000, 250000, 280000, 320000, 350000, 420000, 500000, 750000, 1200000, 1800000, 2400000, 3200000]
  return tiers[i % tiers.length]
}

export function defaultRetainerSchedule(mrrCents: number, contractStart?: string, index = 0): RetainerSchedule {
  const start = contractStart ? new Date(contractStart) : new Date(Date.now() - 86400000 * 60 * (Math.random() * 12 + 1))
  const nextBill = new Date()
  const daysUntilBill = index % 5 === 0 ? 3 : index % 7 === 0 ? 6 : 14 + (index % 18)
  nextBill.setDate(nextBill.getDate() + daysUntilBill)

  const termMonths = [1, 3, 6, 12][Math.floor(Math.random() * 4)] as 1 | 3 | 6 | 12
  const contactFreq: RetainerSchedule['contact_frequency'][] = ['weekly', 'biweekly', 'monthly', 'quarterly']
  const freq = contactFreq[termMonths === 3 ? 1 : termMonths === 12 ? 3 : 2]

  const nextContact = new Date()
  nextContact.setDate(nextContact.getDate() + (freq === 'weekly' ? 7 : freq === 'biweekly' ? 14 : freq === 'monthly' ? 30 : 90))

  return {
    enabled: true,
    billing_cycle: termMonths >= 3 ? 'quarterly' : 'monthly',
    term_months: termMonths,
    monthly_amount_cents: mrrCents,
    reminder_days_before: 7,
    contract_start: start.toISOString(),
    next_billing_date: nextBill.toISOString(),
    last_billed_date: null,
    contact_frequency: freq,
    next_contact_date: nextContact.toISOString(),
    auto_renew: true
  }
}

function buildTimeEntries(clientIndex: number): TimeEntry[] {
  const entries: TimeEntry[] = []
  const count = 4 + (clientIndex % 8)
  for (let j = 0; j < count; j++) {
    const daysAgo = j * 3 + (clientIndex % 5)
    entries.push({
      id: `time-${clientIndex}-${j}`,
      date: new Date(Date.now() - 86400000 * daysAgo).toISOString(),
      hours: 0.5 + (j % 4) * 0.75,
      category: pick(TIME_CATEGORIES, j + clientIndex),
      billable: j % 5 !== 0,
      notes: pick([
        'Campaign optimization & bid adjustments',
        'Creative review and ad copy revisions',
        'Weekly performance report prep',
        'Client strategy call',
        'Landing page CRO audit',
        'Meta pixel + conversion API setup',
        'Competitive analysis',
        'Email sequence build'
      ], j + clientIndex),
      team_member: pick(['Reda', 'Yoni', 'Yeab', 'Natu', 'Lydia'], clientIndex + j)
    })
  }
  return entries
}

export function generateDemoClients(count = 56): Client[] {
  const clients: Client[] = []
  for (let i = 0; i < count; i++) {
    const company = `${pick(COMPANY_PREFIX, i)} ${pick(COMPANY_SUFFIX, i + 3)}`
    const name = `${pick(FIRST, i)} ${pick(LAST, i + 2)}`
    const status = i === count - 1 ? 'churned' : i >= count - 4 ? 'paused' : 'active'
    clients.push({
      id: `client-${i + 1}`,
      lead_id: i === 3 ? 'lead-4' : null,
      mrr: mrrForIndex(i),
      status,
      name,
      company,
      created_at: new Date(Date.now() - 86400000 * (30 + i * 12)).toISOString()
    })
  }
  return clients
}

export function buildDemoProfilesForClients(clients: Client[]): Record<string, ClientProfile> {
  const profiles: Record<string, ClientProfile> = {}
  clients.forEach((client, i) => {
    const contractStart = new Date(Date.now() - 86400000 * (60 + i * 8)).toISOString()
    const serviceCount = 1 + (i % 3)
    const services = SERVICE_OPTIONS.filter((_, idx) => idx % 3 === i % 3 || idx % 2 === i % 2).slice(0, serviceCount + 1)
    profiles[client.id] = {
      ...createEmptyClientProfile(client.id),
      primary_contact: client.name ?? '',
      email: `${client.name?.split(' ')[0]?.toLowerCase() ?? 'contact'}@${client.company?.toLowerCase().replace(/\s+/g, '') ?? 'client'}.com`,
      phone: `+1 ${200 + (i % 800)} 555 ${String(1000 + i).slice(-4)}`,
      website: `https://${client.company?.toLowerCase().replace(/\s+/g, '') ?? 'client'}.com`,
      industry: pick(INDUSTRIES, i),
      timezone: i % 2 === 0 ? 'America/New_York' : 'America/Los_Angeles',
      services: [...new Set(services)],
      contract_start: contractStart,
      retainer_notes: `$${(client.mrr / 100).toLocaleString()}/mo retainer · ${pick(['Meta + Google', 'Meta only', 'Full funnel', 'Creative + ads'], i)}`,
      communication_preference: pick(['email', 'phone', 'slack', 'whatsapp'] as const, i),
      next_follow_up: new Date(Date.now() + 86400000 * (7 + (i % 14))).toISOString(),
      internal_notes: i % 7 === 0 ? 'Upsell opportunity: TikTok ads Q3' : '',
      meeting_notes: i % 3 === 0 ? [{
        id: `mtg-${client.id}`,
        date: new Date(Date.now() - 86400000 * 10).toISOString(),
        title: 'Monthly check-in',
        notes: 'Reviewed KPIs and agreed on next sprint priorities.',
        attendees: `${client.name}, Reda`
      }] : [],
      call_logs: i % 2 === 0 ? [{
        id: `call-${client.id}`,
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        duration_minutes: 15 + (i % 30),
        notes: 'Status update on campaigns.',
        outcome: 'connected' as const
      }] : [],
      retainer_schedule: defaultRetainerSchedule(client.mrr, contractStart, i),
      time_entries: buildTimeEntries(i),
      updated_at: new Date().toISOString()
    }
  })
  return profiles
}

export function generateDemoCampaigns(clients: Client[]): Campaign[] {
  const campaigns: Campaign[] = []
  clients.filter((c) => c.status === 'active').forEach((client, i) => {
    if (i % 2 === 0) {
      campaigns.push({
        id: `camp-${client.id}-1`,
        client_id: client.id,
        ad_url: `https://facebook.com/ads/${1000 + i}`,
        spend: 80000 + (i % 20) * 25000,
        roas: 1.8 + (i % 25) / 10,
        status: pick(['approved', 'pending', 'revision'], i)
      })
    }
    if (i % 3 === 0) {
      campaigns.push({
        id: `camp-${client.id}-2`,
        client_id: client.id,
        ad_url: `https://facebook.com/ads/${2000 + i}`,
        spend: 50000 + (i % 15) * 18000,
        roas: 2.2 + (i % 20) / 10,
        status: 'approved'
      })
    }
  })
  return campaigns
}

export function generateDemoFinancials(clients: Client[]): Financial[] {
  return clients.filter((c) => c.status === 'active').slice(0, 24).map((client, i) => ({
    id: `fin-${client.id}`,
    client_id: client.id,
    invoice_path: `Active/${client.company?.toLowerCase().replace(/\s+/g, '-')}/invoice.pdf`,
    amount: client.mrr,
    status: pick(['paid', 'paid', 'paid', 'pending'], i),
    created_at: new Date(Date.now() - 86400000 * (i * 5)).toISOString()
  }))
}

export const DEMO_CLIENTS_56 = generateDemoClients(56)
export const DEMO_PROFILES_56 = buildDemoProfilesForClients(DEMO_CLIENTS_56)
export const DEMO_CAMPAIGNS_56 = generateDemoCampaigns(DEMO_CLIENTS_56)
export const DEMO_FINANCIALS_56 = generateDemoFinancials(DEMO_CLIENTS_56)
