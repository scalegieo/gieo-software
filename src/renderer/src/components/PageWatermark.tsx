import gieoIcon from '@/assets/branding/gieo-icon.png'

export function PageWatermark(): JSX.Element {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden"
      aria-hidden
    >
      <img
        src={gieoIcon}
        alt=""
        className="h-[min(520px,70vw)] w-[min(520px,70vw)] select-none object-contain opacity-[0.04]"
      />
    </div>
  )
}
