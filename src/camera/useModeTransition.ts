import { useEffect } from 'react'
import type { Map } from 'maplibre-gl'
import { useAppStore, type CameraMode } from '../store'
import { transitionPlan, requestPointerLockSafe, FREE_VANTAGE } from './transition'
import { playerFromVantage, type PlayerRef } from './player'
import { applyCameraLimits } from '../map/options'

export function useModeTransition(map: Map | null, playerRef: PlayerRef): {
  switchTo: (nextMode: CameraMode) => void
} {
  const setMode = useAppStore((state) => state.setMode)
  const setLocked = useAppStore((state) => state.setLocked)
  const setLockRefused = useAppStore((state) => state.setLockRefused)
  const setTransitioning = useAppStore((state) => state.setTransitioning)

  const switchTo = (nextMode: CameraMode) => {
    if (!map) return

    const state = useAppStore.getState()
    if (state.mode === nextMode || state.transitioning) return

    const rect = map.getContainer().getBoundingClientRect()
    const plan = transitionPlan(state.mode, nextMode, {
      width: rect.width || 1280,
      height: rect.height || 800,
    })
    if (!plan) {
      setMode(nextMode)
      return
    }

    // The caps are per-mode: free view needs a zoom beyond 19.5 and a pitch
    // beyond 60 before the first frame of the first-person loop runs.
    applyCameraLimits(map, nextMode)
    setTransitioning(true)

    if (nextMode === 'free') {
      // Ask for the pointer inside the click gesture. Waiting for the async
      // moveend loses transient activation in browsers other than Chrome.
      setLocked(true)
      void requestPointerLockSafe(map.getCanvas()).then((granted) => {
        setLocked(granted)
        setLockRefused(!granted)
      })
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const duration = prefersReducedMotion ? 0 : 1200

    // MapLibre fires moveend synchronously for duration 0 (reduced motion), so
    // the listener must exist before easeTo starts or the switch never finishes.
    map.once('moveend', () => {
      setTransitioning(false)
      setMode(nextMode)

      if (nextMode === 'free') {
        // Hand the eased drone vantage to the player so the first RAF frame
        // does not snap the camera to the origin.
        playerRef.current = playerFromVantage(FREE_VANTAGE)
      } else {
        setLocked(false)
        setLockRefused(false)
        if (document.exitPointerLock) {
          document.exitPointerLock()
        }
      }
    })

    map.easeTo({ ...plan, duration })
  }

  // Handle Escape key to unlock pointer
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useAppStore.getState().mode === 'free') {
        if (document.exitPointerLock) {
          document.exitPointerLock()
        }
        setLocked(false)
        setLockRefused(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setLocked, setLockRefused])

  return { switchTo }
}
