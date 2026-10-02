import pythonLogo from '@/assets/branding/python-logo.png'
import { GieoLogo } from '@/components/GieoLogo'
import { useStore } from '@/store/useStore'

/** Sidebar brand mark — follows the active GIEO / Python workspace. */
export function BusinessLogo(): JSX.Element {
  const business = useStore((s) => s.activeBusiness)

  if (business === 'python') {
    return (
      <img
        src={pythonLogo}
        alt="Python"
        className="h-full max-h-[4.5rem] w-full rounded-xl object-cover select-none"
        draggable={false}
      />
    )
  }

  return <GieoLogo fill className="origin-left scale-[2.1]" />
}
