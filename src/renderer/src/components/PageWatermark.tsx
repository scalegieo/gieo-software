import gieoIcon from '@/assets/branding/gieo-icon.png'
import pythonLogo from '@/assets/branding/python-logo.png'
import { useStore } from '@/store/useStore'

export function PageWatermark(): JSX.Element {
  const business = useStore((s) => s.activeBusiness)
  const isPython = business === 'python'

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <img
        src={isPython ? pythonLogo : gieoIcon}
        alt=""
        className={
          isPython
            ? 'h-[min(520px,70vw)] w-[min(520px,70vw)] select-none rounded-[3rem] object-contain opacity-[0.05]'
            : 'h-[min(520px,70vw)] w-[min(520px,70vw)] select-none object-contain opacity-[0.04]'
        }
      />
    </div>
  )
}
