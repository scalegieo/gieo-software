import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type LiquidGlassVariant = 'panel' | 'bar' | 'subtle' | 'inset' | 'popover'

const variantClass: Record<LiquidGlassVariant, string> = {
  panel: 'liquid-glass-panel',
  bar: 'liquid-glass-bar',
  subtle: 'liquid-glass-subtle',
  inset: 'liquid-glass-inset',
  popover: 'liquid-glass-popover'
}

interface LiquidGlassProps {
  variant?: LiquidGlassVariant
  className?: string
  children: ReactNode
  as?: keyof JSX.IntrinsicElements
}

export function LiquidGlass({
  variant = 'panel',
  className,
  children,
  as: Tag = 'div'
}: LiquidGlassProps): JSX.Element {
  return <Tag className={cn(variantClass[variant], className)}>{children}</Tag>
}
