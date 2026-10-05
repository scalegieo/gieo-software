import * as React from 'react'
import { cn } from '@/lib/utils'
import { scoreColor, scoreGrade } from '@/lib/leadIntel'

export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 rounded-md border border-zinc-800 bg-zinc-950 px-2.5 text-sm text-zinc-100 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
)
NativeSelect.displayName = 'NativeSelect'

export function FieldLabel({ children }: { children: React.ReactNode }): JSX.Element {
  return <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{children}</label>
}

export function ScoreBadge({ score, className }: { score: number | null | undefined; className?: string }): JSX.Element {
  const c = scoreColor(score)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ring-1',
        c.bg,
        c.text,
        c.ring,
        className
      )}
      title={score == null ? 'Not analyzed yet' : `AI lead score ${score}/100`}
    >
      {score == null ? 'No score' : `${score} · ${scoreGrade(score)}`}
    </span>
  )
}

/** Semicircle gauge, red → yellow → green → blue. */
export function LeadScoreGauge({ score, size = 180 }: { score: number | null | undefined; size?: number }): JSX.Element {
  const value = Math.max(0, Math.min(100, score ?? 0))
  const r = size / 2 - 14
  const cx = size / 2
  const cy = size / 2
  const circumference = Math.PI * r
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const c = scoreColor(score)
  const id = React.useId()

  return (
    <div className="relative flex flex-col items-center" style={{ width: size, height: size / 2 + 34 }}>
      <svg width={size} height={size / 2 + 12} viewBox={`0 0 ${size} ${size / 2 + 12}`}>
        <defs>
          <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="45%" stopColor="#fbbf24" />
            <stop offset="70%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="#27272a" strokeWidth={12} strokeLinecap="round" />
        {score != null && (
          <path
            d={arc}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - value / 100)}
            style={{ transition: 'stroke-dashoffset 700ms ease' }}
          />
        )}
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className={cn('text-3xl font-bold tabular-nums leading-none', c.text)}>{score ?? '—'}</span>
        <span className="text-[11px] text-zinc-500 mt-1">
          {score == null ? 'Not scored' : `Grade ${scoreGrade(score)} · out of 100`}
        </span>
      </div>
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
  action?: React.ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800/80 mb-3">
        <Icon className="h-5 w-5 text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="text-xs text-zinc-500 mt-1 max-w-sm">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorNote({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <p className="text-xs text-amber-300 border border-amber-500/20 bg-amber-500/10 rounded-md px-3 py-2">{children}</p>
  )
}
