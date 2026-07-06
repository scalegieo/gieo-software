import gieoWordmark from '@/assets/branding/gieo-wordmark.png'
import gieoIcon from '@/assets/branding/gieo-icon.png'
import { cn } from '@/lib/utils'

interface GieoLogoProps {
  variant?: 'wordmark' | 'icon'
  className?: string
  iconClassName?: string
  /** Fill parent container (sidebar header) */
  fill?: boolean
}

export function GieoLogo({ variant = 'wordmark', className, iconClassName, fill }: GieoLogoProps): JSX.Element {
  if (variant === 'icon') {
    return (
      <img
        src={gieoIcon}
        alt="GIEO"
        className={cn('h-8 w-8 object-contain', iconClassName)}
      />
    )
  }

  return (
    <img
      src={gieoWordmark}
      alt="GIEO"
      className={cn(
        fill ? 'h-full w-full object-contain object-left' : 'h-9 w-auto object-contain',
        className
      )}
    />
  )
}
