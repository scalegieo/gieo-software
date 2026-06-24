import { useEffect } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/store/useStore'
import { GieoLogo } from '@/components/GieoLogo'

export function CompletionCelebration(): JSX.Element | null {
  const { celebration, dismissCelebration } = useStore()

  useEffect(() => {
    if (!celebration) return
    const timer = setTimeout(() => dismissCelebration(), 8000)
    return () => clearTimeout(timer)
  }, [celebration, dismissCelebration])

  if (!celebration) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center gap-6 px-8 py-12 text-center max-w-md">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full bg-zinc-100 animate-ping"
              style={{
                left: `${10 + (i * 17) % 80}%`,
                top: `${5 + (i * 23) % 70}%`,
                animationDelay: `${i * 0.12}s`,
                opacity: 0.4
              }}
            />
          ))}
        </div>

        <div className="relative animate-in zoom-in-95 duration-500">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-zinc-100 bg-zinc-900 shadow-[0_0_60px_rgba(255,255,255,0.15)]">
            <CheckCircle2 className="h-10 w-10 text-zinc-100" />
          </div>
        </div>

        <GieoLogo className="h-8 relative" />

        <div className="relative space-y-2 animate-in slide-in-from-bottom-4 duration-700">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">{celebration.title}</h2>
          <p className="text-sm text-zinc-400">{celebration.subtitle}</p>
          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1 pt-2">
            <Sparkles className="h-3 w-3" />
            Team notified in chat
          </p>
        </div>

        <Button onClick={dismissCelebration} className="relative mt-2">
          Continue
        </Button>
      </div>
    </div>
  )
}
