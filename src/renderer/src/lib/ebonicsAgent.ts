import { fridayStatsReply, humanizeFridayReply, getFirstName } from '@/lib/fridayVoice'
import { GIEO_USERS } from '@/lib/auth'
import { formatCompactCurrency, formatCurrency, LEAD_STAGES } from '@/lib/types'
import { getTotalHours, getHoursThisMonth } from '@/lib/retainerBilling'
import type { GieoStore } from '@/store/useStore'

export type EbonicsActionType =
  | 'none'
  | 'answer'
  | 'add_lead'
  | 'create_task'
  | 'complete_task'
  | 'update_client'
  | 'update_scraped_lead'
  | 'move_pipeline_lead'
  | 'add_client'
  | 'log_hours'
  | 'add_note'
  | 'navigate'
  | 'query_stats'
  | 'search'
  | 'get_client'
  | 'convert_lead'
  | 'whiteboard_note'
  | 'team_message'

export interface EbonicsAction {
  action: EbonicsActionType
  reply?: string
  name?: string
  company?: string
  phone?: string
  email?: string
  notes?: string
  source?: string
  budget?: string
  title?: string
  assignee?: string
  priority?: TaskPriority
  due_date?: string
  client?: string
  page?: string
  query?: string
  scope?: 'all' | 'clients' | 'leads' | 'tasks' | 'scraped'
  stage?: LeadStage | string
  lead_id?: string
  task_id?: string
  scraped_id?: string
  client_id?: string
  hours?: number
  date?: string
  category?: TimeEntryCategory | string
  mrr?: number
  note_type?: 'internal' | 'meeting' | 'retainer'
  meeting_title?: string
  message?: string
  content?: string
  status?: string
}

const NAV_MAP: Record<string, string> = {
  dashboard: '/',
  home: '/',
  tasks: '/tasks',
  crm: '/crm',
  pipeline: '/crm',
  clients: '/clients',
  client: '/clients',
  leads: '/leads',
  'lead sheet': '/leads',
  team: '/team',
  stats: '/team',
  whiteboard: '/whiteboard',
  board: '/whiteboard'
}

const STATS_PATTERN =
  /\b(mrr|revenue|clients?|leads?|pipeline|ad spend|stats|performance|how many|what('s| is)\s+(our|my)|hours|billing)\b/i

const NAV_PATTERN =
  /\b(go to|open|show|navigate to|take me to)\b[\s\S]{0,40}\b(dashboard|tasks?|crm|pipeline|clients?|leads?|team|stats|whiteboard)\b/i

const READ_PATTERN =
  /\b(who|what|which|tell me|show me|list|find|search|look up|details? for|status of)\b/i

export function tryLocalAction(message: string): EbonicsAction | null {
  const m = message.trim().toLowerCase()

  const navMatch = m.match(NAV_PATTERN)
  if (navMatch) {
    const page = navMatch[2]?.replace(/s$/, '') ?? ''
    return { action: 'navigate', page: NAV_MAP[page] ?? NAV_MAP[`${page}s`] ?? '/' }
  }

  if (STATS_PATTERN.test(m) && !/\b(add|create|assign|update|move|complete|log)\b/i.test(m)) {
    return { action: 'query_stats' }
  }

  const clientMatch = m.match(/\b(?:about|for|client)\s+(.{2,40})$/i)
  if (clientMatch && READ_PATTERN.test(m) && !/\b(add|create|update)\b/i.test(m)) {
    return { action: 'get_client', company: clientMatch[1].trim() }
  }

  const searchMatch = m.match(/\b(?:find|search|look for)\s+(.+)/i)
  if (searchMatch) {
    return { action: 'search', query: searchMatch[1].trim(), scope: 'all' }
  }

  return null
}

function extractJsonBlocks(raw: string): string[] {
  const blocks: string[] = []
  const fenced = raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)
  for (const m of fenced) blocks.push(m[1].trim())

  const arrayMatch = raw.match(/\[[\s\S]*"action"[\s\S]*\]/)
  if (arrayMatch) blocks.push(arrayMatch[0])

  const objMatch = raw.match(/\{[\s\S]*"action"[\s\S]*\}/)
  if (objMatch) blocks.push(objMatch[0])

  return blocks
}

export function parseEbonicsAction(raw: string): EbonicsAction | null {
  const actions = parseEbonicsActions(raw)
  return actions[0] ?? null
}

export function parseEbonicsActions(raw: string): EbonicsAction[] {
  const valid: EbonicsActionType[] = [
    'none',
    'answer',
    'add_lead',
    'create_task',
    'complete_task',
    'update_client',
    'update_scraped_lead',
    'move_pipeline_lead',
    'add_client',
    'log_hours',
    'add_note',
    'navigate',
    'query_stats',
    'search',
    'get_client',
    'convert_lead',
    'whiteboard_note',
    'team_message'
  ]

  for (const block of extractJsonBlocks(raw)) {
    try {
      const parsed = JSON.parse(block.trim()) as EbonicsAction | EbonicsAction[]
      const list = (Array.isArray(parsed) ? parsed : [parsed]).map((a) => {
        const nested = (a as { parameters?: object; params?: object; args?: object }) ?? {}
        const extra = nested.parameters ?? nested.params ?? nested.args
        return extra && typeof extra === 'object' ? ({ ...extra, ...a } as EbonicsAction) : a
      })
      const filtered = list.filter((a) => a?.action && valid.includes(a.action))
      if (filtered.length) return filtered
    } catch {
      /* try next block */
    }
  }
  return []
}

function resolveAssignee(name?: string): string | null {
  if (!name?.trim()) return null
  const q = name.trim().toLowerCase()
  const user = GIEO_USERS.find(
    (u) =>
      u.profile.name.toLowerCase().startsWith(q) ||
      u.profile.name.toLowerCase().includes(q)
  )
  return user?.profile.id ?? null
}

function resolveClientId(store: GieoStore, hint?: string): string | null {
  if (!hint?.trim()) return null
  if (store.clients.some((c) => c.id === hint)) return hint
  const q = hint.trim().toLowerCase()
  const client = store.clients.find(
    (c) =>
      c.company?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.id === hint
  )
  return client?.id ?? null
}

function resolvePipelineLeadId(store: GieoStore, hint?: string): string | null {
  if (!hint?.trim()) return null
  if (store.leads.some((l) => l.id === hint)) return hint
  const q = hint.trim().toLowerCase()
  const lead = store.leads.find(
    (l) =>
      l.company?.toLowerCase().includes(q) ||
      l.name?.toLowerCase().includes(q)
  )
  return lead?.id ?? null
}

function resolveScrapedLeadId(store: GieoStore, hint?: string): string | null {
  if (!hint?.trim()) return null
  if (store.scrapedLeads.some((l) => l.id === hint)) return hint
  const q = hint.trim().toLowerCase()
  const lead = store.scrapedLeads.find(
    (l) =>
      l.company?.toLowerCase().includes(q) ||
      l.name?.toLowerCase().includes(q)
  )
  return lead?.id ?? null
}

function resolveTaskId(store: GieoStore, hint?: string): string | null {
  if (!hint?.trim()) return null
  if (store.tasks.some((t) => t.id === hint)) return hint
  const q = hint.trim().toLowerCase()
  const task = store.tasks.find((t) => t.title.toLowerCase().includes(q))
  return task?.id ?? null
}

function normalizeStage(stage?: string): LeadStage | null {
  if (!stage) return null
  const s = stage.toLowerCase().replace(/\s+/g, '_')
  const found = LEAD_STAGES.find((x) => x.id === s || x.label.toLowerCase() === stage.toLowerCase())
  return (found?.id as LeadStage) ?? null
}

function leadToInput(action: EbonicsAction): Omit<ScrapedLead, 'id' | 'scraped_at'> | null {
  const name = (action.name ?? '').trim()
  const company = (action.company ?? '').trim()
  const phone = (action.phone ?? '').trim()
  const email = (action.email ?? '').trim()
  const notes = [action.notes, action.budget ? `Budget: ${action.budget}` : '']
    .filter(Boolean)
    .join(' · ')
    .trim()

  if (!name && !company && !phone && !email) return null

  return {
    name: name || company || 'Unknown',
    company: company || name || '—',
    phone,
    email,
    notes,
    source: action.source?.trim() || 'FRIDAY',
    status: 'new'
  }
}

export interface ExecuteResult {
  reply: string
  navigateTo?: string
}

function formatClientDetail(store: GieoStore, clientId: string): string {
  const client = store.clients.find((c) => c.id === clientId)
  const p = store.getClientProfile(clientId)
  if (!client) return 'Client not found.'

  return [
    `${client.company ?? client.name} [${client.id}]`,
    `MRR: ${formatCurrency(client.mrr)} | Status: ${client.status}`,
    `Contact: ${p.primary_contact || '—'} | ${p.email || '—'} | ${p.phone || '—'}`,
    `Industry: ${p.industry || '—'} | Services: ${p.services.join(', ') || 'none'}`,
    `Hours: ${getHoursThisMonth(p)}h this month, ${getTotalHours(p)}h total`,
    `Internal notes: ${p.internal_notes || '—'}`,
    `Retainer: ${p.retainer_notes || '—'}`,
    `Meetings (${p.meeting_notes.length}): ${p.meeting_notes.slice(0, 3).map((m) => m.title).join(', ') || 'none'}`,
    `Tasks: ${store.tasks.filter((t) => t.client_id === clientId && t.status !== 'done').length} open`
  ].join('\n')
}

function runSearch(store: GieoStore, query: string, scope: EbonicsAction['scope'] = 'all'): string {
  const q = query.toLowerCase()
  const lines: string[] = []

  if (scope === 'all' || scope === 'clients') {
    store.clients
      .filter(
        (c) =>
          c.company?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          store.getClientProfile(c.id).email?.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .forEach((c) => lines.push(`Client: ${c.company ?? c.name} [${c.id}] MRR ${formatCurrency(c.mrr)}`))
  }

  if (scope === 'all' || scope === 'leads') {
    store.leads
      .filter((l) => l.company?.toLowerCase().includes(q) || l.name?.toLowerCase().includes(q))
      .slice(0, 8)
      .forEach((l) => lines.push(`Pipeline: ${l.name} @ ${l.company} [${l.id}] stage ${l.stage}`))
  }

  if (scope === 'all' || scope === 'scraped') {
    store.scrapedLeads
      .filter((l) => l.company?.toLowerCase().includes(q) || l.name?.toLowerCase().includes(q))
      .slice(0, 8)
      .forEach((l) => lines.push(`Lead sheet: ${l.name} @ ${l.company} [${l.id}] ${l.status}`))
  }

  if (scope === 'all' || scope === 'tasks') {
    store.tasks
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 8)
      .forEach((t) => lines.push(`Task: ${t.title} [${t.id}] ${t.status}`))
  }

  return lines.length ? lines.join('\n') : `No results for "${query}".`
}

export async function executeEbonicsAction(
  store: GieoStore,
  action: EbonicsAction
): Promise<ExecuteResult> {
  switch (action.action) {
    case 'answer':
      return { reply: action.reply?.trim() || 'Done.' }

    case 'add_lead': {
      const input = leadToInput(action)
      if (!input) {
        return {
          reply: 'Need name/company/contact. Example: add lead Sarah at Acme, sarah@acme.com'
        }
      }
      store.addScrapedLead(input)
      store.postSystemMessage(
        `${store.profile?.name ?? 'Team'} added lead via FRIDAY: ${input.name} @ ${input.company}`
      )
      return {
        reply: `Lead added.\n${input.name} · ${input.company}${input.notes ? `\n${input.notes}` : ''}`,
        navigateTo: '/leads'
      }
    }

    case 'create_task': {
      const title = action.title?.trim()
      if (!title) return { reply: 'Task title required.' }

      const assigneeId = resolveAssignee(action.assignee)
      const clientId = resolveClientId(store, action.client ?? action.client_id)
      await store.createTask({
        title,
        assignee_id: assigneeId,
        client_id: clientId,
        priority: action.priority ?? 'medium',
        due_date: action.due_date?.trim() || null,
        status: 'todo'
      })

      const assigneeName =
        GIEO_USERS.find((u) => u.profile.id === assigneeId)?.profile.name ??
        action.assignee ??
        'Unassigned'

      return {
        reply: `Task created: "${title}"\nAssignee: ${assigneeName}`,
        navigateTo: '/tasks'
      }
    }

    case 'complete_task': {
      const taskId = resolveTaskId(store, action.task_id ?? action.title)
      if (!taskId) return { reply: 'Which task? Include title or id.' }
      await store.updateTaskStatus(taskId, 'done')
      const task = store.tasks.find((t) => t.id === taskId)
      return { reply: `Completed: "${task?.title ?? taskId}"`, navigateTo: '/tasks' }
    }

    case 'update_client': {
      const clientId = resolveClientId(store, action.client_id ?? action.company ?? action.client)
      if (!clientId) return { reply: 'Which client?' }

      const profile = store.getClientProfile(clientId)
      store.updateClientProfile(clientId, {
        ...profile,
        primary_contact: action.name?.trim() || profile.primary_contact,
        email: action.email?.trim() || profile.email,
        phone: action.phone?.trim() || profile.phone,
        retainer_notes: action.notes?.trim()
          ? [profile.retainer_notes, action.notes].filter(Boolean).join('\n')
          : profile.retainer_notes,
        internal_notes: action.notes?.trim()
          ? [profile.internal_notes, action.notes].filter(Boolean).join('\n')
          : profile.internal_notes
      })

      const company = store.clients.find((c) => c.id === clientId)?.company ?? action.company
      return { reply: `Updated ${company}.`, navigateTo: '/clients' }
    }

    case 'update_scraped_lead': {
      const id = resolveScrapedLeadId(store, action.scraped_id ?? action.company ?? action.name)
      if (!id) return { reply: 'Lead not found on sheet.' }
      store.updateScrapedLead(id, {
        phone: action.phone,
        email: action.email,
        notes: action.notes,
        status: action.status as ScrapedLead['status'] | undefined
      })
      return { reply: 'Lead sheet entry updated.', navigateTo: '/leads' }
    }

    case 'move_pipeline_lead': {
      const leadId = resolvePipelineLeadId(store, action.lead_id ?? action.company ?? action.name)
      const stage = normalizeStage(action.stage)
      if (!leadId) return { reply: 'Pipeline lead not found.' }
      if (!stage) return { reply: `Invalid stage. Use: ${LEAD_STAGES.map((s) => s.id).join(', ')}` }
      await store.updateLeadStage(leadId, stage)
      const lead = store.leads.find((l) => l.id === leadId)
      return {
        reply: `Moved ${lead?.company ?? lead?.name} → ${stage}`,
        navigateTo: '/crm'
      }
    }

    case 'add_client': {
      const company = action.company?.trim()
      if (!company) return { reply: 'Company name required.' }
      await store.addClient({
        name: action.name?.trim() || company,
        company,
        mrr: action.mrr ?? 0,
        email: action.email,
        phone: action.phone
      })
      return { reply: `Client added: ${company}`, navigateTo: '/clients' }
    }

    case 'log_hours': {
      const clientId = resolveClientId(store, action.client_id ?? action.company ?? action.client)
      if (!clientId) return { reply: 'Which client?' }
      const hours = Number(action.hours)
      if (!hours || hours <= 0) return { reply: 'Hours required (number).' }

      const profile = store.getClientProfile(clientId)
      const entry = {
        id: crypto.randomUUID(),
        date: action.date?.trim() || new Date().toISOString().slice(0, 10),
        hours,
        category: (action.category as TimeEntryCategory) || 'other',
        billable: true,
        notes: action.notes?.trim() || 'Logged via FRIDAY',
        team_member: store.profile?.name
      }
      store.updateClientProfile(clientId, {
        ...profile,
        time_entries: [...(profile.time_entries ?? []), entry]
      })
      const company = store.clients.find((c) => c.id === clientId)?.company
      return { reply: `Logged ${hours}h for ${company}.`, navigateTo: '/clients' }
    }

    case 'add_note': {
      const clientId = resolveClientId(store, action.client_id ?? action.company ?? action.client)
      if (!clientId) return { reply: 'Which client?' }
      const text = action.notes?.trim() || action.content?.trim()
      if (!text) return { reply: 'Note text required.' }

      const profile = store.getClientProfile(clientId)
      if (action.note_type === 'meeting') {
        store.updateClientProfile(clientId, {
          ...profile,
          meeting_notes: [
            ...profile.meeting_notes,
            {
              id: crypto.randomUUID(),
              date: action.date || new Date().toISOString().slice(0, 10),
              title: action.meeting_title || 'FRIDAY note',
              notes: text,
              attendees: store.profile?.name ?? ''
            }
          ]
        })
      } else {
        store.updateClientProfile(clientId, {
          ...profile,
          internal_notes: [profile.internal_notes, text].filter(Boolean).join('\n')
        })
      }
      return { reply: 'Note saved.', navigateTo: '/clients' }
    }

    case 'convert_lead': {
      const id = resolveScrapedLeadId(store, action.scraped_id ?? action.company ?? action.name)
      if (!id) return { reply: 'Scraped lead not found.' }
      const result = await store.convertScrapedLeadToClient(id, action.mrr ?? 1500)
      if (result.error) return { reply: result.error }
      return { reply: 'Lead converted to client.', navigateTo: '/clients' }
    }

    case 'whiteboard_note': {
      store.addWhiteboardNote(120, 120, action.content?.trim() || action.notes?.trim() || 'FRIDAY note')
      return { reply: 'Whiteboard note added.', navigateTo: '/whiteboard' }
    }

    case 'team_message': {
      const msg = action.message?.trim() || action.content?.trim()
      if (!msg) return { reply: 'Message text required.' }
      store.postSystemMessage(`${store.profile?.name ?? 'FRIDAY'}: ${msg}`)
      return { reply: 'Posted to team chat.', navigateTo: undefined }
    }

    case 'navigate': {
      const route = action.page?.startsWith('/')
        ? action.page
        : NAV_MAP[action.page?.toLowerCase() ?? ''] ?? '/'
      return { reply: `Opening ${action.page ?? route}…`, navigateTo: route }
    }

    case 'search':
      return {
        reply: runSearch(store, action.query ?? action.company ?? '', action.scope)
      }

    case 'get_client': {
      const clientId = resolveClientId(store, action.client_id ?? action.company ?? action.client)
      if (!clientId) return { reply: `No client matching "${action.company ?? action.client}".` }
      store.setActiveClient(clientId)
      return {
        reply: formatClientDetail(store, clientId),
        navigateTo: '/clients'
      }
    }

    case 'query_stats': {
      const firstName = getFirstName(store.profile)
      const mrr = store.getTotalMRR()
      const clients = store.getActiveClientCount()
      const spend = store.getTotalAdSpend()
      const leads = store.leads.length
      const scraped = store.scrapedLeads.length
      const openTasks = store.tasks.filter((t) => t.status !== 'done').length
      const hrsMonth = store.getAgencyHoursThisMonth()
      const billing = store.getUpcomingBillingReminders(14)

      return {
        reply: fridayStatsReply(firstName, [
          `MRR is ${formatCompactCurrency(mrr)}`,
          `${clients} active clients out of ${store.getTotalClientCount()}`,
          `${formatCompactCurrency(spend)} in ad spend under management`,
          `${hrsMonth} agency hours logged this month`,
          `${leads} pipeline leads and ${scraped} on the lead sheet`,
          `${openTasks} open tasks`,
          billing.length
            ? `billing coming up for ${billing.slice(0, 3).map((b) => b.company).join(', ')}`
            : `nothing billing in the next two weeks`
        ])
      }
    }

    default:
      return {
        reply:
          'Try: add lead, create task, move lead to won, log 2 hours for Acme, search dental, get client Acme, what is our MRR'
      }
  }
}

export async function executeEbonicsActions(
  store: GieoStore,
  actions: EbonicsAction[]
): Promise<ExecuteResult> {
  const replies: string[] = []
  let navigateTo: string | undefined

  for (const action of actions) {
    if (action.action === 'none') continue
    const result = await executeEbonicsAction(store, action)
    replies.push(result.reply)
    if (result.navigateTo) navigateTo = result.navigateTo
  }

  return {
    reply: humanizeFridayReply(replies.join('\n\n'), getFirstName(store.profile)),
    navigateTo
  }
}

export function looksLikeAgentCommand(message: string): boolean {
  const m = message.trim()
  if (tryLocalAction(m)) return true
  return /\b(friday|add lead|create task|assign|update client|move lead|log hours|search|find|go to|navigate|what('s| is)|show me|list|convert)\b/i.test(
    m
  )
}
