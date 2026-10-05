import { useMemo, useState } from 'react'
import { Search, Download, Trash2, Sparkles, Phone, Mail, ShieldCheck, ShieldAlert, Shield, Users, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useLeadIntelStore } from '@/store/useLeadIntelStore'
import {
  INTEL_STATUSES,
  SOURCE_LABELS,
  leadsToCsv,
  verificationState,
  type IntelLead,
  type IntelLeadStatus,
  type ScrapeSource
} from '@/lib/leadIntel'
import { NativeSelect, ScoreBadge, EmptyState } from '@/components/LeadIntelControls'

type SortKey = 'date' | 'score' | 'name'
type ScoreRange = 'all' | 'a' | 'b' | 'c' | 'low' | 'none'

const SCORE_RANGES: { id: ScoreRange; label: string; test: (s: number | null) => boolean }[] = [
  { id: 'all', label: 'Any score', test: () => true },
  { id: 'a', label: 'A (85+)', test: (s) => s != null && s >= 85 },
  { id: 'b', label: 'B (70–84)', test: (s) => s != null && s >= 70 && s < 85 },
  { id: 'c', label: 'C (55–69)', test: (s) => s != null && s >= 55 && s < 70 },
  { id: 'low', label: 'Below 55', test: (s) => s != null && s < 55 },
  { id: 'none', label: 'Not analyzed', test: (s) => s == null }
]

export function VerificationIcon({ lead }: { lead: IntelLead }): JSX.Element {
  const state = verificationState(lead)
  if (state === 'ai_verified')
    return <span title="AI verified" className="text-emerald-400"><ShieldCheck className="h-4 w-4" /></span>
  if (state === 'flagged')
    return <span title="Flagged by AI" className="text-red-400"><ShieldAlert className="h-4 w-4" /></span>
  if (state === 'checks_passed')
    return <span title="Passed automated checks" className="text-sky-400"><Shield className="h-4 w-4" /></span>
  return <span title="Unverified" className="text-zinc-600"><Shield className="h-4 w-4" /></span>
}

export function LeadIntelList({
  leads,
  onOpen,
  onAnalyze
}: {
  leads: IntelLead[]
  onOpen: (id: string) => void
  onAnalyze: (ids: string[]) => void
}): JSX.Element {
  const { bulkUpdateStatus, deleteLeads, loading, analyzingIds, batch } = useLeadIntelStore()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<IntelLeadStatus | 'all'>('all')
  const [source, setSource] = useState<ScrapeSource | 'all'>('all')
  const [industry, setIndustry] = useState('all')
  const [scoreRange, setScoreRange] = useState<ScoreRange>('all')
  const [sort, setSort] = useState<SortKey>('date')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const industries = useMemo(
    () => [...new Set(leads.map((l) => l.industry || l.category).filter((x): x is string => !!x))].sort().slice(0, 60),
    [leads]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const range = SCORE_RANGES.find((r) => r.id === scoreRange)!
    const rows = leads.filter((l) => {
      if (status !== 'all' && l.status !== status) return false
      if (source !== 'all' && l.source !== source) return false
      if (industry !== 'all' && (l.industry || l.category) !== industry) return false
      if (!range.test(l.ai_lead_score)) return false
      if (!q) return true
      return [l.business_name, l.email, l.phone, l.city, l.category, l.industry, l.website, ...l.tags]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    })
    return rows.sort((a, b) => {
      if (sort === 'score') return (b.ai_lead_score ?? -1) - (a.ai_lead_score ?? -1)
      if (sort === 'name') return a.business_name.localeCompare(b.business_name)
      return b.created_at.localeCompare(a.created_at)
    })
  }, [leads, query, status, source, industry, scoreRange, sort])

  const selectedIds = [...selected].filter((id) => filtered.some((l) => l.id === id))
  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length

  const toggle = (id: string): void => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const exportCsv = (): void => {
    const rows = selectedIds.length ? filtered.filter((l) => selected.has(l.id)) : filtered
    const blob = new Blob([leadsToCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 flex flex-col h-full min-h-0 overflow-hidden">
      <div className="border-b border-zinc-800 p-3 space-y-2.5">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email, city, tag…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as IntelLeadStatus | 'all')} className="h-8 text-xs">
            <option value="all">All statuses</option>
            {INTEL_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </NativeSelect>
          <NativeSelect value={source} onChange={(e) => setSource(e.target.value as ScrapeSource | 'all')} className="h-8 text-xs">
            <option value="all">All sources</option>
            {(Object.keys(SOURCE_LABELS) as ScrapeSource[]).map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
          </NativeSelect>
          <NativeSelect value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-8 text-xs max-w-[180px]">
            <option value="all">All industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </NativeSelect>
          <NativeSelect value={scoreRange} onChange={(e) => setScoreRange(e.target.value as ScoreRange)} className="h-8 text-xs">
            {SCORE_RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </NativeSelect>
          <NativeSelect value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-8 text-xs ml-auto">
            <option value="date">Newest first</option>
            <option value="score">Highest AI score</option>
            <option value="name">Business name</option>
          </NativeSelect>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCsv} disabled={!filtered.length}>
            <Download className="h-3.5 w-3.5" />
            Export CSV{selectedIds.length ? ` (${selectedIds.length})` : ''}
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-violet-500/10 border border-violet-500/20 px-3 py-1.5">
            <span className="text-xs text-violet-200">{selectedIds.length} selected</span>
            <Button size="sm" variant="secondary" className="h-7 gap-1 text-xs" disabled={batch?.running} onClick={() => onAnalyze(selectedIds)}>
              <Sparkles className="h-3 w-3" />
              Run AI
            </Button>
            <NativeSelect
              value=""
              onChange={(e) => {
                if (e.target.value) void bulkUpdateStatus(selectedIds, e.target.value as IntelLeadStatus)
              }}
              className="h-7 text-xs"
            >
              <option value="">Set status…</option>
              {INTEL_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </NativeSelect>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 gap-1 text-xs"
              onClick={() => {
                if (confirm(`Delete ${selectedIds.length} lead(s)? This can't be undone.`)) {
                  void deleteLeads(selectedIds)
                  setSelected(new Set())
                }
              }}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
            <button type="button" className="ml-auto text-[11px] text-zinc-400 hover:text-zinc-200" onClick={() => setSelected(new Set())}>
              Clear
            </button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {loading && !leads.length ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-500 gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading leads…
          </div>
        ) : !leads.length ? (
          <EmptyState icon={Users} title="No leads yet" body="Run a scrape, import from your Google Sheet, or add a lead manually." />
        ) : !filtered.length ? (
          <EmptyState icon={Search} title="No matches" body="Try clearing a filter or searching for something else." />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-950 z-10">
              <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                <th className="w-9 py-2.5 pl-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((l) => l.id)))}
                    className="accent-violet-500"
                  />
                </th>
                <th className="text-left py-2.5 px-3 font-medium">Business</th>
                <th className="text-left py-2.5 px-3 font-medium">Contact</th>
                <th className="text-left py-2.5 px-3 font-medium">AI score</th>
                <th className="text-left py-2.5 px-3 font-medium hidden xl:table-cell">Top service</th>
                <th className="text-left py-2.5 px-3 font-medium">Status</th>
                <th className="text-left py-2.5 px-3 font-medium hidden lg:table-cell">Source</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const st = INTEL_STATUSES.find((s) => s.id === lead.status)
                const analyzing = analyzingIds.includes(lead.id)
                return (
                  <tr
                    key={lead.id}
                    onClick={() => onOpen(lead.id)}
                    className={cn(
                      'border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer',
                      selected.has(lead.id) && 'bg-violet-500/5'
                    )}
                  >
                    <td className="pl-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggle(lead.id)} className="accent-violet-500" />
                    </td>
                    <td className="py-2.5 px-3 max-w-[260px]">
                      <div className="flex items-center gap-2">
                        <VerificationIcon lead={lead} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{lead.business_name}</p>
                          <p className="text-[11px] text-zinc-500 truncate">
                            {[lead.industry || lead.category, lead.city].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="space-y-0.5 text-[11px]">
                        {lead.phone ? <span className="flex items-center gap-1 text-zinc-300"><Phone className="h-3 w-3" />{lead.phone}</span> : null}
                        {lead.email ? <span className="flex items-center gap-1 text-zinc-400 truncate max-w-[200px]"><Mail className="h-3 w-3 shrink-0" />{lead.email}</span> : null}
                        {!lead.phone && !lead.email && <span className="text-zinc-600">No contact info</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {analyzing ? (
                        <span className="flex items-center gap-1 text-[11px] text-violet-300"><Loader2 className="h-3 w-3 animate-spin" />Analyzing</span>
                      ) : (
                        <ScoreBadge score={lead.ai_lead_score} />
                      )}
                    </td>
                    <td className="py-2.5 px-3 hidden xl:table-cell text-[11px] text-zinc-400 max-w-[200px] truncate">
                      {lead.ai_services_needed[0]?.name ?? '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={st?.variant ?? 'secondary'} className="text-[10px]">{st?.label ?? lead.status}</Badge>
                    </td>
                    <td className="py-2.5 px-3 hidden lg:table-cell text-[11px] text-zinc-500">
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                      <span className="block text-zinc-600">{formatRelativeTime(lead.created_at)}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </ScrollArea>
      <div className="border-t border-zinc-800 px-3 py-1.5 text-[11px] text-zinc-500">
        Showing {filtered.length} of {leads.length} leads
      </div>
    </Card>
  )
}
