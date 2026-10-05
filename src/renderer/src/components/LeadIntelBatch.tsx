import { Sparkles, Square, Loader2, CheckCircle2, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLeadIntelStore } from '@/store/useLeadIntelStore'
import { OllamaFreeTierMeter } from '@/components/EbonicsUsageDisplay'
import { useOllamaUsageTracker } from '@/hooks/useOllamaUsageTracker'
import { LEAD_PROFILES, type IntelLead } from '@/lib/leadIntel'
import { ErrorNote } from '@/components/LeadIntelControls'
import type { BusinessId } from '@/lib/types'

export function LeadIntelBatch({ leads, business }: { leads: IntelLead[]; business: BusinessId }): JSX.Element {
  const { batch, runBatch, cancelBatch, dismissBatch } = useLeadIntelStore()
  const { usage } = useOllamaUsageTracker(true)
  const pending = leads.filter((l) => !l.ai_analyzed_at && l.status !== 'dead')
  const analyzed = leads.length - pending.length
  const profile = LEAD_PROFILES[business]
  const pct = batch?.total ? Math.round(((batch.done + batch.failed) / batch.total) * 100) : 0
  const estimatedTokens = pending.length * 2200

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="bg-zinc-900/50 border-zinc-800 p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Run AI on all new {profile.name} leads
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Each lead gets verification, a summary, recommended {profile.name} services and a 1–100 score in a single AI pass.
            Leads are processed one at a time to stay inside the free AI limits.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md bg-zinc-950/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Waiting</p>
            <p className="text-xl font-semibold tabular-nums">{pending.length}</p>
          </div>
          <div className="rounded-md bg-zinc-950/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Analyzed</p>
            <p className="text-xl font-semibold tabular-nums">{analyzed}</p>
          </div>
          <div className="rounded-md bg-zinc-950/60 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Est. time</p>
            <p className="text-xl font-semibold tabular-nums">~{Math.max(1, Math.ceil((pending.length * 12) / 60))}m</p>
          </div>
        </div>

        {batch && (
          <div className="space-y-2 rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                {batch.running ? <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                {batch.message}
              </span>
              {!batch.running && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={dismissBatch}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            {batch.total > 0 && (
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            )}
            {batch.currentName && <p className="text-[11px] text-zinc-500 truncate">Now: {batch.currentName}</p>}
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {batch.done} done{batch.failed ? ` · ${batch.failed} failed` : ''} · {batch.total} queued
            </p>
            {batch.error && <ErrorNote>{batch.error}</ErrorNote>}
          </div>
        )}

        {usage.remaining < estimatedTokens && pending.length > 0 && (
          <ErrorNote>
            This queue needs roughly {estimatedTokens.toLocaleString()} tokens but only {usage.remaining.toLocaleString()} are left today — it will stop
            when the free pool runs out and you can resume after the reset.
          </ErrorNote>
        )}

        {batch?.running ? (
          <Button variant="destructive" className="gap-2" onClick={cancelBatch}>
            <Square className="h-3.5 w-3.5" />
            Cancel
          </Button>
        ) : (
          <Button className="gap-2" disabled={!pending.length || usage.isLimitReached} onClick={() => void runBatch()}>
            <Sparkles className="h-4 w-4" />
            {pending.length ? `Run AI on ${pending.length} new lead${pending.length === 1 ? '' : 's'}` : 'All leads analyzed'}
          </Button>
        )}
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-4 h-fit">
        <p className="text-xs font-medium text-zinc-300 mb-3">Free AI usage</p>
        <OllamaFreeTierMeter usage={usage} />
      </Card>
    </div>
  )
}
