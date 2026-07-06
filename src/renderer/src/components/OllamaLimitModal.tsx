import { CONFIG } from '@/lib/config'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import type { OllamaUsageSnapshot } from '@/hooks/useOllamaUsageTracker'

interface OllamaLimitModalProps {
  open: boolean
  usage: OllamaUsageSnapshot
  onDismiss: () => void
}

export function OllamaLimitModal({ open, usage, onDismiss }: OllamaLimitModalProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent className="sm:max-w-md liquid-glass-panel border-white/15">
        <DialogHeader>
          <DialogTitle>FRIDAY free pool used up</DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p>
              You&apos;ve used all {usage.dailyTokenLimit.toLocaleString()} tokens in today&apos;s free
              pool ({usage.dailyTokenCount.toLocaleString()} used). FRIDAY will be back after the next
              reset.
            </p>
            <div className="rounded-lg liquid-glass-inset px-3 py-2.5 text-sm text-zinc-300 space-y-1.5">
              <p>
                <span className="text-zinc-500">Daily reset:</span> {usage.resetAtMst}
              </p>
              <p>
                <span className="text-zinc-500">Session refresh (5h):</span> {usage.resetAtSession}
              </p>
              <p>
                <span className="text-zinc-500">Weekly reset:</span> {usage.resetAtWeekly}
              </p>
            </div>
            <p className="text-sm text-zinc-500">
              Ollama Free Cloud also has its own GPU limits — session refresh is usually the fastest way
              to get a few more messages in.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onDismiss}>
            OK
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              window.open(CONFIG.ollama.proUpgradeUrl, '_blank')
              onDismiss()
            }}
          >
            Ollama plans
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
