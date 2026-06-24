import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-400',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-100/10 text-zinc-200',
        secondary: 'border-transparent bg-zinc-800 text-zinc-300',
        destructive: 'border-transparent bg-red-500/20 text-red-400',
        outline: 'text-zinc-400 border-zinc-700',
        success: 'border-transparent bg-emerald-500/20 text-emerald-400',
        warning: 'border-transparent bg-amber-500/20 text-amber-400',
        pending: 'border-transparent bg-blue-500/20 text-blue-400'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
