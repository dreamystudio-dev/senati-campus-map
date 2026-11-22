import { useAppStore } from '../store'
import { controlsFor } from './copy'

export function ControlsCard() {
  const mode = useAppStore((state) => state.mode)
  const locked = useAppStore((state) => state.locked)

  const controls = controlsFor(mode, locked)

  return (
    <div
      data-testid="controls-card"
      className="pointer-events-none absolute bottom-6 right-6 z-30 select-none rounded-lg bg-[#12151b]/80 border border-[#2a303b] p-3 shadow-xl backdrop-blur-sm max-w-xs"
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
        Controls · {mode === 'top' ? 'Top View' : 'Free View'}
      </div>
      <ul className="space-y-1 text-xs text-gray-200">
        {controls.map((hint, idx) => (
          <li key={idx} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-[#5aa9e6]" />
            <span>{hint}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
