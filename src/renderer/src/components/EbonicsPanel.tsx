import { useState, useRef, useEffect } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { CONFIG } from '@/lib/config'
import { cn } from '@/lib/utils'
import { FridayAvatar } from '@/components/FridayAvatar'
import { EbonicsCommandBar, useEbonicsShortcut } from '@/components/EbonicsCommandBar'
import { OllamaFreeTierMeter, usageBorderClass } from '@/components/EbonicsUsageDisplay'
import { OllamaLimitModal } from '@/components/OllamaLimitModal'
import { useEbonicsEngine, type EbonicsChatMessage } from '@/hooks/useEbonicsEngine'
import { useOllamaUsageTracker } from '@/hooks/useOllamaUsageTracker'
import { useOllamaBoot, ollamaStatusLabel } from '@/hooks/useOllamaBoot'
import { fridayWelcome, getFirstName } from '@/lib/fridayVoice'

export function EbonicsPanel(): JSX.Element {
  useEbonicsShortcut()

  const { profile, aiSidebarOpen, setAiSidebarOpen, setCommandBarOpen, commandBarOpen } = useStore()
  const panelActive = aiSidebarOpen || commandBarOpen
  const { usage, refresh, applyUsageState } = useOllamaUsageTracker(panelActive)
  const ollamaBoot = useOllamaBoot(panelActive)

  const [messages, setMessages] = useState<EbonicsChatMessage[]>(() => [
    { role: 'assistant', content: fridayWelcome(getFirstName(profile)) }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLimitModal, setShowLimitModal] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { processMessage, pageContext } = useEbonicsEngine(applyUsageState)

  const blocked = usage.isLimitReached
  const ollamaReady = ollamaBoot.ready && ollamaBoot.modelLoaded

  useEffect(() => {
    const name = getFirstName(profile)
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0].role !== 'assistant') return prev
      const welcome = fridayWelcome(name)
      if (prev[0].content === welcome) return prev
      return [{ role: 'assistant', content: welcome }]
    })
  }, [profile?.name])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  useEffect(() => {
    if (blocked && commandBarOpen) setShowLimitModal(true)
  }, [blocked, commandBarOpen])

  useEffect(() => {
    if (aiSidebarOpen && !blocked) setTimeout(() => inputRef.current?.focus(), 80)
  }, [aiSidebarOpen, blocked])

  const runMessage = async (text: string, fromPopup = false): Promise<void> => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    if (blocked) {
      setShowLimitModal(true)
      return
    }

    setLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])

    if (fromPopup) {
      setCommandBarOpen(false)
      setAiSidebarOpen(true)
    }

    try {
      const reply = await processMessage(trimmed, messages)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
      await refresh()
      const snap = await window.gieo?.getOllamaUsage?.()
      if (snap?.isLimitReached) setShowLimitModal(true)
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${(err as Error).message}` }
      ])
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  return (
    <>
      <OllamaLimitModal
        open={showLimitModal}
        usage={usage}
        onDismiss={() => setShowLimitModal(false)}
      />

      <EbonicsCommandBar
        usage={usage}
        boot={ollamaBoot}
        onSubmit={(text) => void runMessage(text, true)}
        loading={loading}
      />

      {aiSidebarOpen && (
        <aside
          className={cn(
            'flex w-96 shrink-0 flex-col liquid-glass-panel border-l border-white/10 rounded-none',
            'animate-in slide-in-from-right duration-300',
            usageBorderClass(usage.warningLevel)
          )}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <FridayAvatar size="md" />
              <div>
                <p className="text-sm font-semibold tracking-wide text-zinc-50">FRIDAY</p>
                <p className="text-[10px] text-zinc-400">
                  GIEO Assistant · {CONFIG.ollama.chatModel} · {pageContext}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={ollamaReady ? 'success' : ollamaBoot.phase === 'error' ? 'destructive' : 'warning'}
                className="text-[10px] max-w-[140px] truncate"
                title={ollamaBoot.message}
              >
                {ollamaBoot.warming && !ollamaReady && (
                  <Loader2 className="h-3 w-3 animate-spin mr-1 inline" />
                )}
                {ollamaStatusLabel(ollamaBoot)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-white/10"
                onClick={() => setAiSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-3 liquid-glass-subtle">
            <OllamaFreeTierMeter usage={usage} />
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 py-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    'rounded-xl px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'ml-8 liquid-glass-inset text-zinc-100 border-violet-500/20'
                      : 'mr-4 liquid-glass-subtle text-zinc-300'
                  )}
                >
                  {msg.role === 'assistant' && i > 0 && (
                    <div className="flex items-center gap-1.5 mb-1.5 opacity-70">
                      <FridayAvatar size="sm" />
                      <span className="text-[10px] text-violet-300/80">FRIDAY</span>
                    </div>
                  )}
                  {msg.content}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  Thinking…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="border-t border-white/10 p-3 liquid-glass-subtle">
            {blocked ? (
              <p className="text-xs text-center text-zinc-400 py-2">
                Daily limit reached · resets {usage.resetAtMst}
              </p>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void runMessage(input, false)
                    }
                  }}
                  placeholder="Chat or /agent …"
                  disabled={loading}
                  className="flex-1 h-9 rounded-lg px-3 text-sm liquid-glass-inset outline-none focus:ring-2 focus:ring-violet-500/25 placeholder:text-zinc-500"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-violet-600/80 hover:bg-violet-500 border border-violet-400/30"
                  onClick={() => void runMessage(input, false)}
                  disabled={loading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-zinc-500 text-center">
              {usage.remainingPercent}% free pool left ({usage.remaining.toLocaleString()} tok)
              {usage.isLimitReached && (
                <span className="text-red-400"> · resets {usage.resetAtSession}</span>
              )}{' '}
              · ⌥ Option
              {!ollamaReady && ollamaBoot.message && (
                <span className="text-amber-400"> · {ollamaBoot.message}</span>
              )}
            </p>
          </div>
        </aside>
      )}
    </>
  )
}
