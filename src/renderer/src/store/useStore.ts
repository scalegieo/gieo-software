import { create } from 'zustand'
import type {
  Profile, Lead, Client, Campaign, Task, Message, Financial,
  ClientProfile, ScrapedLead, TeamMemberMetrics, CelebrationState, LeadStage,
  TaskPriority, WhiteboardItem, WhiteboardConnection, BusinessId
} from '@/lib/types'
import { DEFAULT_ONBOARDING, DEFAULT_CLOSE_CHECKLIST, formatCurrency, clientBusiness } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { validateCredentials, saveSession, loadSession, clearSession, GIEO_USERS, getProfileById } from '@/lib/auth'
import { mapDbMessage } from '@/lib/messages'
import { loadClientProfiles, saveClientProfiles, getOrCreateProfile } from '@/lib/clientProfiles'
import { loadScrapedLeads, saveScrapedLeads } from '@/lib/scrapedLeads'
import {
  loadWhiteboardItems,
  saveWhiteboardItems,
  loadWhiteboardConnections,
  saveWhiteboardConnections
} from '@/lib/whiteboardStorage'
import { loadTeamMetrics, saveTeamMetrics } from '@/lib/teamMetrics'
import { showDesktopNotification } from '@/lib/notifications'
import { parseLeadSheetCsv } from '@/lib/googleSheet'
import { syncClientProfilesFromRemote, upsertClientProfileRemote } from '@/lib/clientProfilesSync'
import { getUpcomingBillings, getAgencyHoursThisMonth, getAgencyTotalHours, type BillingReminder } from '@/lib/retainerBilling'
import { normalizeClientProfile } from '@/lib/clientProfiles'
import { loadActiveBusiness, saveActiveBusiness, workspaceData, type WorkspaceData } from '@/lib/workspace'

interface GieoStore {
  activeBusiness: BusinessId
  setActiveBusiness: (business: BusinessId) => void
  getWorkspace: () => WorkspaceData

  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  connectionError: string | null

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
  whiteboardItems: WhiteboardItem[]
  whiteboardConnections: WhiteboardConnection[]

  activeClientId: string | null
  chatOpen: boolean
  aiSidebarOpen: boolean
  commandBarOpen: boolean
  ebonicsFocusTick: number
  ebonicsPendingSend: string | null
  activeTaskId: string | null

  setChatOpen: (open: boolean) => void
  setAiSidebarOpen: (open: boolean) => void
  setCommandBarOpen: (open: boolean) => void
  setEbonicsPendingSend: (msg: string | null) => void
  focusEbonics: () => void
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
  syncStripePayments: () => Promise<{ error?: string; count?: number }>
  createStripePaymentLink: (clientId: string) => Promise<{ url?: string; error?: string }>

  updateTaskStatus: (taskId: string, status: string) => Promise<void>
  createTask: (input: {
    title: string
    assignee_id?: string | null
    client_id?: string | null
    priority?: TaskPriority
    due_date?: string | null
    status?: string
  }) => Promise<{ error?: string; taskId?: string }>
  getPendingTaskCount: () => number
  addClient: (input: {
    company: string
    name: string
    mrr: number
    email?: string
    phone?: string
    services?: string[]
    business?: BusinessId
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

  fetchWhiteboard: () => Promise<void>
  addWhiteboardNote: (x: number, y: number, content?: string) => void
  updateWhiteboardItem: (id: string, updates: Partial<WhiteboardItem>) => void
  deleteWhiteboardItem: (id: string) => void
  addWhiteboardConnection: (
    fromId: string,
    toId: string,
    fromAnchor: WhiteboardConnection['from_anchor'],
    toAnchor: WhiteboardConnection['to_anchor']
  ) => void
  deleteWhiteboardConnection: (id: string) => void
  subscribeWhiteboard: () => () => void

  getTotalMRR: () => number
  getTotalAdSpend: () => number
  getActiveClientCount: () => number
  getTotalClientCount: () => number
  getAgencyHoursThisMonth: () => number
  getAgencyTotalHours: () => number
  getUpcomingBillingReminders: (withinDays?: number) => BillingReminder[]
}

export type { GieoStore }

export const useStore = create<GieoStore>((set, get) => ({
  activeBusiness: loadActiveBusiness(),
  setActiveBusiness: (business) => {
    saveActiveBusiness(business)
    set({ activeBusiness: business, activeClientId: null, activeTaskId: null })
  },
  getWorkspace: () => {
    const s = get()
    return workspaceData(s.activeBusiness, {
      clients: s.clients,
      tasks: s.tasks,
      leads: s.leads,
      campaigns: s.campaigns,
      financials: s.financials,
      clientProfiles: s.clientProfiles
    })
  },

  profile: null,
  isAuthenticated: false,
  isLoading: true,
  connectionError: null,

  leads: [],
  clients: [],
  campaigns: [],
  tasks: [],
  financials: [],
  messages: [],
  clientProfiles: loadClientProfiles(),
  scrapedLeads: loadScrapedLeads(),
  teamMetrics: loadTeamMetrics(),
  celebration: null,
  whiteboardItems: loadWhiteboardItems(),
  whiteboardConnections: loadWhiteboardConnections(),

  activeClientId: null,
  chatOpen: false,
  aiSidebarOpen: false,
  commandBarOpen: false,
  ebonicsFocusTick: 0,
  ebonicsPendingSend: null,
  activeTaskId: null,

  setChatOpen: (open) => set({ chatOpen: open }),
  setAiSidebarOpen: (open) => set({ aiSidebarOpen: open }),
  setCommandBarOpen: (open) => set({ commandBarOpen: open }),
  setEbonicsPendingSend: (msg) => set({ ebonicsPendingSend: msg }),
  focusEbonics: () => set({ ebonicsFocusTick: get().ebonicsFocusTick + 1 }),
  setActiveClient: (id) => set({ activeClientId: id }),
  setActiveTask: (id) => set({ activeTaskId: id }),
  dismissCelebration: () => set({ celebration: null }),

  postSystemMessage: (content, notify = true) => {
    const profile = get().profile
    const userId = profile?.id ?? GIEO_USERS[0].profile.id
    const optimistic: Message = {
      id: `sys-${Date.now()}`,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
      message_type: 'system',
      profile: profile ?? undefined
    }
    set({ messages: [...get().messages, optimistic], chatOpen: true })
    if (notify) showDesktopNotification('GIEO', content)

    void (async () => {
      const { data, error } = await supabase
        .from('messages')
        .insert({ user_id: userId, content, message_type: 'system' })
        .select('*, profiles(id, role, name)')
        .single()

      if (error) {
        console.error('[GIEO] system message insert failed:', error.message)
        return
      }
      if (data) {
        const mapped = mapDbMessage(data as Message & { profiles?: Profile | null })
        set({
          messages: get().messages.map((m) => (m.id === optimistic.id ? mapped : m))
        })
      }
    })()
  },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const session = loadSession()
      if (session) {
        set({
          profile: session.profile,
          isAuthenticated: true
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
        isAuthenticated: true
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
      connectionError: null,
      leads: [],
      clients: [],
      campaigns: [],
      tasks: [],
      financials: [],
      messages: [],
      activeClientId: null,
      activeTaskId: null,
      chatOpen: false,
      aiSidebarOpen: false,
      commandBarOpen: false,
      ebonicsPendingSend: null,
      whiteboardItems: [],
      whiteboardConnections: []
    })
  },

  fetchAllData: async () => {
    set({ connectionError: null })

    await Promise.all([
      get().fetchLeads(),
      get().fetchClients(),
      get().fetchCampaigns(),
      get().fetchTasks(),
      get().fetchFinancials(),
      get().fetchMessages(),
      get().fetchWhiteboard()
    ])

    const state = get()
    const mergedProfiles = await syncClientProfilesFromRemote(state.clients)
    set({ clientProfiles: mergedProfiles })

    get().ensureClientProfiles()
  },

  fetchLeads: async () => {
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('[GIEO] fetchLeads:', error.message)
      set({ connectionError: error.message })
      return
    }
    set({ leads: (data ?? []) as Lead[] })
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
    if (error) console.error('[GIEO] updateLeadStage:', error.message)
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
    const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    if (error) {
      console.error('[GIEO] fetchClients:', error.message)
      set({ connectionError: error.message })
      return
    }
    set({ clients: (data ?? []) as Client[] })
  },

  fetchCampaigns: async () => {
    const { data, error } = await supabase.from('campaigns').select('*')
    if (error) {
      console.error('[GIEO] fetchCampaigns:', error.message)
      set({ connectionError: error.message })
      return
    }
    set({ campaigns: (data ?? []) as Campaign[] })
  },

  fetchTasks: async () => {
    const { data, error } = await supabase.from('tasks').select('*').order('due_date', { ascending: true })
    if (error) {
      console.error('[GIEO] fetchTasks:', error.message)
      set({ connectionError: error.message })
      return
    }
    set({ tasks: (data ?? []) as Task[] })
  },

  fetchFinancials: async () => {
    const { data, error } = await supabase.from('financials').select('*')
    if (error) {
      console.error('[GIEO] fetchFinancials:', error.message)
      set({ connectionError: error.message })
      return
    }
    set({ financials: (data ?? []) as Financial[] })
  },

  fetchMessages: async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles(id, role, name)')
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      console.error('[GIEO] fetchMessages failed:', error.message)
      return
    }

    if (data?.length) {
      set({ messages: data.map((row) => mapDbMessage(row as Message & { profiles?: Profile | null })) })
    }
  },

  sendMessage: async (content, taskId = null) => {
    const profile = get().profile
    if (!profile) return

    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      user_id: profile.id,
      content,
      created_at: new Date().toISOString(),
      task_id: taskId,
      profile,
      message_type: 'user'
    }
    set({ messages: [...get().messages, optimistic] })

    const { data, error } = await supabase
      .from('messages')
      .insert({
        user_id: profile.id,
        content,
        task_id: taskId,
        message_type: 'user'
      })
      .select('*, profiles(id, role, name)')
      .single()

    if (error) {
      console.error('[GIEO] sendMessage failed:', error.message)
      return
    }

    if (data) {
      const mapped = mapDbMessage(data as Message & { profiles?: Profile | null })
      set({
        messages: get()
          .messages.filter((m) => m.id !== tempId && m.id !== mapped.id)
          .concat(mapped)
      })
    }
  },

  addMessage: (message) => {
    const mapped = mapDbMessage(message as Message & { profiles?: Profile | null })
    if (get().messages.some((m) => m.id === mapped.id)) return

    const tempDup = get().messages.find(
      (m) =>
        m.id.startsWith('temp-') &&
        m.content === mapped.content &&
        m.user_id === mapped.user_id &&
        (m.task_id ?? null) === (mapped.task_id ?? null)
    )

    if (tempDup) {
      set({
        messages: get()
          .messages.filter((m) => m.id !== tempDup.id)
          .concat(mapped)
      })
      return
    }

    set({ messages: [...get().messages, mapped] })
  },

  addClient: async (input) => {
    const clientId = crypto.randomUUID()
    const business = input.business ?? get().activeBusiness
    const newClient: Client = {
      id: clientId,
      lead_id: null,
      mrr: input.mrr,
      status: 'active',
      name: input.name,
      company: input.company,
      business,
      created_at: new Date().toISOString()
    }

    const newProfile = getOrCreateProfile(get().clientProfiles, clientId, {
      primary_contact: input.name,
      email: input.email ?? '',
      phone: input.phone ?? '',
      services: input.services ?? [],
      contract_start: new Date().toISOString()
    }, input.mrr)

    set({
      clients: [newClient, ...get().clients],
      clientProfiles: { ...get().clientProfiles, [clientId]: newProfile }
    })
    saveClientProfiles(get().clientProfiles)

    const { error } = await supabase.from('clients').insert({
      id: clientId,
      lead_id: null,
      mrr: input.mrr,
      status: 'active',
      name: input.name,
      company: input.company,
      business
    })
    if (error) {
      set({
        clients: get().clients.filter((c) => c.id !== clientId),
        clientProfiles: Object.fromEntries(
          Object.entries(get().clientProfiles).filter(([id]) => id !== clientId)
        )
      })
      return { error: error.message }
    }

    void upsertClientProfileRemote(clientId, newProfile)
    get().postSystemMessage(
      `${get().profile?.name ?? 'Team'} added client ${input.company} (${formatCurrency(input.mrr)}/mo MRR)`
    )

    return { clientId }
  },

  getClientProfile: (clientId) => {
    const profiles = get().clientProfiles
    const client = get().clients.find((c) => c.id === clientId)
    const mrr = client?.mrr ?? 0
    if (profiles[clientId]) return normalizeClientProfile(profiles[clientId], mrr)
    const created = getOrCreateProfile(profiles, clientId, {
      primary_contact: client?.name ?? '',
      email: '',
      phone: ''
    }, mrr)
    const next = { ...profiles, [clientId]: created }
    set({ clientProfiles: next })
    saveClientProfiles(next)
    return created
  },

  updateClientProfile: (clientId, profile) => {
    const client = get().clients.find((c) => c.id === clientId)
    const updated = normalizeClientProfile(
      { ...profile, client_id: clientId, updated_at: new Date().toISOString() },
      client?.mrr ?? 0
    )
    const next = { ...get().clientProfiles, [clientId]: updated }
    set({ clientProfiles: next })
    saveClientProfiles(next)
    void upsertClientProfileRemote(clientId, updated)
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
        }, client.mrr)
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
      for (const client of clients) {
        if (profiles[client.id]) {
          void upsertClientProfileRemote(client.id, profiles[client.id])
        }
      }
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

    const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId)
    if (error) console.error('[GIEO] updateTaskStatus:', error.message)
  },

  createTask: async (input) => {
    const id = crypto.randomUUID()
    const taskClient = input.client_id ? get().clients.find((c) => c.id === input.client_id) : undefined
    const task: Task = {
      id,
      title: input.title,
      assignee_id: input.assignee_id ?? null,
      client_id: input.client_id ?? null,
      priority: input.priority ?? 'medium',
      due_date: input.due_date ?? null,
      status: input.status ?? 'todo',
      business: taskClient ? clientBusiness(taskClient) : get().activeBusiness
    }

    set({ tasks: [task, ...get().tasks] })

    const { error } = await supabase.from('tasks').insert({
      id,
      title: task.title,
      assignee_id: task.assignee_id,
      client_id: task.client_id,
      due_date: task.due_date,
      status: task.status,
      priority: task.priority,
      business: task.business
    })
    if (error) {
      set({ tasks: get().tasks.filter((t) => t.id !== id) })
      return { error: error.message }
    }

    const assigneeName = task.assignee_id
      ? getProfileById(task.assignee_id)?.name ?? 'Team member'
      : 'Unassigned'
    get().postSystemMessage(
      `${get().profile?.name ?? 'Team'} assigned task "${task.title}" to ${assigneeName}`
    )

    if (task.assignee_id && task.assignee_id !== get().profile?.id) {
      showDesktopNotification(
        'New task assigned',
        `"${task.title}" — from ${get().profile?.name ?? 'Team'}`
      )
    }

    return { taskId: id }
  },

  getPendingTaskCount: () => {
    const profileId = get().profile?.id
    if (!profileId) return 0
    return get().getWorkspace().tasks.filter(
      (t) => t.assignee_id === profileId && t.status !== 'done'
    ).length
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
    void supabase.from('clients').update({ status: 'completed' }).eq('id', clientId)
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

  fetchWhiteboard: async () => {
    const local = loadWhiteboardItems()
    if (local.length) {
      set({ whiteboardItems: local, whiteboardConnections: loadWhiteboardConnections() })
    }

    const { data, error } = await supabase
      .from('whiteboard_items')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data?.length) {
      set({ whiteboardItems: data as WhiteboardItem[] })
      saveWhiteboardItems(data as WhiteboardItem[])
    }
  },

  addWhiteboardNote: (x, y, content = '') => {
    const profile = get().profile
    if (!profile) return

    const item: WhiteboardItem = {
      id: `wb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: profile.id,
      type: 'note',
      x,
      y,
      width: 220,
      height: 140,
      content,
      color: 'amber',
      target_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const next = [...get().whiteboardItems, item]
    set({ whiteboardItems: next })
    saveWhiteboardItems(next)

    void supabase.from('whiteboard_items').upsert(item)
  },

  updateWhiteboardItem: (id, updates) => {
    const next = get().whiteboardItems.map((i) =>
      i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i
    )
    set({ whiteboardItems: next })
    saveWhiteboardItems(next)
    void supabase.from('whiteboard_items').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id)
  },

  deleteWhiteboardItem: (id) => {
    const next = get().whiteboardItems.filter((i) => i.id !== id)
    const conns = get().whiteboardConnections.filter((c) => c.from_id !== id && c.to_id !== id)
    set({ whiteboardItems: next, whiteboardConnections: conns })
    saveWhiteboardItems(next)
    saveWhiteboardConnections(conns)
    void supabase.from('whiteboard_items').delete().eq('id', id)
  },

  addWhiteboardConnection: (fromId, toId, fromAnchor, toAnchor) => {
    if (fromId === toId) return
    const exists = get().whiteboardConnections.some(
      (c) =>
        (c.from_id === fromId && c.to_id === toId) || (c.from_id === toId && c.to_id === fromId)
    )
    if (exists) return

    const conn: WhiteboardConnection = {
      id: `conn-${Date.now()}`,
      from_id: fromId,
      to_id: toId,
      from_anchor: fromAnchor,
      to_anchor: toAnchor
    }
    const next = [...get().whiteboardConnections, conn]
    set({ whiteboardConnections: next })
    saveWhiteboardConnections(next)
  },

  deleteWhiteboardConnection: (id) => {
    const next = get().whiteboardConnections.filter((c) => c.id !== id)
    set({ whiteboardConnections: next })
    saveWhiteboardConnections(next)
  },

  subscribeWhiteboard: () => {
    const channel = supabase
      .channel('whiteboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whiteboard_items' },
        () => {
          void get().fetchWhiteboard()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  },

  syncStripePayments: async () => {
    if (!window.gieo?.listStripeInvoices) {
      return { error: 'Stripe unavailable in this environment' }
    }

    const result = await window.gieo.listStripeInvoices()
    if (result.error) return { error: result.error }
    if (!result.invoices?.length) return { count: 0 }

    const clients = get().clients
    const existing = get().financials
    let count = 0

    for (const inv of result.invoices) {
      if (existing.some((f) => f.stripe_invoice_id === inv.id)) continue

      const match = clients.find(
        (c) =>
          (inv.customer_email && get().getClientProfile(c.id).email === inv.customer_email) ||
          (inv.customer_name && (c.company === inv.customer_name || c.name === inv.customer_name))
      )

      const fin: Financial = {
        id: `stripe-${inv.id}`,
        client_id: match?.id ?? clients[0]?.id ?? 'unassigned',
        invoice_path: inv.hosted_invoice_url ? 'Stripe Invoice' : `Stripe ${inv.id}`,
        amount: inv.amount_paid || inv.amount_due,
        status: inv.status === 'paid' ? 'paid' : inv.status === 'open' ? 'pending' : inv.status ?? 'pending',
        stripe_invoice_id: inv.id,
        hosted_invoice_url: inv.hosted_invoice_url,
        created_at: new Date(inv.created * 1000).toISOString()
      }

      existing.unshift(fin)
      count++
    }

    if (count > 0) {
      set({ financials: [...existing] })
    }

    return { count }
  },

  createStripePaymentLink: async (clientId) => {
    if (!window.gieo?.createStripePaymentLink) {
      return { error: 'Stripe unavailable' }
    }

    const client = get().clients.find((c) => c.id === clientId)
    if (!client) return { error: 'Client not found' }

    const profile = get().getClientProfile(clientId)
    return window.gieo.createStripePaymentLink({
      amountCents: client.mrr,
      clientName: client.company ?? client.name ?? 'Client',
      clientEmail: profile.email || undefined
    })
  },

  getTotalMRR: () =>
    get().getWorkspace().clients.filter((c) => c.status === 'active').reduce((sum, c) => sum + c.mrr, 0),
  getTotalAdSpend: () => get().getWorkspace().campaigns.reduce((sum, c) => sum + c.spend, 0),
  getActiveClientCount: () => get().getWorkspace().clients.filter((c) => c.status === 'active').length,
  getTotalClientCount: () => get().getWorkspace().clients.length,
  getAgencyHoursThisMonth: () => getAgencyHoursThisMonth(get().getWorkspace().clientProfiles),
  getAgencyTotalHours: () => getAgencyTotalHours(get().getWorkspace().clientProfiles),
  getUpcomingBillingReminders: (withinDays = 14) => {
    const ws = get().getWorkspace()
    return getUpcomingBillings(ws.clients, ws.clientProfiles, withinDays)
  }
}))
