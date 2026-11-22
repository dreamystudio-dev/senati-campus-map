import { useAppStore } from '../store'

interface ErrorOverlayProps {
  onRetry?: () => void
}

export function ErrorOverlay({ onRetry }: ErrorOverlayProps) {
  const mapStatus = useAppStore((state) => state.mapStatus)
  const mapError = useAppStore((state) => state.mapError)

  if (mapStatus !== 'error') return null

  return (
    <div
      data-testid="error-overlay"
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#12151b]/95 p-6 reduce-blur"
      role="alert"
    >
      <div className="max-w-md w-full rounded-xl bg-[#1f242e] border border-red-500/30 p-6 text-center shadow-2xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400 mb-4">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-white mb-1.5">Map unavailable</h2>
        <p className="text-sm text-gray-400 mb-6">
          {mapError || 'Could not load campus map tiles. Please check your network connection.'}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#5aa9e6] hover:bg-[#4a98d5] text-white text-xs font-semibold tracking-wide transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-[#5aa9e6] focus:ring-offset-2 focus:ring-offset-[#12151b]"
          >
            Retry
          </button>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-gray-500">
          OpenFreeMap · © OpenStreetMap contributors
        </div>
      </div>
    </div>
  )
}
