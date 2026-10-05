import { useEffect, useState } from 'react'
import { Loader2, Wand2, Copy, Check, Mail, Save, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLeadIntelStore } from '@/store/useLeadIntelStore'
import {
  SCRIPT_TONES,
  SCRIPT_TYPES,
  scriptToText,
  emailToText,
  type CallScriptTone,
  type CallScriptType,
  type GeneratedCallScript,
  type IntelLead
} from '@/lib/leadIntel'
import { NativeSelect, FieldLabel, ErrorNote } from '@/components/LeadIntelControls'

function Block({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-wider text-violet-300/80 font-medium">{title}</p>
      <div className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{children}</div>
    </div>
  )
}

export function CallScriptDialog({
  lead,
  open,
  onOpenChange
}: {
  lead: IntelLead
  open: boolean
  onOpenChange: (open: boolean) => void
}): JSX.Element {
  const { settings, generateScript, saveScript } = useLeadIntelStore()
  const [scriptType, setScriptType] = useState<CallScriptType>('cold_call')
  const [tone, setTone] = useState<CallScriptTone>('friendly')
  const [offering, setOffering] = useState(settings.offering[lead.business])
  const [companyName, setCompanyName] = useState(settings.companyName[lead.business])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [script, setScript] = useState<GeneratedCallScript | null>(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState<'script' | 'email' | null>(null)

  useEffect(() => {
    if (open) {
      setOffering(settings.offering[lead.business])
      setCompanyName(settings.companyName[lead.business])
    }
  }, [open, lead.business])

  const generate = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    setSaved(false)
    const result = await generateScript(lead.id, { scriptType, tone, offering, companyName })
    setLoading(false)
    if (result.error || !result.data) return setError(result.error ?? 'Script generation failed.')
    setScript(result.data)
    const saveResult = await saveScript(lead.id, result.data, { scriptType, tone })
    if (!saveResult.error) setSaved(true)
  }

  const copy = async (kind: 'script' | 'email'): Promise<void> => {
    if (!script) return
    await navigator.clipboard.writeText(kind === 'script' ? scriptToText(script) : emailToText(script.followUpEmail))
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-400" />
            Call script · {lead.business_name}
          </DialogTitle>
        </DialogHeader>

        {!script ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <FieldLabel>Script type</FieldLabel>
                <NativeSelect value={scriptType} onChange={(e) => setScriptType(e.target.value as CallScriptType)} className="w-full">
                  {SCRIPT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <FieldLabel>Tone</FieldLabel>
                <NativeSelect value={tone} onChange={(e) => setTone(e.target.value as CallScriptTone)} className="w-full">
                  {SCRIPT_TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1">
              <FieldLabel>Your service / product</FieldLabel>
              <Input value={offering} onChange={(e) => setOffering(e.target.value)} />
            </div>
            <div className="space-y-1">
              <FieldLabel>Your company name</FieldLabel>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            {!lead.ai_analyzed_at && (
              <p className="text-[11px] text-zinc-500">Tip: run AI analysis on this lead first for a sharper, more personalized script.</p>
            )}
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button className="w-full gap-2" onClick={() => void generate()} disabled={loading || !offering.trim() || !companyName.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              {loading ? 'Writing your script… (15–40s)' : 'Generate script'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void copy('script')}>
                {copied === 'script' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy to Clipboard
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void copy('email')}>
                {copied === 'email' ? <Check className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                Copy Email
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setScript(null)}>
                <RotateCcw className="h-3.5 w-3.5" />
                New script
              </Button>
              <span className="ml-auto flex items-center gap-1 text-[11px] text-zinc-500">
                {saved ? <><Save className="h-3 w-3" />Saved to lead</> : 'Not saved'}
              </span>
            </div>

            {script.talkingPoints.length > 0 && (
              <div className="rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-violet-300/80 font-medium mb-1">Talking points</p>
                <ul className="text-xs text-zinc-300 list-disc pl-4 space-y-0.5">
                  {script.talkingPoints.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            )}

            <Block title="Opener">{script.opener}</Block>
            <Block title="Intro">{script.intro}</Block>
            <Block title="Value proposition">{script.valueProp}</Block>
            <Block title="Engagement questions">
              <ol className="list-decimal pl-5 space-y-1">
                {script.questions.map((q) => <li key={q}>{q}</li>)}
              </ol>
            </Block>
            <Block title="Pitch">{script.pitch}</Block>
            <Block title="Social proof">{script.socialProof}</Block>
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wider text-violet-300/80 font-medium">Objection handlers</p>
              {script.objections.map((o) => (
                <div key={o.objection} className="rounded-md bg-zinc-950/60 px-3 py-2">
                  <p className="text-xs font-medium text-zinc-200">“{o.objection}”</p>
                  <p className="text-sm text-zinc-300 mt-0.5">{o.response}</p>
                </div>
              ))}
            </div>
            <Block title="Close">{script.close}</Block>
            <Block title="Voicemail">{script.voicemail}</Block>
            <div className="rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-violet-300/80 font-medium">Follow-up email</p>
              <p className="text-sm font-medium text-zinc-200">{script.followUpEmail.subject}</p>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{script.followUpEmail.body}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
