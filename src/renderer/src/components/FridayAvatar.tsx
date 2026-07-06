import fridayLogo from '@/assets/branding/friday-logo.png'

interface FridayAvatarProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'h-6 w-6', md: 'h-8 w-8', lg: 'h-10 w-10' }

export function FridayAvatar({ className = '', size = 'md' }: FridayAvatarProps): JSX.Element {
  return (
    <img
      src={fridayLogo}
      alt="FRIDAY — GIEO Assistant"
      className={`rounded-full object-cover ring-1 ring-white/15 bg-black ${sizes[size]} ${className}`}
    />
  )
}

/** @deprecated Use FridayAvatar */
export const EbonicsAvatar = FridayAvatar
