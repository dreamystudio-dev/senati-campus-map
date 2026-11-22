import { useAppStore, type CameraMode } from '../store'

interface ModeSwitchProps {
  onSwitch?: (mode: CameraMode) => void
}

export function ModeSwitch({ onSwitch }: ModeSwitchProps) {
  const mode = useAppStore((state) => state.mode)
  const transitioning = useAppStore((state) => state.transitioning)

  const handleSelect = (targetMode: CameraMode) => {
    if (transitioning || mode === targetMode) return
    onSwitch?.(targetMode)
  }

  return (
    <div
      role="group"
      aria-label="Camera view mode"
      className="absolute top-6 right-6 z-30 flex items-center p-1 rounded-lg bg-[#12151b]/80 border border-white/15 backdrop-blur-md shadow-lg"
    >
      <button
        type="button"
        aria-pressed={mode === 'top'}
        disabled={transitioning}
        onClick={() => handleSelect('top')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === 'top'
            ? 'bg-white/20 text-white shadow'
            : 'text-gray-400 hover:text-white'
        } ${transitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Top
      </button>

      <button
        type="button"
        aria-pressed={mode === 'free'}
        disabled={transitioning}
        onClick={() => handleSelect('free')}
        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          mode === 'free'
            ? 'bg-white/20 text-white shadow'
            : 'text-gray-400 hover:text-white'
        } ${transitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Free
      </button>
    </div>
  )
}
