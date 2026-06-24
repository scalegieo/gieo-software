import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/store/useStore'
import { CONFIG } from '@/lib/config'
import { buildFullPlatformContext } from '@/lib/aiContext'
import { formatCompactCurrency } from '@/lib/types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function AISidebar(): JSX.Element {
  const store = useStore()
  const { aiSidebarOpen, setAiSidebarOpen, activeClientId, activeTaskId } = store
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'GIEO AI · Local Llama 3.2 via Ollama. Full CRM access — ask about MRR, leads, clients, or team stats.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ollamaReady, setOllamaReady] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const activeClient = store.clients.find((c) => c.id === activeClientId)
  const activeTask = store.tasks.find((t) => t.id === activeTaskId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    if (!aiSidebarOpen || !window.gieo) return
    void window.gieo.getOllamaStatus().then((s) => setOllamaReady(s.ready && s.modelLoaded))
    const interval = setInterval(() => {
      void window.gieo?.getOllamaStatus().then((s) => setOllamaReady(s.ready && s.modelLoaded))
    }, 5000)
    return () => clearInterval(interval)
  }, [aiSidebarOpen])

  if (!aiSidebarOpen) return <></>

  const callOllama = async (userMessage: string, history: ChatMessage[]): Promise<string> => {
    if (!window.gieo) throw new Error('Desktop API unavailable')

    const systemPrompt = buildFullPlatformContext({
      profile: store.profile,
      clients: store.clients,
      leads: store.leads,
      campaigns: store.campaigns,
      tasks: store.tasks,
      clientProfiles: store.clientProfiles,
      scrapedLeads: store.scrapedLeads,
      teamMetrics: store.teamMetrics,
      getTotalMRR: store.getTotalMRR,
      getTotalAdSpend: store.getTotalAdSpend,
      getActiveClientCount: store.getActiveClientCount
    })

    const priorMessages = history
      .filter((m, i) => m.role !== 'assistant' || i > 0)
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.content }))

    const result = await window.gieo.ollamaChat([
      { role: 'system', content: systemPrompt },
      ...priorMessages,
      { role: 'user', content: userMessage }
    ])

    if (result.error) throw new Error(result.error)
    if (!result.content) throw new Error('Empty response from Ollama')
    return result.content
  }

  const handleSend = async (): Promise<void> => {
    const trimmed = input.trim()
    if (!trimmed || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])
    setLoading(true)

    try {
      const reply = await callOllama(trimmed, messages)
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${(err as Error).message}. Make sure Ollama is running with llama3.2.` }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-zinc-200" />
          <div>
            <p className="text-sm font-medium">GIEO AI</p>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Ollama · {CONFIG.ollama.model} local
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={ollamaReady ? 'success' : 'warning'} className="text-[10px]">
            {ollamaReady ? 'Ready' : 'Loading…'}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAiSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="border-b border-zinc-800 px-4 py-2 text-[10px] text-zinc-500">
        MRR {formatCompactCurrency(store.getTotalMRR())} · {store.clients.length} clients · {store.scrapedLeads.length} sheet leads
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'ml-8 bg-zinc-800/80 border border-zinc-700 text-zinc-100'
                  : 'mr-4 bg-zinc-900 border border-zinc-800 text-zinc-300'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Llama 3.2 thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="What's our MRR?"
            className="h-9 text-sm"
            disabled={loading || !ollamaReady}
          />
          <Button size="icon" className="h-9 w-9 shrink-0" onClick={() => void handleSend()} disabled={loading || !ollamaReady}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
