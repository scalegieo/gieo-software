import { useEffect, useMemo, useState } from 'react'
import { Radar, Plus, FileSpreadsheet, Loader2, Sparkles, Users, Settings2, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/store/useStore'
import { useLeadIntelStore } from '@/store/useLeadIntelStore'
import { LEAD_PROFILES, scoreGrade } from '@/lib/leadIntel'
import { LeadIntelScraper } from '@/components/LeadIntelScraper'
import { LeadIntelList } from '@/components/LeadIntelList'
import { LeadIntelDetail } from '@/components/LeadIntelDetail'
import { LeadIntelBatch } from '@/components/LeadIntelBatch'
import { LeadIntelSettings } from '@/components/LeadIntelSettings'
import { ErrorNote, FieldLabel } from '@/components/LeadIntelControls'

type Tab = 'scraper' | 'leads' | 'batch' | 'settings'

export function LeadIntelligence(): JSX.Element {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const { leads: allLeads, fetchLeads, fetchJobs, subscribeRealtime, error, loaded, activeScrape, batch, runBatch, importFromSheet, addManualLead } =
    useLeadIntelStore()
  const profile = LEAD_PROFILES[activeBusiness]

  const [tab, setTab] = useState<Tab>('scraper')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [newLead, setNewLead] = useState({ business_name: '', contact_name: '', phone: '', email: '', website: '', city: '' })

  useEffect(() => {
    void fetchLeads()
    void fetchJobs()
    return subscribeRealtime()
  }, [fetchLeads, fetchJobs, subscribeRealtime])

  useEffect(() => {
    if (!loaded) return
    setTab((t) => (t === 'scraper' && allLeads.some((l) => l.business === activeBusiness) && !activeScrape ? 'leads' : t))
  }, [loaded])

  useEffect(() => setOpenLeadId(null), [activeBusiness])

  const leads = useMemo(() => allLeads.filter((l) => l.business === activeBusiness), [allLeads, activeBusiness])
  const stats = useMemo(() => {
    const scored = leads.filter((l) => l.ai_lead_score != null)
    const avg = scored.length ? Math.round(scored.reduce((s, l) => s + (l.ai_lead_score ?? 0), 0) / scored.length) : null
    return {
      total: leads.length,
      analyzed: scored.length,
      avg,
      hot: scored.filter((l) => (l.ai_lead_score ?? 0) >= 70).length,
      verified: leads.filter((l) => l.ai_verified).length
    }
  }, [leads])

  const handleImport = async (): Promise<void> => {
    setImporting(true)
    setNotice(null)
    const result = await importFromSheet()
    setImporting(false)
    setNotice(result.error ?? (result.imported ? `Imported ${result.imported} new leads from the Google Sheet.` : 'No new leads in the Google Sheet.'))
    if (result.imported) setTab('leads')
  }

  const handleAdd = async (): Promise<void> => {
    if (!newLead.business_name.trim()) return setAddError('Business name is required.')
    const clean = Object.fromEntries(Object.entries(newLead).map(([k, v]) => [k, v.trim() || null])) as typeof newLead
    const result = await addManualLead({ ...clean, business_name: newLead.business_name.trim() })
    if (result.error) return setAddError(result.error)
    setAddOpen(false)
    setAddError(null)
    setNewLead({ business_name: '', contact_name: '', phone: '', email: '', website: '', city: '' })
    setTab('leads')
  }

  return (
    <div className="relative z-10 flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Radar className="h-5 w-5" />
            Lead Intelligence
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {activeBusiness === 'python'
              ? 'Find real estate agents, brokerages and builders who need cinematic property video.'
              : 'Find local and e-commerce businesses that need ads, creative and better websites.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void handleImport()} disabled={importing}>
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Import from Sheet
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 shrink-0">
        {[
          { label: `${profile.name} leads`, value: stats.total },
          { label: 'AI analyzed', value: stats.analyzed },
          { label: 'AI verified', value: stats.verified },
          { label: 'Hot (70+)', value: stats.hot },
          { label: 'Avg score', value: stats.avg == null ? '—' : `${stats.avg} · ${scoreGrade(stats.avg)}` }
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">{s.label}</p>
            <p className="text-lg font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {notice && <p className="text-xs text-zinc-300 border border-zinc-700 bg-zinc-900/60 rounded-md px-3 py-2">{notice}</p>}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="scraper" className="gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Scraper
            {activeScrape?.status === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Leads ({leads.length})
          </TabsTrigger>
          <TabsTrigger value="batch" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Batch AI
            {batch?.running && <Loader2 className="h-3 w-3 animate-spin" />}
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scraper" className="flex-1 min-h-0 mt-3">
          <LeadIntelScraper />
        </TabsContent>
        <TabsContent value="leads" className="mt-3 h-[calc(100vh-290px)] min-h-[420px]">
          <LeadIntelList
            leads={leads}
            onOpen={setOpenLeadId}
            onAnalyze={(ids) => {
              setTab('batch')
              void runBatch(ids)
            }}
          />
        </TabsContent>
        <TabsContent value="batch" className="mt-3">
          <LeadIntelBatch leads={leads} business={activeBusiness} />
        </TabsContent>
        <TabsContent value="settings" className="mt-3">
          <LeadIntelSettings />
        </TabsContent>
      </Tabs>

      {openLeadId && <LeadIntelDetail leadId={openLeadId} onClose={() => setOpenLeadId(null)} />}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add {profile.name} lead</DialogTitle></DialogHeader>
          <div className="grid gap-2.5">
            {(
              [
                ['business_name', 'Business name *'],
                ['contact_name', 'Contact name'],
                ['phone', 'Phone'],
                ['email', 'Email'],
                ['website', 'Website'],
                ['city', 'City']
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <FieldLabel>{label}</FieldLabel>
                <Input value={newLead[key]} onChange={(e) => setNewLead({ ...newLead, [key]: e.target.value })} />
              </div>
            ))}
            {addError && <ErrorNote>{addError}</ErrorNote>}
            <Button onClick={() => void handleAdd()}>Add lead</Button>
            <p className="text-[10px] text-zinc-500">Website, email and phone are checked automatically after you add the lead.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
