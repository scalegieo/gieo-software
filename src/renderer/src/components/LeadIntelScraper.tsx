import { useState } from 'react'
import { MapPin, Star, Globe, Map as MapIcon, Play, Square, Loader2, Phone, Mail, CheckCircle2, AlertTriangle, Radar, X, History } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import { useLeadIntelStore } from '@/store/useLeadIntelStore'
import { LEAD_PROFILES, SOURCE_LABELS, type IntelLead, type LeadVerification } from '@/lib/leadIntel'
import { FieldLabel, ErrorNote, EmptyState } from '@/components/LeadIntelControls'

type Source = 'google_maps' | 'yelp' | 'openstreetmap' | 'website'

const SOURCES: { id: Source; label: string; icon: typeof MapPin; hint: string }[] = [
  { id: 'google_maps', label: 'Google Maps', icon: MapPin, hint: 'Best coverage — phones, websites, ratings, hours' },
  { id: 'openstreetmap', label: 'OpenStreetMap', icon: MapIcon, hint: 'Open data, fast and never blocked' },
  { id: 'yelp', label: 'Yelp', icon: Star, hint: 'Best effort — Yelp often blocks bots' },
  { id: 'website', label: 'Website URLs', icon: Globe, hint: 'Audit a list of sites you already have' }
]

function FeedRow({ lead }: { lead: IntelLead }): JSX.Element {
  const v = lead.verification as LeadVerification
  const passed = v?.checks?.filter((c) => c.pass).length ?? 0
  const total = v?.checks?.length ?? 0
  return (
    <div className="flex items-start gap-3 rounded-md border border-zinc-800/80 bg-zinc-950/40 px-3 py-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{lead.business_name}</p>
        <p className="text-[11px] text-zinc-500 truncate">
          {[lead.category, lead.city && `${lead.city}${lead.state ? `, ${lead.state}` : ''}`].filter(Boolean).join(' · ') || lead.website}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-zinc-400">
          {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
          {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
          {lead.google_rating != null && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{lead.google_rating} ({lead.review_count ?? 0})</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn('flex items-center gap-1 text-[10px]', v?.score >= 60 ? 'text-emerald-400' : 'text-amber-400')}>
          {v?.score >= 60 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {passed}/{total} checks
        </span>
        {lead.website_quality != null && (
          <span className="text-[10px] text-zinc-500">Site {lead.website_quality}/100</span>
        )}
      </div>
    </div>
  )
}

export function LeadIntelScraper(): JSX.Element {
  const activeBusiness = useStore((s) => s.activeBusiness)
  const { activeScrape, startScrape, cancelScrape, dismissScrape, settings, jobs } = useLeadIntelStore()
  const profile = LEAD_PROFILES[activeBusiness]

  const [source, setSource] = useState<Source>('google_maps')
  const [query, setQuery] = useState('')
  const [urls, setUrls] = useState('')
  const [maxResults, setMaxResults] = useState(settings.defaultMaxResults)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const running = activeScrape?.status === 'running'
  const jobForOtherBusiness = activeScrape && activeScrape.business !== activeBusiness
  const recentJobs = jobs.filter((j) => j.business === activeBusiness).slice(0, 6)

  const handleStart = async (): Promise<void> => {
    setError(null)
    if (source === 'website') {
      if (!urls.trim()) return setError('Paste at least one website URL.')
    } else if (!query.trim()) {
      return setError(`Enter a search like "${profile.presets[0]}".`)
    }
    setStarting(true)
    const result = await startScrape({
      source,
      query: source === 'website' ? 'Website audit' : query.trim(),
      maxResults,
      urls: source === 'website' ? urls.split(/[\s,]+/).filter(Boolean) : undefined
    })
    setStarting(false)
    if (result.error) setError(result.error)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr] h-full min-h-0">
      <Card className="bg-zinc-900/50 border-zinc-800 p-4 space-y-4 h-fit">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Radar className="h-4 w-4 text-violet-400" />
            New {profile.name} scrape
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Leads are verified, deduped and saved to the {profile.name} workspace automatically.
          </p>
        </div>

        <div className="space-y-1.5">
          <FieldLabel>Source</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={running}
                onClick={() => setSource(s.id)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-50',
                  source === s.id ? 'border-violet-500/50 bg-violet-500/10' : 'border-zinc-800 hover:bg-zinc-800/50'
                )}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </span>
                <span className="text-[10px] text-zinc-500 leading-snug">{s.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {source === 'website' ? (
          <div className="space-y-1.5">
            <FieldLabel>Website URLs (one per line)</FieldLabel>
            <textarea
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              disabled={running}
              rows={6}
              placeholder={'acmeroofing.com\nhttps://smithrealty.com'}
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 font-mono"
            />
          </div>
        ) : (
          <div className="space-y-1.5">
            <FieldLabel>Search</FieldLabel>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !running && void handleStart()}
              disabled={running}
              placeholder={profile.presets[0]}
            />
            <div className="flex flex-wrap gap-1 pt-1">
              {profile.presets.slice(0, 6).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={running}
                  onClick={() => setQuery(p)}
                  className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <FieldLabel>Max results</FieldLabel>
            <span className="text-xs tabular-nums text-zinc-300">{maxResults}</span>
          </div>
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={maxResults}
            disabled={running}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <p className="text-[10px] text-zinc-600">
            ~{Math.ceil((maxResults * (source === 'openstreetmap' ? 1.5 : 3)) / 60)} min · paced at 1 request / 2s to avoid blocks
          </p>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        {running ? (
          <Button variant="destructive" className="w-full gap-2" onClick={cancelScrape}>
            <Square className="h-3.5 w-3.5" />
            Cancel scrape
          </Button>
        ) : (
          <Button className="w-full gap-2" onClick={() => void handleStart()} disabled={starting}>
            {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Start Scraping
          </Button>
        )}

        {recentJobs.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-zinc-800">
            <p className="text-[11px] text-zinc-500 flex items-center gap-1 pt-2"><History className="h-3 w-3" />Recent scrapes</p>
            {recentJobs.map((j) => (
              <div key={j.id} className="flex items-center justify-between text-[11px]">
                <span className="truncate text-zinc-400 max-w-[60%]">{j.query}</span>
                <span className="text-zinc-500 shrink-0">
                  {j.total_found} · {SOURCE_LABELS[j.source]} · {formatRelativeTime(j.started_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 flex flex-col min-h-[420px] overflow-hidden">
        {!activeScrape ? (
          <EmptyState
            icon={Radar}
            title="No scrape running"
            body={`Pick a source and search to find ${profile.name === 'Python' ? 'real estate' : 'local business'} leads. They'll stream in here live as they're found and verified.`}
          />
        ) : (
          <>
            <div className="border-b border-zinc-800 p-4 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {SOURCE_LABELS[activeScrape.source]} · {activeScrape.query}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate flex items-center gap-1.5">
                    {running && <Loader2 className="h-3 w-3 animate-spin" />}
                    {activeScrape.phase}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={activeScrape.status === 'completed' ? 'success' : activeScrape.status === 'failed' ? 'destructive' : activeScrape.status === 'cancelled' ? 'warning' : 'pending'} className="capitalize text-[10px]">
                    {activeScrape.status}
                  </Badge>
                  {!running && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={dismissScrape} title="Clear">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', activeScrape.status === 'failed' ? 'bg-red-500' : 'bg-violet-500')}
                  style={{ width: `${activeScrape.progress}%` }}
                />
              </div>
              <div className="flex gap-4 text-[11px] text-zinc-400 tabular-nums">
                <span><span className="text-zinc-100 font-medium">{activeScrape.saved}</span> new leads saved</span>
                {activeScrape.duplicates > 0 && <span>{activeScrape.duplicates} duplicates skipped</span>}
                <span>{activeScrape.progress}%</span>
              </div>
              {jobForOtherBusiness && (
                <p className="text-[11px] text-zinc-500">Saving to the {LEAD_PROFILES[activeScrape.business].name} workspace.</p>
              )}
              {activeScrape.error && <ErrorNote>{activeScrape.error}</ErrorNote>}
            </div>
            <ScrollArea className="flex-1">
              <div className="space-y-2 p-4">
                {activeScrape.feed.length === 0 ? (
                  <p className="text-center text-xs text-zinc-500 py-10">
                    {running ? 'Looking for leads…' : 'No new leads from this scrape.'}
                  </p>
                ) : (
                  activeScrape.feed.map((lead) => <FeedRow key={lead.id} lead={lead} />)
                )}
                {activeScrape.errors.length > 0 && !running && (
                  <details className="text-[11px] text-zinc-500 pt-2">
                    <summary className="cursor-pointer">{activeScrape.errors.length} issue(s) during scrape</summary>
                    <ul className="mt-1 space-y-0.5 pl-3 list-disc">
                      {activeScrape.errors.slice(0, 20).map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  </details>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </Card>
    </div>
  )
}
