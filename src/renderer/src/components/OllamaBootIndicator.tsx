import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useOllamaBoot, ollamaStatusLabel } from '@/hooks/useOllamaBoot'
import { cn } from '@/lib/utils'

/** Global Ollama auto-boot indicator — mounts once in the app shell */
export function OllamaBootIndicator(): JSX.Element {
  const boot = useOllamaBoot(true)
  const loading = boot.warming && !boot.ready
  const errored = boot.phase === 'error' && !boot.ready

  return (
    <Badge
      variant={boot.ready ? 'success' : errored ? 'warning' : 'secondary'}
      className={cn(
        'hidden sm:flex text-[10px] max-w-[200px] truncate gap-1',
        loading && 'border-sky-500/30 text-sky-300'
      )}
      title={boot.message}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
      {ollamaStatusLabel(boot)}
    </Badge>
  )
}
