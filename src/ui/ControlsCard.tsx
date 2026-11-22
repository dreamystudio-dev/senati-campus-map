import { useAppStore } from '../store'
import { THEME } from '../theme'
import { controlsFor } from './copy'

export function ControlsCard() {
  const mode = useAppStore((state) => state.mode)
  const locked = useAppStore((state) => state.locked)
  const lockRefused = useAppStore((state) => state.lockRefused)

  const controls = controlsFor(mode, locked, lockRefused)

  return (
    <div
      data-testid="controls-card"
      className="pointer-events-none absolute bottom-6 right-6 z-30 select-none rounded-lg border p-3 shadow-xl reduce-blur max-w-xs"
      style={{ backgroundColor: THEME.panel, borderColor: THEME.panelBorder }}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
        Controls · {mode === 'top' ? 'Top View' : 'Free View'}
      </div>
      <ul className="space-y-1 text-xs text-gray-200">
        {controls.map((hint, idx) => (
          <li key={idx} className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: THEME.accent }} />
            <span>{hint}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
