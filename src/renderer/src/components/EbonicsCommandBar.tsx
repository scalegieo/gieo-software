import { useState, useRef, useEffect } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { FridayAvatar } from '@/components/FridayAvatar'
import { cn } from '@/lib/utils'
import { usageBorderClass } from '@/components/EbonicsUsageDisplay'
import type { OllamaUsageSnapshot } from '@/hooks/useOllamaUsageTracker'
import type { OllamaBootStatus } from '@/hooks/useOllamaBoot'

interface EbonicsCommandBarProps {
  usage: OllamaUsageSnapshot
  boot?: OllamaBootStatus
  onSubmit: (text: string) => void
  loading: boolean
}

/** Minimal ⌥ Option quick-ask bar — Apple Intelligence style glow */
export function EbonicsCommandBar({
  usage,
  onSubmit,
  loading
}: EbonicsCommandBarProps): JSX.Element | null {
  const { commandBarOpen, setCommandBarOpen } = useStore()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const blocked = usage.isLimitReached

  useEffect(() => {
    if (!commandBarOpen) {
      setInput('')
      return
    }
    if (!blocked) {
      const t = setTimeout(() => inputRef.current?.focus(), 40)
      return () => clearTimeout(t)
    }
  }, [commandBarOpen, blocked])

  if (!commandBarOpen) return null

  const submit = (): void => {
    const trimmed = input.trim()
    if (!trimmed || loading || blocked) return
    onSubmit(trimmed)
    setInput('')
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) setCommandBarOpen(false)
      }}
    >
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" />

      <div
        className={cn(
          'relative w-full max-w-xl mx-5 friday-intelligence-enter',
          usageBorderClass(usage.warningLevel)
        )}
      >
        <div className="friday-intelligence-shell">
          <div className="friday-intelligence-bar px-2 py-2 pl-3 pr-2">
            <FridayAvatar size="sm" className="shrink-0 opacity-90" />

            {blocked ? (
              <p className="flex-1 px-2 text-sm text-zinc-400 truncate">
                Daily limit · resets {usage.resetAtMst}
              </p>
            ) : (
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit()
                  if (e.key === 'Escape') setCommandBarOpen(false)
                }}
                disabled={loading}
                placeholder="Ask FRIDAY anything…"
                className={cn(
                  'flex-1 min-w-0 bg-transparent px-2 py-2.5 text-[15px] text-zinc-50',
                  'placeholder:text-zinc-500 outline-none'
                )}
              />
            )}

            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-300 mr-2" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5">
                <Sparkles className="h-3.5 w-3.5 text-violet-300/90" />
              </div>
            )}
          </div>
        </div>

        {!blocked && !loading && (
          <p className="mt-3 text-center text-[11px] text-zinc-500/90">
            Enter opens chat · Esc close · ⌥ Option anytime
          </p>
        )}
      </div>
    </div>
  )
}

export function useEbonicsShortcut(): void {
  const commandBarOpen = useStore((s) => s.commandBarOpen)
  const aiSidebarOpen = useStore((s) => s.aiSidebarOpen)
  const setCommandBarOpen = useStore((s) => s.setCommandBarOpen)
  const setAiSidebarOpen = useStore((s) => s.setAiSidebarOpen)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

      if (e.key === 'Escape') {
        if (commandBarOpen) {
          e.preventDefault()
          setCommandBarOpen(false)
        } else if (aiSidebarOpen) {
          e.preventDefault()
          setAiSidebarOpen(false)
        }
        return
      }

      if (e.key === 'Alt' && !e.repeat && !commandBarOpen && !typing) {
        e.preventDefault()
        setCommandBarOpen(true)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commandBarOpen, aiSidebarOpen, setCommandBarOpen, setAiSidebarOpen])
}
