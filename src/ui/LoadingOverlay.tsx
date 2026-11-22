import { useAppStore } from '../store'
import { THEME } from '../theme'

export function LoadingOverlay() {
  const mapStatus = useAppStore((state) => state.mapStatus)
  const isVisible = mapStatus === 'loading'

  return (
    <div
      data-testid="loading-overlay"
      className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: THEME.bg }}
      aria-hidden={!isVisible}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20" style={{ borderTopColor: THEME.accent }} />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Loading Campus Map...
        </span>
      </div>
    </div>
  )
}
