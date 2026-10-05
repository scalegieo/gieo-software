import { Settings2, Bot, Eye, Building2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLeadIntelStore } from '@/store/useLeadIntelStore'
import { useOllamaBoot, ollamaStatusLabel } from '@/hooks/useOllamaBoot'
import { CONFIG } from '@/lib/config'
import { LEAD_PROFILES } from '@/lib/leadIntel'
import { BUSINESSES } from '@/lib/types'
import { FieldLabel } from '@/components/LeadIntelControls'

export function LeadIntelSettings(): JSX.Element {
  const { settings, updateSettings } = useLeadIntelStore()
  const boot = useOllamaBoot(true)

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="bg-zinc-900/50 border-zinc-800 p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Bot className="h-4 w-4 text-violet-400" />AI engine</p>
        <div className="flex items-center justify-between rounded-md bg-zinc-950/60 px-3 py-2">
          <div>
            <p className="text-sm">Ollama Cloud · {CONFIG.ollama.agentModel}</p>
            <p className="text-[11px] text-zinc-500">Free tier · fallbacks {CONFIG.ollama.chatModelFallback} → nemotron-3-nano · no API key needed</p>
          </div>
          <Badge variant={boot.ready ? 'success' : boot.phase === 'error' ? 'destructive' : 'warning'} className="text-[10px]">
            {ollamaStatusLabel(boot)}
          </Badge>
        </div>
        <p className="text-[11px] text-zinc-500">
          All verification, analysis, scoring and call scripts run on the same free AI as FRIDAY. Usage counts toward the shared free pool shown on the Batch AI tab.
        </p>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4 text-violet-400" />Scraper</p>
        <label className="flex items-start gap-3 rounded-md bg-zinc-950/60 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.showBrowser}
            onChange={(e) => updateSettings({ showBrowser: e.target.checked })}
            className="mt-1 accent-violet-500"
          />
          <span>
            <span className="text-sm flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Show scraper browser</span>
            <span className="block text-[11px] text-zinc-500">
              Opens the scraping window so you can watch it — and solve a captcha if Google or Yelp asks for one.
            </span>
          </span>
        </label>
        <div className="space-y-1">
          <FieldLabel>Default max results</FieldLabel>
          <Input
            type="number"
            min={10}
            max={200}
            value={settings.defaultMaxResults}
            onChange={(e) => updateSettings({ defaultMaxResults: Math.min(200, Math.max(10, Number(e.target.value) || 25)) })}
            className="w-32"
          />
        </div>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800 p-4 space-y-3 lg:col-span-2">
        <p className="text-sm font-semibold flex items-center gap-2"><Building2 className="h-4 w-4 text-violet-400" />Call script defaults</p>
        <div className="space-y-1 max-w-xs">
          <FieldLabel>Your name (caller)</FieldLabel>
          <Input
            value={settings.callerName}
            onChange={(e) => updateSettings({ callerName: e.target.value })}
            placeholder="Defaults to your login name"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {BUSINESSES.map((b) => (
            <div key={b.id} className="space-y-2 rounded-md border border-zinc-800 p-3">
              <p className="text-xs font-medium text-zinc-300">{b.label}</p>
              <div className="space-y-1">
                <FieldLabel>Company name</FieldLabel>
                <Input
                  value={settings.companyName[b.id]}
                  onChange={(e) => updateSettings({ companyName: { ...settings.companyName, [b.id]: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel>What you sell</FieldLabel>
                <Input
                  value={settings.offering[b.id]}
                  onChange={(e) => updateSettings({ offering: { ...settings.offering, [b.id]: e.target.value } })}
                />
              </div>
              <p className="text-[10px] text-zinc-500">
                AI recommends from: {LEAD_PROFILES[b.id].services.map((s) => s.name).join(', ')}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
