import { cn } from '@/lib/utils'
import type { OllamaUsageSnapshot } from '@/hooks/useOllamaUsageTracker'
import { CONFIG } from '@/lib/config'

function remainingBarColor(remainingPct: number): string {
  if (remainingPct <= 5) return 'bg-red-500'
  if (remainingPct <= 20) return 'bg-amber-500'
  return 'bg-emerald-500'
}

/** Bar fill = % remaining (full = lots left, empty = used up) */
function RemainingBar({
  remainingPct,
  label,
  sublabel,
  barClass
}: {
  remainingPct: number
  label: string
  sublabel?: string
  barClass?: string
}): JSX.Element {
  const pct = Math.min(100, Math.max(0, remainingPct))
  const color = barClass ?? remainingBarColor(pct)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] gap-2">
        <span className="text-zinc-500">{label}</span>
        {sublabel && <span className="text-zinc-400 tabular-nums text-right shrink-0">{sublabel}</span>}
      </div>
      <div className="h-2 rounded-full bg-zinc-800/80 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function usageBorderClass(level: OllamaUsageSnapshot['warningLevel']): string {
  if (level === 'blocked') return 'border-zinc-600 opacity-75'
  if (level === 'critical') return 'border-red-500/60 ring-1 ring-red-500/30'
  if (level === 'low') return 'border-amber-400/50 ring-1 ring-amber-400/20'
  return 'border-white/15'
}

export function UsageBadge({ level }: { level: OllamaUsageSnapshot['warningLevel'] }): JSX.Element | null {
  if (level === 'ok') return null
  const label =
    level === 'blocked' ? 'Pool empty' : level === 'critical' ? 'Almost out' : 'Running low'
  const cls =
    level === 'blocked'
      ? 'bg-zinc-700 text-zinc-300'
      : level === 'critical'
        ? 'bg-red-500/20 text-red-400'
        : 'bg-amber-500/20 text-amber-400'
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide', cls)}>
      {label}
    </span>
  )
}

export function OllamaFreeTierMeter({ usage }: { usage: OllamaUsageSnapshot }): JSX.Element {
  const chatSharePct =
    usage.dailyTokenLimit > 0
      ? Math.round((usage.chatTokenCount / usage.dailyTokenLimit) * 100)
      : 0
  const agentSharePct =
    usage.dailyTokenLimit > 0
      ? Math.round((usage.agentTokenCount / usage.dailyTokenLimit) * 100)
      : 0
  const chatRemainingPct = Math.max(0, 100 - chatSharePct)
  const agentRemainingPct = Math.max(0, 100 - agentSharePct)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-300 font-medium">
          Free pool{' '}
          <span className="tabular-nums text-zinc-100">{usage.remainingPercent}% left</span>
        </span>
        <UsageBadge level={usage.warningLevel} />
      </div>

      <RemainingBar
        remainingPct={usage.remainingPercent}
        label={`${usage.remaining.toLocaleString()} of ${usage.dailyTokenLimit.toLocaleString()} tokens left`}
        sublabel={`${usage.usedPercent}% used`}
      />

      {usage.isLimitReached ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-[10px] text-red-200/90 space-y-1">
          <p className="font-medium">Pool used up — FRIDAY pauses until reset</p>
          <p>Daily reset: {usage.resetAtMst}</p>
          <p>Session refresh (5h): {usage.resetAtSession}</p>
          <p>Weekly reset: {usage.resetAtWeekly}</p>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Resets daily {usage.resetAtMst} · session {usage.resetAtSession} · weekly{' '}
          {usage.resetAtWeekly}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-0.5">
        <div className="rounded-lg liquid-glass-inset px-2.5 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-medium text-sky-300/90">Normal chat</span>
            <span className="text-[10px] tabular-nums text-zinc-400">
              {usage.chatTokenCount.toLocaleString()}
            </span>
          </div>
          <RemainingBar
            remainingPct={chatRemainingPct}
            label={CONFIG.ollama.chatModel}
            sublabel={`${chatSharePct}% of pool`}
            barClass="bg-sky-500"
          />
        </div>

        <div className="rounded-lg liquid-glass-inset px-2.5 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-medium text-violet-300/90">Agent /agent</span>
            <span className="text-[10px] tabular-nums text-zinc-400">
              {usage.agentTokenCount.toLocaleString()}
            </span>
          </div>
          <RemainingBar
            remainingPct={agentRemainingPct}
            label={CONFIG.ollama.agentModel}
            sublabel={`${agentSharePct}% of pool`}
            barClass="bg-violet-500"
          />
        </div>
      </div>

      <p className="text-[10px] text-zinc-500">
        ~{Math.max(0, Math.floor(usage.remaining / 120))} quick chats left ·{' '}
        {usage.requestsInLastMinute}/8 req/min
      </p>
    </div>
  )
}

export function OllamaFreeTierPill({ usage }: { usage: OllamaUsageSnapshot }): JSX.Element {
  const color =
    usage.warningLevel === 'blocked' || usage.warningLevel === 'critical'
      ? 'text-red-400 border-red-500/30 bg-red-500/10'
      : usage.warningLevel === 'low'
        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'

  return (
    <div className={cn('shrink-0 rounded-lg border px-2.5 py-1.5 text-center min-w-[5.5rem]', color)}>
      <p className="text-[9px] uppercase tracking-wider opacity-70">Left today</p>
      <p className="text-xs font-bold tabular-nums">{usage.remainingPercent}%</p>
      <p className="text-[8px] opacity-80 tabular-nums mt-0.5">{usage.remaining.toLocaleString()} tok</p>
    </div>
  )
}
