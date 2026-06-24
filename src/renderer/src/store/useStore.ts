import { create } from 'zustand'
import type {
  Profile, Lead, Client, Campaign, Task, Message, Financial,
  ClientProfile, ScrapedLead, TeamMemberMetrics, CelebrationState, LeadStage
} from '@/lib/types'
import { DEFAULT_ONBOARDING, DEFAULT_CLOSE_CHECKLIST } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { validateCredentials, saveSession, loadSession, clearSession, GIEO_USERS } from '@/lib/auth'
import { loadClientProfiles, saveClientProfiles, getOrCreateProfile } from '@/lib/clientProfiles'
import { loadScrapedLeads, saveScrapedLeads } from '@/lib/scrapedLeads'
import { loadTeamMetrics, saveTeamMetrics, seedDemoMetrics } from '@/lib/teamMetrics'
import { showDesktopNotification } from '@/lib/notifications'
import { parseLeadSheetCsv } from '@/lib/googleSheet'

const DEMO_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Sarah Chen',
    company: 'NovaTech SaaS',
    stage: 'new',
    value: 850000,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'lead-2',
    name: 'Marcus Webb',
    company: 'Bloom Wellness',
    stage: 'contacted',
    value: 1200000,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'lead-3',
    name: 'Elena Vasquez',
    company: 'Peak Outdoors',
    stage: 'meeting',
    value: 650000,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'lead-4',
    name: 'James Okonkwo',
    company: 'FinFlow Pro',
    stage: 'won',
    value: 2400000,
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    onboarding_checklist: DEFAULT_ONBOARDING.map((item, i) => ({
      ...item,
      id: `ob-lead-4-${i}`,
      completed: i < 3
    }))
  },
  {
    id: 'lead-5',
    name: 'Priya Sharma',
    company: 'CloudKitchen Co',
    stage: 'lost',
    value: 450000,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString()
  }
]

const DEMO_CLIENTS: Client[] = [
  { id: 'client-1', lead_id: 'lead-4', mrr: 2400000, status: 'active', name: 'James Okonkwo', company: 'FinFlow Pro' },
  { id: 'client-2', lead_id: null, mrr: 1800000, status: 'active', name: 'Luxe Beauty', company: 'Luxe Beauty Inc' },
  { id: 'client-3', lead_id: null, mrr: 950000, status: 'active', name: 'UrbanFit', company: 'UrbanFit Gym' },
  { id: 'client-4', lead_id: null, mrr: 3200000, status: 'active', name: 'DataPulse', company: 'DataPulse Analytics' }
]

const DEMO_CAMPAIGNS: Campaign[] = [
  { id: 'camp-1', client_id: 'client-1', ad_url: 'https://facebook.com/ads/123', spend: 450000, roas: 3.2, status: 'approved' },
  { id: 'camp-2', client_id: 'client-1', ad_url: 'https://facebook.com/ads/124', spend: 280000, roas: 2.8, status: 'pending' },
  { id: 'camp-3', client_id: 'client-2', ad_url: 'https://facebook.com/ads/201', spend: 620000, roas: 4.1, status: 'approved' },
  { id: 'camp-4', client_id: 'client-3', ad_url: 'https://facebook.com/ads/301', spend: 190000, roas: 1.9, status: 'revision' }
]

const DEMO_TASKS: Task[] = [
  { id: 'task-1', assignee_id: 'a1000001-0000-4000-8000-000000000001', client_id: 'client-1', title: 'Review Q2 creative brief', due_date: new Date(Date.now() + 86400000).toISOString(), status: 'in_progress' },
  { id: 'task-2', assignee_id: 'a1000002-0000-4000-8000-000000000002', client_id: 'client-2', title: 'Update Meta pixel events', due_date: new Date(Date.now() + 86400000 * 3).toISOString(), status: 'todo' },
  { id: 'task-3', assignee_id: 'a1000003-0000-4000-8000-000000000003', client_id: 'client-3', title: 'Send monthly performance report', due_date: new Date(Date.now() - 86400000).toISOString(), status: 'overdue' },
  { id: 'task-4', assignee_id: 'a1000004-0000-4000-8000-000000000004', client_id: 'client-4', title: 'Launch retargeting campaign', due_date: new Date(Date.now() + 86400000 * 7).toISOString(), status: 'todo' }
]

const DEMO_FINANCIALS: Financial[] = [
  { id: 'fin-1', client_id: 'client-1', invoice_path: 'Active/finflow-pro/invoice-q2.pdf', amount: 2400000, status: 'paid' },
  { id: 'fin-2', client_id: 'client-2', invoice_path: 'Active/luxe-beauty/invoice-june.pdf', amount: 1800000, status: 'pending' },
  { id: 'fin-3', client_id: 'client-3', invoice_path: 'Active/urbanfit/invoice-june.pdf', amount: 950000, status: 'paid' }
]

function buildDemoClientProfiles(): Record<string, ClientProfile> {
  const stored = loadClientProfiles()
  const seeds: Record<string, Partial<ClientProfile>> = {
    'client-1': {
      primary_contact: 'James Okonkwo',
      email: 'james@finflow.pro',
      phone: '+1 415 555 0101',
      industry: 'FinTech / SaaS',
      services: ['Meta Ads Management', 'Analytics & Reporting'],
      contract_start: new Date(Date.now() - 86400000 * 90).toISOString(),
      retainer_notes: '$24k/mo — Meta + Google, weekly reporting',
      meeting_notes: [{
        id: 'mtg-demo-1',
        date: new Date(Date.now() - 86400000 * 7).toISOString(),
        title: 'Q2 Strategy Review',
        notes: 'Approved new UGC creative direction. Scaling budget 15% next month.',
        attendees: 'James, Reda, Yoni'
      }],
      call_logs: [{
        id: 'call-demo-1',
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        duration_minutes: 22,
        notes: 'Checked in on ROAS — client happy with 3.2x average.',
        outcome: 'connected'
      }]
    },
    'client-2': {
      primary_contact: 'Maria Luxe',
      email: 'maria@luxebeauty.com',
      phone: '+1 212 555 0188',
      industry: 'Beauty / DTC',
      services: ['Meta Ads Management', 'Creative Production', 'Email Marketing']
    },
    'client-3': {
      primary_contact: 'Tom Richards',
      email: 'tom@urbanfit.com',
      industry: 'Fitness',
      services: ['Meta Ads Management', 'Landing Page / CRO']
    },
    'client-4': {
      primary_contact: 'Anita Park',
      email: 'anita@datapulse.io',
      industry: 'B2B SaaS',
      services: ['Google Ads', 'SEO / Content', 'Analytics & Reporting']
    }
  }

  const merged: Record<string, ClientProfile> = { ...stored }
  for (const [clientId, seed] of Object.entries(seeds)) {
    if (!merged[clientId]) {
      merged[clientId] = getOrCreateProfile(merged, clientId, seed)
    }
  }
  saveClientProfiles(merged)
  return merged
}

function buildDemoMessages(profile: Profile): Message[] {
  return [
    { id: 'msg-1', user_id: profile.id, content: 'FinFlow creative approved — launching tomorrow', created_at: new Date(Date.now() - 3600000).toISOString(), profile },
    { id: 'msg-2', user_id: 'a1000002-0000-4000-8000-000000000002', content: 'UrbanFit ROAS dipped to 1.9x — need to refresh ad sets', created_at: new Date(Date.now() - 7200000).toISOString(), profile: { id: 'a1000002-0000-4000-8000-000000000002', role: 'media_buyer', name: 'Yoni' } },
    { id: 'msg-3', user_id: 'a1000003-0000-4000-8000-000000000003', content: 'New lead from referral: CloudKitchen Co — high intent', created_at: new Date(Date.now() - 14400000).toISOString(), profile: { id: 'a1000003-0000-4000-8000-000000000003', role: 'sales', name: 'Yeab' } }
  ]
}

interface GieoStore {
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  isUsingLocalData: boolean

  leads: Lead[]
  clients: Client[]
  campaigns: Campaign[]
  tasks: Task[]
  financials: Financial[]
  messages: Message[]
  clientProfiles: Record<string, ClientProfile>
  scrapedLeads: ScrapedLead[]
  teamMetrics: Record<string, TeamMemberMetrics>
  celebration: CelebrationState | null

  activeClientId: string | null
  chatOpen: boolean
  aiSidebarOpen: boolean
  activeTaskId: string | null

  setChatOpen: (open: boolean) => void
  setAiSidebarOpen: (open: boolean) => void
  setActiveClient: (id: string | null) => void
  setActiveTask: (id: string | null) => void
  dismissCelebration: () => void

  initialize: () => Promise<void>
  signIn: (username: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>

  fetchAllData: () => Promise<void>
  fetchLeads: () => Promise<void>
  updateLeadStage: (leadId: string, stage: LeadStage) => Promise<void>
  toggleOnboardingItem: (leadId: string, itemId: string) => void

  fetchClients: () => Promise<void>
  fetchCampaigns: () => Promise<void>
  fetchTasks: () => Promise<void>
  fetchFinancials: () => Promise<void>
  fetchMessages: () => Promise<void>
  sendMessage: (content: string, taskId?: string | null) => Promise<void>
  addMessage: (message: Message) => void
  postSystemMessage: (content: string, notify?: boolean) => void

  updateTaskStatus: (taskId: string, status: string) => Promise<void>
  addClient: (input: {
    company: string
    name: string
    mrr: number
    email?: string
    phone?: string
    services?: string[]
  }) => Promise<{ error?: string; clientId?: string }>
  getClientProfile: (clientId: string) => ClientProfile
  updateClientProfile: (clientId: string, profile: ClientProfile) => void
  ensureClientProfiles: () => void
  startClientClose: (clientId: string) => void
  toggleCloseChecklistItem: (clientId: string, itemId: string) => void
  completeClientProject: (clientId: string) => void

  addScrapedLead: (lead: Omit<ScrapedLead, 'id' | 'scraped_at'>) => void
  updateScrapedLead: (id: string, updates: Partial<ScrapedLead>) => void
  convertScrapedLeadToClient: (scrapedId: string, mrr: number) => Promise<{ error?: string }>
  syncLeadSheetFromGoogle: () => Promise<{ imported: number; error?: string }>

  incrementTeamMetric: (userId: string, metric: keyof TeamMemberMetrics, amount?: number) => void

  getTotalMRR: () => number
  getTotalAdSpend: () => number
  getActiveClientCount: () => number
}

export type { GieoStore }

export const useStore = create<GieoStore>((set, get) => ({
  profile: null,
  isAuthenticated: false,
  isLoading: true,
  isUsingLocalData: false,

  leads: [],
  clients: [],
  campaigns: [],
  tasks: [],
  financials: [],
  messages: [],
  clientProfiles: loadClientProfiles(),
  scrapedLeads: loadScrapedLeads(),
  teamMetrics: { ...loadTeamMetrics(), ...seedDemoMetrics() },
  celebration: null,

  activeClientId: null,
  chatOpen: false,
  aiSidebarOpen: false,
  activeTaskId: null,

  setChatOpen: (open) => set({ chatOpen: open }),
  setAiSidebarOpen: (open) => set({ aiSidebarOpen: open }),
  setActiveClient: (id) => set({ activeClientId: id }),
  setActiveTask: (id) => set({ activeTaskId: id }),
  dismissCelebration: () => set({ celebration: null }),

  postSystemMessage: (content, notify = true) => {
    const msg: Message = {
      id: `sys-${Date.now()}`,
      user_id: 'system',
      content,
      created_at: new Date().toISOString(),
      message_type: 'system'
    }
    set({ messages: [...get().messages, msg], chatOpen: true })
    if (notify) showDesktopNotification('GIEO', content)
  },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const session = loadSession()
      if (session) {
        set({
          profile: session.profile,
          isAuthenticated: true,
          messages: buildDemoMessages(session.profile)
        })
        await get().fetchAllData()
      }
    } finally {
      set({ isLoading: false })
    }
  },

  signIn: async (username, password) => {
    set({ isLoading: true })
    try {
      const user = validateCredentials(username, password)
      if (!user) {
        return { error: 'Invalid username or password.' }
      }

      saveSession(user.username)
      set({
        profile: user.profile,
        isAuthenticated: true,
        messages: buildDemoMessages(user.profile)
      })

      await get().fetchAllData()
      return {}
    } finally {
      set({ isLoading: false })
    }
  },

  signOut: async () => {
    clearSession()
    set({
      profile: null,
      isAuthenticated: false,
      isUsingLocalData: false,
      leads: [],
      clients: [],
      campaigns: [],
      tasks: [],
      financials: [],
      messages: [],
      activeClientId: null,
      activeTaskId: null,
      chatOpen: false,
      aiSidebarOpen: false
    })
  },

  fetchAllData: async () => {
    await Promise.all([
      get().fetchLeads(),
      get().fetchClients(),
      get().fetchCampaigns(),
      get().fetchTasks(),
      get().fetchFinancials(),
      get().fetchMessages()
    ])

    const state = get()
    const usingLocal =
      state.leads.length === 0 ||
      state.clients.length === 0

    if (usingLocal) {
      const profile = state.profile!
      const demoProfiles = buildDemoClientProfiles()
      set({
        isUsingLocalData: true,
        leads: state.leads.length ? state.leads : DEMO_LEADS,
        clients: state.clients.length ? state.clients : DEMO_CLIENTS,
        campaigns: state.campaigns.length ? state.campaigns : DEMO_CAMPAIGNS,
        tasks: state.tasks.length ? state.tasks : DEMO_TASKS,
        financials: state.financials.length ? state.financials : DEMO_FINANCIALS,
        messages: state.messages.length ? state.messages : buildDemoMessages(profile),
        clientProfiles: { ...demoProfiles, ...state.clientProfiles },
        scrapedLeads: state.scrapedLeads.length ? state.scrapedLeads : loadScrapedLeads(),
        teamMetrics: { ...seedDemoMetrics(), ...state.teamMetrics }
      })
    } else {
      set({ isUsingLocalData: false })
    }

    get().ensureClientProfiles()
  },

  fetchLeads: async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (!error && data?.length) set({ leads: data as Lead[] })
  },

  updateLeadStage: async (leadId, stage) => {
    const lead = get().leads.find((l) => l.id === leadId)
    const prevStage = lead?.stage
    const actor = get().profile?.name ?? 'Someone'

    const leads = get().leads.map((l) => {
      if (l.id !== leadId) return l
      const updated: Lead = { ...l, stage }
      if (stage === 'won' && !l.onboarding_checklist) {
        updated.onboarding_checklist = DEFAULT_ONBOARDING.map((item, i) => ({
          ...item,
          id: `ob-${leadId}-${i}`
        }))
      }
      return updated
    })
    set({ leads })

    if (lead && prevStage !== stage) {
      const stageLabel = stage.charAt(0).toUpperCase() + stage.slice(1)
      let sysMsg = `${actor} moved ${lead.name} (${lead.company}) to ${stageLabel}`
      if (stage === 'meeting') sysMsg = `${actor} set up a meeting with ${lead.name} @ ${lead.company}`
      if (stage === 'won') sysMsg = `${actor} closed ${lead.name} @ ${lead.company} — deal won!`
      if (stage === 'lost') sysMsg = `${actor} marked ${lead.name} @ ${lead.company} as lost`
      get().postSystemMessage(sysMsg)
    }

    const { error } = await supabase.from('leads').update({ stage }).eq('id', leadId)
    if (error && get().isUsingLocalData) {
      // skip
    }
  },

  toggleOnboardingItem: (leadId, itemId) => {
    set({
      leads: get().leads.map((lead) => {
        if (lead.id !== leadId || !lead.onboarding_checklist) return lead
        return {
          ...lead,
          onboarding_checklist: lead.onboarding_checklist.map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          )
        }
      })
    })
  },

  fetchClients: async () => {
    const { data, error } = await supabase.from('clients').select('*')
    if (!error && data?.length) set({ clients: data as Client[] })
  },

  fetchCampaigns: async () => {
    const { data, error } = await supabase.from('campaigns').select('*')
    if (!error && data?.length) set({ campaigns: data as Campaign[] })
  },

  fetchTasks: async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true })
    if (!error && data?.length) set({ tasks: data as Task[] })
  },

  fetchFinancials: async () => {
    const { data, error } = await supabase.from('financials').select('*')
    if (!error && data?.length) set({ financials: data as Financial[] })
  },

  fetchMessages: async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)

    if (!error && data?.length) {
      set({ messages: data as Message[] })
    }
  },

  sendMessage: async (content, taskId = null) => {
    const profile = get().profile
    if (!profile) return

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      user_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      task_id: taskId,
      profile
    }
    set({ messages: [...get().messages, optimistic] })

    if (!get().isUsingLocalData) {
      await supabase.from('messages').insert({
        user_id: profile.id,
        content,
        task_id: taskId
      })
    }
  },

  addMessage: (message) => {
    const exists = get().messages.some((m) => m.id === message.id)
    if (!exists) {
      set({ messages: [...get().messages, message] })
    }
  },

  addClient: async (input) => {
    const clientId = `client-${Date.now()}`
    const newClient: Client = {
      id: clientId,
      lead_id: null,
      mrr: input.mrr,
      status: 'active',
      name: input.name,
      company: input.company,
      created_at: new Date().toISOString()
    }

    const newProfile = getOrCreateProfile(get().clientProfiles, clientId, {
      primary_contact: input.name,
      email: input.email ?? '',
      phone: input.phone ?? '',
      services: input.services ?? [],
      contract_start: new Date().toISOString()
    })

    set({
      clients: [newClient, ...get().clients],
      clientProfiles: { ...get().clientProfiles, [clientId]: newProfile }
    })
    saveClientProfiles(get().clientProfiles)

    if (!get().isUsingLocalData) {
      const { error } = await supabase.from('clients').insert({
        id: clientId,
        lead_id: null,
        mrr: input.mrr,
        status: 'active'
      })
      if (error) return { error: error.message }
    }

    return { clientId }
  },

  getClientProfile: (clientId) => {
    const profiles = get().clientProfiles
    if (profiles[clientId]) return profiles[clientId]
    const client = get().clients.find((c) => c.id === clientId)
    const created = getOrCreateProfile(profiles, clientId, {
      primary_contact: client?.name ?? '',
      email: '',
      phone: ''
    })
    const next = { ...profiles, [clientId]: created }
    set({ clientProfiles: next })
    saveClientProfiles(next)
    return created
  },

  updateClientProfile: (clientId, profile) => {
    const updated = { ...profile, client_id: clientId, updated_at: new Date().toISOString() }
    const next = { ...get().clientProfiles, [clientId]: updated }
    set({ clientProfiles: next })
    saveClientProfiles(next)
  },

  ensureClientProfiles: () => {
    const clients = get().clients
    let profiles = { ...get().clientProfiles }
    let changed = false
    for (const client of clients) {
      if (!profiles[client.id]) {
        profiles[client.id] = getOrCreateProfile(profiles, client.id, {
          primary_contact: client.name ?? '',
          email: '',
          phone: ''
        })
        changed = true
      }
      const p = profiles[client.id]
      if (!p.platform_logins) { p.platform_logins = []; changed = true }
      if (!p.close_checklist) { p.close_checklist = []; changed = true }
      if (!p.project_status) { p.project_status = 'active'; changed = true }
    }
    if (changed) {
      set({ clientProfiles: profiles })
      saveClientProfiles(profiles)
    }
  },

  updateTaskStatus: async (taskId, status) => {
    const task = get().tasks.find((t) => t.id === taskId)
    const prev = task?.status
    set({
      tasks: get().tasks.map((t) => (t.id === taskId ? { ...t, status } : t))
    })

    if (task && prev !== status && status === 'done') {
      const actor = GIEO_USERS.find((u) => u.profile.id === task.assignee_id)?.profile.name ?? get().profile?.name ?? 'Someone'
      const client = get().clients.find((c) => c.id === task.client_id)
      get().postSystemMessage(`${actor} completed task: "${task.title}"${client ? ` (${client.company})` : ''}`)

      const title = task.title.toLowerCase()
      const uid = task.assignee_id
      if (uid) {
        if (title.includes('lovable') || title.includes('site')) get().incrementTeamMetric(uid, 'lovable_sites')
        if (title.includes('ad') || title.includes('creative') || title.includes('meta')) get().incrementTeamMetric(uid, 'ads_created')
        if (title.includes('ship') || title.includes('software') || title.includes('deploy')) get().incrementTeamMetric(uid, 'software_shipped')
      }
    }

    if (!get().isUsingLocalData) {
      await supabase.from('tasks').update({ status }).eq('id', taskId)
    }
  },

  startClientClose: (clientId) => {
    const profile = get().getClientProfile(clientId)
    const close_checklist = profile.close_checklist?.length
      ? profile.close_checklist
      : DEFAULT_CLOSE_CHECKLIST.map((item, i) => ({ ...item, id: `close-${clientId}-${i}` }))
    get().updateClientProfile(clientId, {
      ...profile,
      project_status: 'closing',
      close_checklist
    })
    const client = get().clients.find((c) => c.id === clientId)
    get().postSystemMessage(`${get().profile?.name ?? 'Team'} started closing process for ${client?.company ?? 'client'}`)
  },

  toggleCloseChecklistItem: (clientId, itemId) => {
    const profile = get().getClientProfile(clientId)
    get().updateClientProfile(clientId, {
      ...profile,
      close_checklist: (profile.close_checklist ?? []).map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    })
  },

  completeClientProject: (clientId) => {
    const client = get().clients.find((c) => c.id === clientId)
    const profile = get().getClientProfile(clientId)
    get().updateClientProfile(clientId, { ...profile, project_status: 'completed' })
    set({
      clients: get().clients.map((c) =>
        c.id === clientId ? { ...c, status: 'completed' } : c
      ),
      celebration: {
        title: 'Project Complete',
        subtitle: `${client?.company ?? 'Client'} has been successfully closed out.`
      }
    })
    get().postSystemMessage(`${get().profile?.name ?? 'Team'} finished the project for ${client?.company ?? 'client'}`)
  },

  addScrapedLead: (input) => {
    const lead: ScrapedLead = {
      ...input,
      id: `scr-${Date.now()}`,
      scraped_at: new Date().toISOString()
    }
    const next = [lead, ...get().scrapedLeads]
    set({ scrapedLeads: next })
    saveScrapedLeads(next)
  },

  updateScrapedLead: (id, updates) => {
    const next = get().scrapedLeads.map((l) => (l.id === id ? { ...l, ...updates } : l))
    set({ scrapedLeads: next })
    saveScrapedLeads(next)
  },

  convertScrapedLeadToClient: async (scrapedId, mrr) => {
    const scraped = get().scrapedLeads.find((l) => l.id === scrapedId)
    if (!scraped) return { error: 'Lead not found' }
    const result = await get().addClient({
      company: scraped.company,
      name: scraped.name,
      mrr,
      email: scraped.email,
      phone: scraped.phone
    })
    if (!result.error) {
      get().updateScrapedLead(scrapedId, { status: 'converted' })
      get().postSystemMessage(`${get().profile?.name ?? 'Team'} converted scraped lead ${scraped.name} @ ${scraped.company} to client`)
    }
    return result
  },

  syncLeadSheetFromGoogle: async () => {
    if (!window.gieo?.fetchLeadSheet) {
      return { imported: 0, error: 'Sheet fetch unavailable' }
    }

    const result = await window.gieo.fetchLeadSheet()
    if (!result.success || !result.csv) {
      return { imported: 0, error: result.error ?? 'Failed to fetch sheet' }
    }

    const parsed = parseLeadSheetCsv(result.csv)
    if (parsed.length === 0) {
      return { imported: 0, error: 'No rows found in sheet (check column headers: Name, Company, Phone, Email)' }
    }

    const existing = get().scrapedLeads
    const keyOf = (l: { email: string; phone: string; company: string; name: string }) =>
      `${l.email}|${l.phone}|${l.company}|${l.name}`.toLowerCase()

    const existingMap = new Map(existing.map((l) => [keyOf(l), l]))
    let imported = 0

    const merged: typeof existing = [...existing]

    for (const row of parsed) {
      const key = keyOf(row)
      const prev = existingMap.get(key)
      if (prev) {
        const idx = merged.findIndex((l) => l.id === prev.id)
        if (idx >= 0) {
          merged[idx] = {
            ...prev,
            ...row,
            id: prev.id,
            status: prev.status === 'converted' ? 'converted' : row.status,
            scraped_at: prev.scraped_at
          }
        }
      } else {
        merged.push({
          ...row,
          id: `scr-sheet-${Date.now()}-${imported}`,
          scraped_at: new Date().toISOString()
        })
        imported++
      }
    }

    set({ scrapedLeads: merged })
    saveScrapedLeads(merged)
    return { imported }
  },

  incrementTeamMetric: (userId, metric, amount = 1) => {
    const metrics = { ...get().teamMetrics }
    const current = metrics[userId] ?? { lovable_sites: 0, ads_created: 0, ad_spend_managed: 0, software_shipped: 0 }
    metrics[userId] = { ...current, [metric]: Math.max(0, current[metric] + amount) }
    set({ teamMetrics: metrics })
    saveTeamMetrics(metrics)
  },

  getTotalMRR: () => get().clients.filter((c) => c.status === 'active').reduce((sum, c) => sum + c.mrr, 0),
  getTotalAdSpend: () => get().campaigns.reduce((sum, c) => sum + c.spend, 0),
  getActiveClientCount: () => get().clients.filter((c) => c.status === 'active').length
}))
