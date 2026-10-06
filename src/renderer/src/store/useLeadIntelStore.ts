import { create } from 'zustand'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/store/useStore'
import { parseLeadSheetCsv } from '@/lib/googleSheet'
import type { BusinessId } from '@/lib/types'
import {
  estimatedDealCents,
  pipelineLeadIds,
  leadToAiInput,
  profilePayload,
  LEAD_PROFILES,
  type CallScriptRecord,
  type CallScriptTone,
  type CallScriptType,
  type GeneratedCallScript,
  type IntelLead,
  type IntelLeadStatus,
  type LeadAnalysis,
  type ScrapedLeadResult,
  type ScrapeProgressEvent,
  type ScrapeSource,
  type ScraperJob
} from '@/lib/leadIntel'
import { scriptToText, emailToText } from '@/lib/leadIntel'

const db = supabase as unknown as SupabaseClient
const SETTINGS_KEY = 'gieo_lead_intel_settings'
const MIGRATION_HINT = 'Lead Intelligence tables are missing — run supabase/migration-v9.sql in Supabase.'

export interface LeadIntelSettings {
  showBrowser: boolean
  defaultMaxResults: number
  callerName: string
  companyName: Record<BusinessId, string>
  offering: Record<BusinessId, string>
}

export interface ActiveScrape {
  jobId: string
  business: BusinessId
  source: ScrapeSource
  query: string
  maxResults: number
  status: ScrapeProgressEvent['status']
  phase: string
  progress: number
  totalFound: number
  saved: number
  duplicates: number
  feed: IntelLead[]
  error?: string
  errors: string[]
}

export interface BatchState {
  running: boolean
  business: BusinessId
  total: number
  done: number
  failed: number
  currentName: string | null
  message: string | null
  error: string | null
}

interface LeadIntelState {
  leads: IntelLead[]
  jobs: ScraperJob[]
  scripts: Record<string, CallScriptRecord[]>
  loading: boolean
  loaded: boolean
  error: string | null
  activeScrape: ActiveScrape | null
  batch: BatchState | null
  analyzingIds: string[]
  settings: LeadIntelSettings

  fetchLeads: () => Promise<void>
  fetchJobs: () => Promise<void>
  subscribeRealtime: () => () => void
  startScrape: (input: {
    source: Exclude<ScrapeSource, 'sheet' | 'manual'>
    query: string
    location?: string
    maxResults: number
    urls?: string[]
  }) => Promise<{ error?: string }>
  cancelScrape: () => void
  dismissScrape: () => void
  handleScrapeEvent: (event: ScrapeProgressEvent) => void
  addManualLead: (input: Partial<IntelLead> & { business_name: string }) => Promise<{ error?: string }>
  importFromSheet: () => Promise<{ imported: number; error?: string }>
  updateLead: (id: string, patch: Partial<IntelLead>) => Promise<{ error?: string }>
  bulkUpdateStatus: (ids: string[], status: IntelLeadStatus) => Promise<void>
  deleteLeads: (ids: string[]) => Promise<void>
  reverifyLead: (id: string) => Promise<{ error?: string }>
  analyzeLead: (id: string) => Promise<{ error?: string; errorCode?: string }>
  runBatch: (ids?: string[]) => Promise<void>
  cancelBatch: () => void
  dismissBatch: () => void
  generateScript: (
    id: string,
    opts: { scriptType: CallScriptType; tone: CallScriptTone; offering: string; companyName: string }
  ) => Promise<{ data?: GeneratedCallScript; error?: string }>
  saveScript: (
    leadId: string,
    script: GeneratedCallScript,
    opts: { scriptType: CallScriptType; tone: CallScriptTone }
  ) => Promise<{ error?: string }>
  fetchScripts: (leadId: string) => Promise<void>
  convertToClient: (id: string, mrrCents: number) => Promise<{ error?: string }>
  addToPipeline: (ids: string[]) => Promise<{ added: number; error?: string }>
  updateSettings: (patch: Partial<LeadIntelSettings>) => void
}

function loadSettings(): LeadIntelSettings {
  const defaults: LeadIntelSettings = {
    showBrowser: false,
    defaultMaxResults: 25,
    callerName: '',
    companyName: { gieo: 'GIEO', python: 'Python' },
    offering: { gieo: LEAD_PROFILES.gieo.defaultOffering, python: LEAD_PROFILES.python.defaultOffering }
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<LeadIntelSettings>
    return {
      ...defaults,
      ...parsed,
      companyName: { ...defaults.companyName, ...parsed.companyName },
      offering: { ...defaults.offering, ...parsed.offering }
    }
  } catch {
    return defaults
  }
}

function friendlyDbError(message: string): string {
  return /intel_leads|scraper_jobs|call_scripts|schema cache|does not exist/i.test(message) ? MIGRATION_HINT : message
}

function normName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function hostOf(url: string | null | undefined): string {
  if (!url) return ''
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function dedupeKeys(l: { business_name: string; phone?: string | null; website?: string | null }): string[] {
  const keys = [`n:${normName(l.business_name)}`]
  const digits = (l.phone ?? '').replace(/\D/g, '')
  if (digits.length >= 10) keys.push(`p:${digits.slice(-10)}`)
  const host = hostOf(l.website)
  if (host && !/facebook|instagram|yelp|google|linktr/.test(host)) keys.push(`w:${host}`)
  return keys
}

function isDuplicate(existing: IntelLead[], candidate: { business_name: string; phone?: string | null; website?: string | null }, business: BusinessId): boolean {
  const keys = new Set(dedupeKeys(candidate))
  return existing.some((l) => l.business === business && dedupeKeys(l).some((k) => keys.has(k)))
}

function rowFromScrape(r: ScrapedLeadResult, business: BusinessId, jobId: string | null, userId: string | null): Partial<IntelLead> {
  return {
    business,
    business_name: r.businessName,
    email: r.email ?? null,
    phone: r.phone ?? null,
    website: r.website ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    state: r.state ?? null,
    zip: r.zip ?? null,
    country: r.country ?? null,
    category: r.category ?? null,
    description: r.description ?? null,
    hours: r.hours ?? null,
    google_rating: r.rating ?? null,
    review_count: r.reviewCount ?? null,
    social_media: r.socialMedia,
    tech_stack: r.techStack,
    website_quality: r.websiteQuality,
    has_website: r.hasWebsite,
    verification: r.verification,
    status: 'new',
    source: r.source,
    tags: [],
    notes: r.sourceUrl ? `Source: ${r.sourceUrl}` : '',
    scraper_job_id: jobId,
    created_by: userId
  }
}

let cancelBatchFlag = false
let progressUnsub: (() => void) | null = null
const pendingInserts = new Set<Promise<unknown>>()

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export const useLeadIntelStore = create<LeadIntelState>((set, get) => ({
  leads: [],
  jobs: [],
  scripts: {},
  loading: false,
  loaded: false,
  error: null,
  activeScrape: null,
  batch: null,
  analyzingIds: [],
  settings: loadSettings(),

  fetchLeads: async () => {
    set({ loading: true })
    const { data, error } = await db
      .from('intel_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3000)
    if (error) {
      set({ loading: false, loaded: true, error: friendlyDbError(error.message) })
      return
    }
    set({ leads: (data ?? []) as IntelLead[], loading: false, loaded: true, error: null })
  },

  fetchJobs: async () => {
    const { data, error } = await db.from('scraper_jobs').select('*').order('started_at', { ascending: false }).limit(30)
    if (!error) set({ jobs: (data ?? []) as ScraperJob[] })
  },

  subscribeRealtime: () => {
    if (!progressUnsub && window.gieoLeads) {
      progressUnsub = window.gieoLeads.onScrapeProgress((e) => get().handleScrapeEvent(e))
    }
    const channel = db
      .channel('gieo-intel-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intel_leads' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id
          if (id) set({ leads: get().leads.filter((l) => l.id !== id) })
          return
        }
        const row = payload.new as IntelLead
        const exists = get().leads.some((l) => l.id === row.id)
        set({
          leads: exists ? get().leads.map((l) => (l.id === row.id ? { ...l, ...row } : l)) : [row, ...get().leads]
        })
      })
      .subscribe()
    return () => {
      void db.removeChannel(channel)
    }
  },

  startScrape: async (input) => {
    if (!window.gieoLeads) return { error: 'Scraper is only available in the desktop app.' }
    if (get().activeScrape?.status === 'running') return { error: 'A scrape is already running.' }
    const business = useStore.getState().activeBusiness
    const userId = useStore.getState().profile?.id ?? null
    const jobId = crypto.randomUUID()

    const { error } = await db.from('scraper_jobs').insert({
      id: jobId,
      business,
      source: input.source,
      query: input.source === 'website' ? `${input.urls?.length ?? 0} website(s)` : input.query,
      location: input.location || null,
      max_results: input.maxResults,
      status: 'running',
      created_by: userId
    })
    if (error) return { error: friendlyDbError(error.message) }

    if (!progressUnsub) progressUnsub = window.gieoLeads.onScrapeProgress((e) => get().handleScrapeEvent(e))

    set({
      activeScrape: {
        jobId,
        business,
        source: input.source,
        query: input.query,
        maxResults: input.maxResults,
        status: 'running',
        phase: 'Starting…',
        progress: 0,
        totalFound: 0,
        saved: 0,
        duplicates: 0,
        feed: [],
        errors: []
      }
    })

    await window.gieoLeads.startScrape({
      jobId,
      source: input.source,
      query: input.query,
      location: input.location,
      maxResults: input.maxResults,
      urls: input.urls,
      showBrowser: get().settings.showBrowser
    })
    return {}
  },

  cancelScrape: () => {
    const job = get().activeScrape
    if (!job || job.status !== 'running') return
    set({ activeScrape: { ...job, phase: 'Cancelling…' } })
    void window.gieoLeads?.cancelScrape(job.jobId)
  },

  dismissScrape: () => {
    if (get().activeScrape?.status !== 'running') set({ activeScrape: null })
  },

  handleScrapeEvent: (event) => {
    const job = get().activeScrape
    if (!job || job.jobId !== event.jobId) return

    if (event.lead) {
      const row = rowFromScrape(event.lead, job.business, job.jobId, useStore.getState().profile?.id ?? null)
      if (isDuplicate(get().leads, row as IntelLead, job.business)) {
        set({ activeScrape: { ...get().activeScrape!, duplicates: get().activeScrape!.duplicates + 1 } })
      } else {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const optimistic = { ...row, id, created_at: now, updated_at: now } as IntelLead
        const current = get().activeScrape!
        set({
          leads: [optimistic, ...get().leads],
          activeScrape: { ...current, saved: current.saved + 1, feed: [optimistic, ...current.feed].slice(0, 200) }
        })
        const insert: Promise<void> = Promise.resolve(db
          .from('intel_leads')
          .insert({ ...row, id })
          .then(({ error }) => {
            if (error) {
              const s = get().activeScrape
              set({
                leads: get().leads.filter((l) => l.id !== id),
                activeScrape: s ? { ...s, saved: s.saved - 1, errors: [...s.errors, `${row.business_name}: ${friendlyDbError(error.message)}`] } : s
              })
            }
          }))
        pendingInserts.add(insert)
        void insert.finally(() => pendingInserts.delete(insert))
      }
    }

    const latest = get().activeScrape!
    set({
      activeScrape: {
        ...latest,
        status: event.status,
        phase: event.phase,
        progress: event.progress,
        totalFound: event.totalFound,
        error: event.error,
        errors: event.errors?.length ? [...new Set([...latest.errors, ...event.errors])] : latest.errors
      }
    })

    if (event.status !== 'running') {
      void (async () => {
        await Promise.allSettled([...pendingInserts])
        const final = get().activeScrape
        await db
          .from('scraper_jobs')
          .update({
            status: event.status,
            progress: event.progress,
            total_found: final?.saved ?? event.totalFound,
            errors: [...(final?.errors ?? []), ...(event.error ? [event.error] : [])].slice(0, 50),
            completed_at: new Date().toISOString()
          })
          .eq('id', event.jobId)
        void get().fetchJobs()
        const profile = useStore.getState().profile
        if (final && final.saved > 0 && profile) {
          useStore
            .getState()
            .postSystemMessage(`${profile.name} scraped ${final.saved} new ${LEAD_PROFILES[final.business].name} leads (${final.query})`, false)
        }
      })()
    }
  },

  addManualLead: async (input) => {
    const business = useStore.getState().activeBusiness
    if (isDuplicate(get().leads, input, business)) return { error: 'That lead is already in your list.' }
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const row: Partial<IntelLead> = {
      business,
      source: 'manual',
      status: 'new',
      social_media: {},
      tech_stack: [],
      tags: [],
      notes: '',
      has_website: !!input.website,
      verification: {},
      ai_services_needed: [],
      ai_insights: {},
      created_by: useStore.getState().profile?.id ?? null,
      ...input,
      id
    }
    set({ leads: [{ ...row, created_at: now, updated_at: now } as IntelLead, ...get().leads] })
    const { error } = await db.from('intel_leads').insert(row)
    if (error) {
      set({ leads: get().leads.filter((l) => l.id !== id) })
      return { error: friendlyDbError(error.message) }
    }
    if (input.website || input.phone || input.email) void get().reverifyLead(id)
    return {}
  },

  importFromSheet: async () => {
    const result = await window.gieo?.fetchLeadSheet?.()
    if (!result?.success || !result.csv) return { imported: 0, error: result?.error ?? 'Could not reach the Google Sheet.' }
    const business = useStore.getState().activeBusiness
    const userId = useStore.getState().profile?.id ?? null
    const rows: Partial<IntelLead>[] = []
    const pool = [...get().leads]

    for (const r of parseLeadSheetCsv(result.csv)) {
      const name = r.company || r.name
      if (!name) continue
      const candidate = { business_name: name, phone: r.phone || null, website: null }
      if (isDuplicate(pool, candidate, business)) continue
      const row: Partial<IntelLead> = {
        id: crypto.randomUUID(),
        business,
        business_name: name,
        contact_name: r.company && r.name ? r.name : null,
        phone: r.phone || null,
        email: r.email || null,
        has_website: false,
        social_media: {},
        tech_stack: [],
        verification: {},
        ai_services_needed: [],
        ai_insights: {},
        status: 'new',
        source: 'sheet',
        tags: [],
        notes: r.notes || '',
        created_by: userId
      }
      rows.push(row)
      pool.push(row as IntelLead)
    }

    if (!rows.length) return { imported: 0 }
    const { error } = await db.from('intel_leads').insert(rows)
    if (error) return { imported: 0, error: friendlyDbError(error.message) }
    await get().fetchLeads()
    return { imported: rows.length }
  },

  updateLead: async (id, patch) => {
    const prev = get().leads.find((l) => l.id === id)
    if (!prev) return { error: 'Lead not found' }
    const updated_at = new Date().toISOString()
    set({ leads: get().leads.map((l) => (l.id === id ? { ...l, ...patch, updated_at } : l)) })
    const { error } = await db.from('intel_leads').update({ ...patch, updated_at }).eq('id', id)
    if (error) {
      set({ leads: get().leads.map((l) => (l.id === id ? prev : l)) })
      return { error: friendlyDbError(error.message) }
    }
    return {}
  },

  bulkUpdateStatus: async (ids, status) => {
    const idSet = new Set(ids)
    const updated_at = new Date().toISOString()
    set({ leads: get().leads.map((l) => (idSet.has(l.id) ? { ...l, status, updated_at } : l)) })
    await db.from('intel_leads').update({ status, updated_at }).in('id', ids)
  },

  deleteLeads: async (ids) => {
    const idSet = new Set(ids)
    const prev = get().leads
    set({ leads: prev.filter((l) => !idSet.has(l.id)) })
    const { error } = await db.from('intel_leads').delete().in('id', ids)
    if (error) set({ leads: prev })
  },

  reverifyLead: async (id) => {
    const lead = get().leads.find((l) => l.id === id)
    if (!lead || !window.gieoLeads) return { error: 'Unavailable' }
    const result = await window.gieoLeads.reverify({
      businessName: lead.business_name,
      phone: lead.phone ?? undefined,
      email: lead.email ?? undefined,
      website: lead.website ?? undefined,
      reviewCount: lead.review_count ?? undefined,
      rating: lead.google_rating ?? undefined
    })
    const patch: Partial<IntelLead> = { verification: result.verification }
    if (result.site) {
      patch.website_quality = result.site.reachable ? result.site.quality : 0
      patch.has_website = true
      patch.social_media = { ...result.site.socials, ...lead.social_media }
      if (result.site.tech.length) patch.tech_stack = result.site.tech
      if (!lead.email && result.site.emails[0]) patch.email = result.site.emails[0]
      if (!lead.phone && result.site.phones[0]) patch.phone = result.site.phones[0]
    }
    return get().updateLead(id, patch)
  },

  analyzeLead: async (id) => {
    const lead = get().leads.find((l) => l.id === id)
    if (!lead || !window.gieoLeads) return { error: 'AI is only available in the desktop app.' }
    set({ analyzingIds: [...get().analyzingIds, id] })
    try {
      const result = await window.gieoLeads.analyze(leadToAiInput(lead), profilePayload(lead.business))
      if (!result.data) return { error: result.error ?? 'AI request failed.', errorCode: result.errorCode }
      const a: LeadAnalysis = result.data
      const fresh = get().leads.find((l) => l.id === id) ?? lead

      const corrections: Record<string, string> = {}
      const patch: Partial<IntelLead> = {
        ai_summary: a.summary || null,
        ai_services_needed: a.services,
        ai_lead_score: a.score.total,
        ai_score_reasoning: a.score.reasoning || null,
        ai_verified: a.verification.verified,
        ai_analyzed_at: new Date().toISOString(),
        industry: fresh.industry || a.industry || null,
        employee_count: fresh.employee_count || a.employeeEstimate || null
      }
      const fieldMap: Record<string, keyof IntelLead> = {
        business_name: 'business_name',
        phone: 'phone',
        email: 'email',
        website: 'website',
        city: 'city',
        state: 'state',
        industry: 'industry'
      }
      for (const [key, value] of Object.entries(a.verification.corrections ?? {})) {
        const field = fieldMap[key]
        if (!field || !value) continue
        const before = (fresh[field] as string | null) ?? ''
        if (before.trim().toLowerCase() === value.trim().toLowerCase()) continue
        corrections[key] = before ? `${before} → ${value}` : `added ${value}`
        ;(patch as Record<string, unknown>)[field] = value
      }
      patch.ai_insights = {
        strengths: a.strengths,
        weaknesses: a.weaknesses,
        onlinePresenceScore: a.onlinePresenceScore,
        estimatedRevenue: a.estimatedRevenue,
        competitivePosition: a.competitivePosition,
        urgency: a.urgency,
        urgencyReason: a.urgencyReason,
        scoreBreakdown: {
          budget: a.score.budget,
          need: a.score.need,
          accessibility: a.score.accessibility,
          timing: a.score.timing,
          fit: a.score.fit
        },
        aiConfidence: a.verification.confidence,
        aiFlags: a.verification.flags,
        aiCorrections: corrections
      }
      if (fresh.status === 'new') patch.status = a.verification.verified ? 'verified' : 'new'
      if (!a.verification.verified && !fresh.tags.includes('flagged')) patch.tags = [...fresh.tags, 'flagged']
      const saved = await get().updateLead(id, patch)
      return saved
    } finally {
      set({ analyzingIds: get().analyzingIds.filter((x) => x !== id) })
    }
  },

  runBatch: async (ids) => {
    if (get().batch?.running) return
    const business = useStore.getState().activeBusiness
    const queue = (ids ?? get().leads.filter((l) => l.business === business && !l.ai_analyzed_at && l.status !== 'dead').map((l) => l.id)).slice()
    cancelBatchFlag = false
    set({
      batch: { running: true, business, total: queue.length, done: 0, failed: 0, currentName: null, message: queue.length ? null : 'Every lead is already analyzed.', error: null }
    })
    if (!queue.length) {
      set({ batch: { ...get().batch!, running: false } })
      return
    }

    for (let i = 0; i < queue.length; i++) {
      if (cancelBatchFlag) break
      const lead = get().leads.find((l) => l.id === queue[i])
      if (!lead) continue
      set({ batch: { ...get().batch!, currentName: lead.business_name, message: `Analyzing lead ${i + 1} of ${queue.length}…` } })

      let attempts = 0
      while (!cancelBatchFlag) {
        const result = await get().analyzeLead(lead.id)
        if (!result.error) {
          set({ batch: { ...get().batch!, done: get().batch!.done + 1 } })
          break
        }
        if (result.errorCode === 'RATE_LIMIT' && attempts < 6) {
          attempts++
          set({ batch: { ...get().batch!, message: 'Pacing for the free AI limit — resuming shortly…' } })
          await sleep(12_000)
          continue
        }
        if (['DAILY_LIMIT', 'INSUFFICIENT_TOKENS', 'THROTTLED', 'AUTH_FAILED', 'CLOUD_OFFLINE'].includes(result.errorCode ?? '')) {
          set({ batch: { ...get().batch!, running: false, currentName: null, error: result.error ?? 'AI unavailable', message: `Stopped after ${get().batch!.done} of ${queue.length}.` } })
          return
        }
        set({ batch: { ...get().batch!, failed: get().batch!.failed + 1 } })
        break
      }
      if (!cancelBatchFlag && i < queue.length - 1) await sleep(2500)
    }

    const b = get().batch!
    set({
      batch: {
        ...b,
        running: false,
        currentName: null,
        message: cancelBatchFlag ? `Cancelled — analyzed ${b.done} of ${b.total}.` : `Done — analyzed ${b.done} of ${b.total}${b.failed ? ` (${b.failed} failed)` : ''}.`
      }
    })
  },

  cancelBatch: () => {
    cancelBatchFlag = true
    const b = get().batch
    if (b?.running) set({ batch: { ...b, message: 'Cancelling after the current lead…' } })
  },

  dismissBatch: () => {
    if (!get().batch?.running) set({ batch: null })
  },

  generateScript: async (id, opts) => {
    const lead = get().leads.find((l) => l.id === id)
    if (!lead || !window.gieoLeads) return { error: 'AI is only available in the desktop app.' }
    const callerName = get().settings.callerName || useStore.getState().profile?.name || 'me'
    const analysis = lead.ai_analyzed_at
      ? {
          summary: lead.ai_summary,
          services: lead.ai_services_needed.map((s) => ({ name: s.name, reason: s.reason, pitchAngle: s.pitchAngle })),
          weaknesses: lead.ai_insights.weaknesses
        }
      : null
    const result = await window.gieoLeads.callScript(leadToAiInput(lead), profilePayload(lead.business), analysis, { ...opts, callerName })
    return result.data ? { data: result.data } : { error: result.error ?? 'Script generation failed.' }
  },

  saveScript: async (leadId, script, opts) => {
    const lead = get().leads.find((l) => l.id === leadId)
    if (!lead) return { error: 'Lead not found' }
    const row: CallScriptRecord = {
      id: crypto.randomUUID(),
      lead_id: leadId,
      business: lead.business,
      title: script.title,
      script_type: opts.scriptType,
      tone: opts.tone,
      script: scriptToText(script),
      talking_points: script.talkingPoints,
      objection_handlers: script.objections,
      voicemail_script: script.voicemail,
      follow_up_email: emailToText(script.followUpEmail),
      created_by: useStore.getState().profile?.id ?? null,
      created_at: new Date().toISOString()
    }
    const { error } = await db.from('call_scripts').insert(row)
    if (error) return { error: friendlyDbError(error.message) }
    set({ scripts: { ...get().scripts, [leadId]: [row, ...(get().scripts[leadId] ?? [])] } })
    return {}
  },

  fetchScripts: async (leadId) => {
    const { data, error } = await db.from('call_scripts').select('*').eq('lead_id', leadId).order('created_at', { ascending: false })
    if (!error) set({ scripts: { ...get().scripts, [leadId]: (data ?? []) as CallScriptRecord[] } })
  },

  convertToClient: async (id, mrrCents) => {
    const lead = get().leads.find((l) => l.id === id)
    if (!lead) return { error: 'Lead not found' }
    const result = await useStore.getState().addClient({
      company: lead.business_name,
      name: lead.contact_name || lead.business_name,
      mrr: mrrCents,
      email: lead.email ?? undefined,
      phone: lead.phone ?? undefined,
      services: lead.ai_services_needed.filter((s) => s.priority === 'high').map((s) => s.name),
      business: lead.business,
      leadId:
        useStore
          .getState()
          .leads.find(
            (l) =>
              l.id === lead.id ||
              ((l.business ?? 'gieo') === lead.business &&
                l.company.trim().toLowerCase() === lead.business_name.trim().toLowerCase())
          )?.id ?? lead.id
    })
    if (result.error) return { error: result.error }
    return get().updateLead(id, { status: 'converted' })
  },

  // The pipeline lead reuses the intel lead's id, so adding the same lead twice is a no-op.
  addToPipeline: async (ids) => {
    const app = useStore.getState()
    const existing = pipelineLeadIds(get().leads, app.leads)
    const toAdd = get().leads.filter((l) => ids.includes(l.id) && !existing.has(l.id))
    let added = 0
    for (const lead of toAdd) {
      const id = await app.addPipelineLead({
        id: lead.id,
        name: lead.contact_name || lead.business_name,
        company: lead.business_name,
        mrr: estimatedDealCents(lead),
        business: lead.business
      })
      if (id) added++
    }
    if (added > 0) {
      const actor = app.profile?.name ?? 'Someone'
      const label = added === 1 ? toAdd[0].business_name : `${added} leads`
      app.postSystemMessage(`${actor} added ${label} to the CRM pipeline`)
    }
    if (added < toAdd.length) return { added, error: "Some leads couldn't be added to the pipeline. Check your connection." }
    return { added }
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch }
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    set({ settings })
  }
}))
