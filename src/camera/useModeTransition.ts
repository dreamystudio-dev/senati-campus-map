import { useEffect } from 'react'
import type { Map } from 'maplibre-gl'
import { useAppStore, type CameraMode } from '../store'
import { transitionPlan, requestPointerLockSafe } from './transition'
import { fitCampus } from '../map/options'

export function useModeTransition(map: Map | null): {
  switchTo: (nextMode: CameraMode) => void
} {
  const mode = useAppStore((state) => state.mode)
  const setMode = useAppStore((state) => state.setMode)
  const setLocked = useAppStore((state) => state.setLocked)
  const setTransitioning = useAppStore((state) => state.setTransitioning)

  const switchTo = (nextMode: CameraMode) => {
    if (!map || mode === nextMode) return

    const plan = transitionPlan(mode, nextMode)
    if (!plan) {
      setMode(nextMode)
      return
    }

    setTransitioning(true)

    map.easeTo({
      ...plan,
      duration: 1200,
    })

    map.once('moveend', async () => {
      setTransitioning(false)
      setMode(nextMode)

      if (nextMode === 'free') {
        const canvas = map.getCanvas()
        const lockedSuccess = await requestPointerLockSafe(canvas)
        setLocked(lockedSuccess)
      } else {
        fitCampus(map)
        setLocked(false)
        if (document.exitPointerLock) {
          document.exitPointerLock()
        }
      }
    })
  }

  // Handle Escape key to unlock pointer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useAppStore.getState().mode === 'free') {
        if (document.exitPointerLock) {
          document.exitPointerLock()
        }
        setLocked(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setLocked])

  return { switchTo }
}
