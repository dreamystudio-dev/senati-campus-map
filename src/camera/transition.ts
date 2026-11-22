import type { CameraOptions } from 'maplibre-gl'
import { CAMPUS, fitZoom } from '../map/bounds'

export const FREE_VANTAGE = {
  lng: CAMPUS.center[0],
  lat: CAMPUS.center[1] - 0.0015,
  eyeM: 25 as const,
  mapPitch: 55,
  headingDeg: 90, // heading north/northeast towards main campus
  zoom: 17.5,
}

export function transitionPlan(
  from: 'top' | 'free',
  to: 'top' | 'free',
  viewport: { width: number; height: number } = { width: 1280, height: 800 },
): CameraOptions | null {
  if (from === to) return null

  if (to === 'free') {
    return {
      center: [FREE_VANTAGE.lng, FREE_VANTAGE.lat],
      pitch: FREE_VANTAGE.mapPitch,
      bearing: 0,
      zoom: FREE_VANTAGE.zoom,
    }
  }

  // to === 'top' — include the fitted zoom so the ease owns the whole move.
  return {
    center: CAMPUS.center,
    zoom: fitZoom(CAMPUS.bounds, viewport, 48),
    pitch: 0,
    bearing: 0,
  }
}

export async function requestPointerLockSafe(el: HTMLElement): Promise<boolean> {
  try {
    const promise = (el.requestPointerLock as unknown as () => Promise<void> | undefined)()
    if (promise && typeof promise.then === 'function') {
      await promise
      return true
    }
    return true
  } catch {
    return false
  }
}
