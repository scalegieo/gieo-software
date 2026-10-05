import { useEffect, useState } from 'react'
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Pencil,
  Save,
  FileText,
  UserPlus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Target,
  Wand2,
  ChevronDown,
  KanbanSquare
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useLeadIntelStore } from '@/store/useLeadIntelStore'
import {
  INTEL_STATUSES,
  LEAD_PROFILES,
  SOURCE_LABELS,
  pipelineLeadIds,
  scoreGrade,
  type IntelLead,
  type IntelLeadStatus,
  type LeadVerification
} from '@/lib/leadIntel'
import { NativeSelect, FieldLabel, ScoreBadge, LeadScoreGauge, ErrorNote } from '@/components/LeadIntelControls'
import { CallScriptDialog } from '@/components/CallScriptDialog'

const EDITABLE: { key: keyof IntelLead; label: string; wide?: boolean }[] = [
  { key: 'business_name', label: 'Business name', wide: true },
  { key: 'contact_name', label: 'Contact name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'address', label: 'Address', wide: true },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'zip', label: 'Zip' },
  { key: 'industry', label: 'Industry' },
  { key: 'category', label: 'Category' },
  { key: 'employee_count', label: 'Employees' },
  { key: 'hours', label: 'Hours', wide: true },
  { key: 'description', label: 'Description', wide: true }
]

const PRIORITY_VARIANT = { high: 'destructive', medium: 'warning', low: 'secondary' } as const
const URGENCY_VARIANT = { high: 'destructive', medium: 'warning', low: 'secondary' } as const

function Section({
  title,
  icon: Icon,
  action,
  children
}: {
  title: string
  icon: typeof Sparkles
  action?: React.ReactNode
  children: React.ReactNode
}): JSX.Element {
  return (
    <Card className="bg-zinc-900/60 border-zinc-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-violet-400" />
          {title}
        </p>
        {action}
      </div>
      {children}
    </Card>
  )
}

function ScoreBar({ label, value, max = 20 }: { label: string; value: number; max?: number }): JSX.Element {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-zinc-400">{label}</span>
        <span className="tabular-nums text-zinc-300">{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full', pct >= 75 ? 'bg-sky-400' : pct >= 55 ? 'bg-emerald-400' : pct >= 35 ? 'bg-amber-400' : 'bg-red-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function AiButton({
  busy,
  onClick,
  children,
  icon: Icon = Sparkles,
  variant = 'secondary'
}: {
  busy: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: typeof Sparkles
  variant?: 'secondary' | 'default' | 'outline'
}): JSX.Element {
  return (
    <Button size="sm" variant={variant} className="h-7 gap-1.5 text-xs" disabled={busy} onClick={onClick}>
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
      {children}
    </Button>
  )
}

export function LeadIntelDetail({ leadId, onClose }: { leadId: string; onClose: () => void }): JSX.Element | null {
  const {
    leads,
    updateLead,
    analyzeLead,
    reverifyLead,
    analyzingIds,
    deleteLeads,
    convertToClient,
    addToPipeline,
    scripts,
    fetchScripts
  } = useLeadIntelStore()
  const lead = leads.find((l) => l.id === leadId)
  const inPipeline = useStore((s) => (lead ? pipelineLeadIds([lead], s.leads).has(lead.id) : false))
  const [addingToPipeline, setAddingToPipeline] = useState(false)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<IntelLead>>({})
  const [notes, setNotes] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [aiError, setAiError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [scriptOpen, setScriptOpen] = useState(false)
  const [convertOpen, setConvertOpen] = useState(false)
  const [mrr, setMrr] = useState('2000')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [openScript, setOpenScript] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    setNotes(lead?.notes ?? '')
    setEditing(false)
    setAiError(null)
    setSaveError(null)
    void fetchScripts(leadId)
  }, [leadId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !scriptOpen && !convertOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, scriptOpen, convertOpen])

  if (!lead) return null

  const profile = LEAD_PROFILES[lead.business]
  const v = lead.verification as LeadVerification
  const insights = lead.ai_insights ?? {}
  const analyzing = analyzingIds.includes(lead.id)
  const breakdown = insights.scoreBreakdown
  const leadScripts = scripts[lead.id] ?? []

  const runAnalysis = async (withChecks: boolean): Promise<void> => {
    setAiError(null)
    if (withChecks && (lead.website || lead.email || lead.phone)) {
      setChecking(true)
      await reverifyLead(lead.id)
      setChecking(false)
    }
    const result = await analyzeLead(lead.id)
    if (result.error) setAiError(result.error)
  }

  const saveEdits = async (): Promise<void> => {
    const clean = Object.fromEntries(
      Object.entries(draft).map(([k, val]) => [k, typeof val === 'string' ? val.trim() || null : val])
    ) as Partial<IntelLead>
    if (clean.business_name === null) return setSaveError('Business name is required.')
    const websiteChanged = clean.website !== undefined && clean.website !== lead.website
    const result = await updateLead(lead.id, { ...clean, has_website: clean.website !== undefined ? !!clean.website : lead.has_website })
    if (result.error) return setSaveError(result.error)
    setEditing(false)
    setDraft({})
    setSaveError(null)
    if (websiteChanged || clean.email !== undefined || clean.phone !== undefined) void reverifyLead(lead.id)
  }

  const addTag = (): void => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || lead.tags.includes(tag)) return setTagInput('')
    void updateLead(lead.id, { tags: [...lead.tags, tag] })
    setTagInput('')
  }

  const copy = async (key: string, text: string): Promise<void> => {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 animate-in fade-in duration-200" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(900px,96vw)] flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {lead.ai_verified === true && <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />}
              {lead.ai_verified === false && <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />}
              <h2 className="text-lg font-semibold truncate">{lead.business_name}</h2>
              <ScoreBadge score={lead.ai_lead_score} />
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {profile.name} lead · {SOURCE_LABELS[lead.source]} · added {formatRelativeTime(lead.created_at)}
              {lead.ai_analyzed_at && ` · analyzed ${formatRelativeTime(lead.ai_analyzed_at)}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NativeSelect
              value={lead.status}
              onChange={(e) => void updateLead(lead.id, { status: e.target.value as IntelLeadStatus })}
              className="h-8 text-xs"
            >
              {INTEL_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </NativeSelect>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-zinc-800 px-5 py-2.5">
          <AiButton busy={analyzing || checking} onClick={() => void runAnalysis(true)} icon={ShieldCheck}>
            Verify with AI
          </AiButton>
          <AiButton busy={analyzing} onClick={() => void runAnalysis(false)}>
            Analyze with AI
          </AiButton>
          <Button size="sm" className="h-7 gap-1.5 text-xs" onClick={() => setScriptOpen(true)}>
            <FileText className="h-3 w-3" />
            Generate Call Script
          </Button>
          <div className="ml-auto flex gap-2">
            {inPipeline ? (
              <Button asChild size="sm" variant="outline" className="h-7 gap-1.5 text-xs border-emerald-500/40 text-emerald-300">
                <Link to="/crm">
                  <Check className="h-3 w-3" />
                  In pipeline
                </Link>
              </Button>
            ) : (
              <AiButton
                busy={addingToPipeline}
                variant="outline"
                icon={KanbanSquare}
                onClick={async () => {
                  setAddingToPipeline(true)
                  const result = await addToPipeline([lead.id])
                  setAddingToPipeline(false)
                  setAiError(result.error ?? null)
                }}
              >
                Add to Pipeline
              </AiButton>
            )}
            {lead.status !== 'converted' && (
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => setConvertOpen(true)}>
                <UserPlus className="h-3 w-3" />
                Convert to client
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="h-7 gap-1.5 text-xs"
              onClick={() => {
                if (confirm(`Delete ${lead.business_name}?`)) {
                  void deleteLeads([lead.id])
                  onClose()
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-4 p-5">
            {aiError && <ErrorNote>{aiError}</ErrorNote>}
            {analyzing && (
              <div className="flex items-center gap-2 rounded-md border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {checking ? 'Re-running website, email and phone checks…' : 'AI is verifying, summarizing, matching services and scoring this lead…'}
              </div>
            )}

            {/* Section 1: Business info */}
            <Section
              title="Business Info"
              icon={MapPin}
              action={
                editing ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditing(false); setDraft({}); setSaveError(null) }}>
                      Cancel
                    </Button>
                    <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => void saveEdits()}>
                      <Save className="h-3 w-3" />
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setEditing(true)}>
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                )
              }
            >
              {saveError && <ErrorNote>{saveError}</ErrorNote>}
              {editing ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {EDITABLE.map((f) => (
                    <div key={f.key} className={cn('space-y-1', f.wide && 'col-span-2')}>
                      <FieldLabel>{f.label}</FieldLabel>
                      <Input
                        value={(draft[f.key] as string | undefined) ?? ((lead[f.key] as string | null) ?? '')}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
                  {lead.contact_name && <p className="text-zinc-300">{lead.contact_name}</p>}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-zinc-200 hover:text-white">
                      <Phone className="h-3.5 w-3.5 text-zinc-500" />{lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-zinc-200 hover:text-white truncate">
                      <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />{lead.email}
                    </a>
                  )}
                  {lead.website && (
                    <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sky-300 hover:text-sky-200 truncate">
                      <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />{lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </a>
                  )}
                  {lead.address && (
                    <p className="flex items-center gap-2 text-zinc-400 sm:col-span-2">
                      <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />{lead.address}
                    </p>
                  )}
                  {lead.google_rating != null && (
                    <p className="flex items-center gap-2 text-zinc-300">
                      <Star className="h-3.5 w-3.5 text-amber-400" />{lead.google_rating}★ · {lead.review_count ?? 0} reviews
                    </p>
                  )}
                  {(lead.industry || lead.category) && (
                    <p className="text-zinc-400">{[lead.industry, lead.category].filter(Boolean).join(' · ')}</p>
                  )}
                  {lead.employee_count && <p className="text-zinc-400">{lead.employee_count} employees</p>}
                  {lead.hours && <p className="text-[11px] text-zinc-500 sm:col-span-2">{lead.hours}</p>}
                  {lead.description && <p className="text-xs text-zinc-400 sm:col-span-2">{lead.description}</p>}
                  {!lead.phone && !lead.email && !lead.website && (
                    <p className="text-xs text-zinc-500 sm:col-span-2">No contact details yet — click Edit to add them.</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(lead.social_media ?? {}).map(([k, url]) => (
                  <a key={k} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] capitalize text-zinc-300 hover:bg-zinc-800">
                    {k}
                  </a>
                ))}
                {lead.tech_stack.map((t) => (
                  <span key={t} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{t}</span>
                ))}
                {lead.website_quality != null && (
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300">Website quality {lead.website_quality}/100</span>
                )}
                {!lead.has_website && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-300">No website</span>}
              </div>

              <div className="space-y-1.5 pt-1">
                <FieldLabel>Tags</FieldLabel>
                <div className="flex flex-wrap items-center gap-1.5">
                  {lead.tags.map((t) => (
                    <span key={t} className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]', t === 'flagged' ? 'bg-red-500/15 text-red-300' : 'bg-violet-500/15 text-violet-200')}>
                      {t}
                      <button type="button" onClick={() => void updateLead(lead.id, { tags: lead.tags.filter((x) => x !== t) })} className="opacity-60 hover:opacity-100">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    onBlur={addTag}
                    placeholder="Add tag…"
                    className="h-7 w-28 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Notes</FieldLabel>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => notes !== lead.notes && void updateLead(lead.id, { notes })}
                  rows={3}
                  placeholder="Call notes, decision maker, next steps…"
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                />
              </div>
            </Section>

            {/* Section 2: Verification */}
            <Section
              title="AI Verification"
              icon={ShieldCheck}
              action={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  disabled={checking}
                  onClick={async () => {
                    setChecking(true)
                    await reverifyLead(lead.id)
                    setChecking(false)
                  }}
                >
                  <RefreshCw className={cn('h-3 w-3', checking && 'animate-spin')} />
                  Re-run checks
                </Button>
              }
            >
              {lead.ai_verified != null ? (
                <div
                  className={cn(
                    'rounded-md border px-3 py-2.5',
                    lead.ai_verified ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'
                  )}
                >
                  <p className={cn('text-sm font-medium', lead.ai_verified ? 'text-emerald-300' : 'text-red-300')}>
                    {lead.ai_verified ? '✅ Verified' : '⚠️ Flagged'}
                    {insights.aiConfidence != null && <span className="font-normal text-zinc-400"> · {insights.aiConfidence}% confidence</span>}
                  </p>
                  {!!insights.aiFlags?.length && (
                    <ul className="mt-1.5 space-y-0.5 text-xs text-zinc-300 list-disc pl-4">
                      {insights.aiFlags.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  )}
                  {insights.aiCorrections && Object.keys(insights.aiCorrections).length > 0 && (
                    <div className="mt-2 text-xs text-zinc-400">
                      <p className="text-zinc-300 font-medium">Auto-corrected:</p>
                      {Object.entries(insights.aiCorrections).map(([k, val]) => (
                        <p key={k}><span className="capitalize">{k.replace('_', ' ')}</span>: {val}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  Not AI-verified yet. Click <span className="text-zinc-300">Verify with AI</span> to check if this is a real, active business and fix bad data.
                </p>
              )}

              {v?.checks?.length ? (
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {v.checks.map((c) => (
                    <div key={c.key} className="flex items-start gap-2 rounded-md bg-zinc-950/60 px-2.5 py-1.5">
                      {c.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-zinc-600 mt-0.5 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-200">{c.label}</p>
                        <p className="text-[10px] text-zinc-500 truncate" title={c.detail}>{c.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No automated checks yet — click Re-run checks.</p>
              )}
              {!!v?.qualityNotes?.length && (
                <details className="text-[11px] text-zinc-500">
                  <summary className="cursor-pointer">Website audit ({lead.website_quality}/100)</summary>
                  <ul className="mt-1 grid sm:grid-cols-2 gap-x-4">
                    {v.qualityNotes.map((n) => <li key={n} className={n.startsWith('✓') ? 'text-emerald-400/80' : 'text-zinc-500'}>{n}</li>)}
                  </ul>
                </details>
              )}
            </Section>

            {/* Section 3: Intelligence */}
            <Section
              title="AI Summary & Intelligence"
              icon={Sparkles}
              action={!lead.ai_analyzed_at && <AiButton busy={analyzing} onClick={() => void runAnalysis(false)}>Analyze with AI</AiButton>}
            >
              {lead.ai_summary ? (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-200 leading-relaxed">{lead.ai_summary}</p>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <div className="rounded-md bg-zinc-950/60 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Online presence</p>
                      <p className="text-lg font-semibold tabular-nums">{insights.onlinePresenceScore ?? '—'}<span className="text-xs text-zinc-500">/10</span></p>
                    </div>
                    <div className="rounded-md bg-zinc-950/60 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Est. revenue</p>
                      <p className="text-sm font-medium mt-1">{insights.estimatedRevenue ?? '—'}</p>
                    </div>
                    <div className="rounded-md bg-zinc-950/60 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Urgency</p>
                      {insights.urgency ? (
                        <Badge variant={URGENCY_VARIANT[insights.urgency]} className="mt-1 capitalize text-[10px]">{insights.urgency}</Badge>
                      ) : '—'}
                    </div>
                    <div className="rounded-md bg-zinc-950/60 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-zinc-500">Employees</p>
                      <p className="text-sm font-medium mt-1">{lead.employee_count ?? '—'}</p>
                    </div>
                  </div>
                  {insights.urgencyReason && <p className="text-xs text-zinc-400"><span className="text-zinc-300">Why now: </span>{insights.urgencyReason}</p>}
                  {insights.competitivePosition && <p className="text-xs text-zinc-400"><span className="text-zinc-300">Competitive position: </span>{insights.competitivePosition}</p>}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-emerald-300 flex items-center gap-1 mb-1"><TrendingUp className="h-3 w-3" />Strengths</p>
                      <ul className="space-y-0.5 text-xs text-zinc-400 list-disc pl-4">
                        {(insights.strengths ?? []).map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-red-300 flex items-center gap-1 mb-1"><TrendingDown className="h-3 w-3" />Weaknesses</p>
                      <ul className="space-y-0.5 text-xs text-zinc-400 list-disc pl-4">
                        {(insights.weaknesses ?? []).map((s) => <li key={s}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  AI will write a short summary, strengths and weaknesses, online presence score, revenue estimate, competitive position and urgency.
                </p>
              )}
            </Section>

            {/* Section 4: Services */}
            <Section title={`${profile.name} Services They Need`} icon={Target}>
              {lead.ai_services_needed.length ? (
                <div className="space-y-2">
                  {lead.ai_services_needed.map((s) => (
                    <div key={s.name} className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{s.name}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.estimatedValue && <span className="text-xs tabular-nums text-emerald-300">{s.estimatedValue}</span>}
                          <Badge variant={PRIORITY_VARIANT[s.priority]} className="capitalize text-[10px]">{s.priority}</Badge>
                        </div>
                      </div>
                      {s.reason && <p className="text-xs text-zinc-400">{s.reason}</p>}
                      {s.pitchAngle && (
                        <p className="text-xs text-violet-200/90 flex gap-1.5">
                          <Wand2 className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{s.pitchAngle}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  Run AI to see exactly which {profile.name} services to pitch — with priority, reasoning, contract value and a pitch angle.
                </p>
              )}
            </Section>

            {/* Section 5: Score */}
            <Section title="Lead Score" icon={TrendingUp}>
              <div className="grid gap-5 sm:grid-cols-[200px_1fr] items-center">
                <div className="flex flex-col items-center">
                  <LeadScoreGauge score={lead.ai_lead_score} />
                  {lead.ai_lead_score != null && (
                    <span className="mt-1 text-4xl font-black text-zinc-200">{scoreGrade(lead.ai_lead_score)}</span>
                  )}
                </div>
                {breakdown ? (
                  <div className="space-y-2.5">
                    <ScoreBar label="Budget potential" value={breakdown.budget} />
                    <ScoreBar label="Need level" value={breakdown.need} />
                    <ScoreBar label="Accessibility" value={breakdown.accessibility} />
                    <ScoreBar label="Timing" value={breakdown.timing} />
                    <ScoreBar label={`Fit for ${profile.name}`} value={breakdown.fit} />
                    {lead.ai_score_reasoning && <p className="text-xs text-zinc-400 pt-1">{lead.ai_score_reasoning}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">The score (1–100) and its breakdown appear after AI analysis.</p>
                )}
              </div>
            </Section>

            {/* Saved scripts */}
            <Section title={`Saved Call Scripts (${leadScripts.length})`} icon={FileText}>
              {leadScripts.length ? (
                <div className="space-y-2">
                  {leadScripts.map((s) => (
                    <div key={s.id} className="rounded-md border border-zinc-800 bg-zinc-950/60">
                      <button
                        type="button"
                        onClick={() => setOpenScript(openScript === s.id ? null : s.id)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left"
                      >
                        <span className="text-sm">{s.title}</span>
                        <span className="flex items-center gap-2 text-[11px] text-zinc-500">
                          <span className="capitalize">{s.tone}</span> · {formatRelativeTime(s.created_at)}
                          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openScript === s.id && 'rotate-180')} />
                        </span>
                      </button>
                      {openScript === s.id && (
                        <div className="border-t border-zinc-800 px-3 py-2.5 space-y-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => void copy(`s-${s.id}`, s.script)}>
                              {copied === `s-${s.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              Copy script
                            </Button>
                            {s.follow_up_email && (
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => void copy(`e-${s.id}`, s.follow_up_email!)}>
                                {copied === `e-${s.id}` ? <Check className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                                Copy email
                              </Button>
                            )}
                          </div>
                          <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-300 leading-relaxed max-h-80 overflow-y-auto">{s.script}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">No scripts yet — click Generate Call Script.</p>
              )}
            </Section>
          </div>
        </ScrollArea>
      </aside>

      <CallScriptDialog lead={lead} open={scriptOpen} onOpenChange={setScriptOpen} />

      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Convert to {profile.name} client</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <FieldLabel>Monthly retainer ($)</FieldLabel>
              <Input type="number" value={mrr} onChange={(e) => setMrr(e.target.value)} />
            </div>
            {saveError && <ErrorNote>{saveError}</ErrorNote>}
            <Button
              className="w-full gap-1"
              onClick={async () => {
                const result = await convertToClient(lead.id, Math.round(parseFloat(mrr || '0') * 100))
                if (result.error) setSaveError(result.error)
                else setConvertOpen(false)
              }}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Create client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
