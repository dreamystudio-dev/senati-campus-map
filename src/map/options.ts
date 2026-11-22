import type { MapOptions, Map } from 'maplibre-gl'
import type { CameraMode } from '../store'
import { CAMPUS, fitZoom, paddedBounds } from './bounds'

export const TOP_VIEW_LIMITS = {
  minZoom: 15.5,
  maxZoom: 19.5,
  maxPitch: 60,
  centerClampedToGround: true,
} as const

// A 2 m eye is roughly zoom 21 and a level gaze is pitch 90°. Both are
// impossible under the top-view caps, so free view needs its own limits.
export const FREE_VIEW_LIMITS = {
  minZoom: 15.5,
  maxZoom: 22,
  maxPitch: 95,
  centerClampedToGround: false,
} as const

export interface CameraLimitTarget {
  setMinZoom(zoom: number): void
  setMaxZoom(zoom: number): void
  setMaxPitch(pitch: number): void
  setCenterClampedToGround(clamped: boolean): void
}

export function applyCameraLimits(map: CameraLimitTarget, mode: CameraMode): void {
  const limits = mode === 'free' ? FREE_VIEW_LIMITS : TOP_VIEW_LIMITS
  map.setMinZoom(limits.minZoom)
  map.setMaxZoom(limits.maxZoom)
  map.setMaxPitch(limits.maxPitch)
  map.setCenterClampedToGround(limits.centerClampedToGround)
}

export function mapOptions(
  viewport: { width: number; height: number },
  container?: HTMLElement,
): MapOptions {
  return {
    container: container ?? (null as unknown as HTMLElement),
    center: CAMPUS.center,
    zoom: fitZoom(CAMPUS.bounds, viewport, 48),
    maxBounds: paddedBounds(CAMPUS.bounds, 0.1),
    minZoom: TOP_VIEW_LIMITS.minZoom,
    maxZoom: TOP_VIEW_LIMITS.maxZoom,
    maxPitch: TOP_VIEW_LIMITS.maxPitch,
    centerClampedToGround: TOP_VIEW_LIMITS.centerClampedToGround,
    renderWorldCopies: false,
    attributionControl: false,
  }
}

export function fitCampus(map: Map): void {
  const container = map.getContainer()
  const rect = container.getBoundingClientRect()
  const zoom = fitZoom(CAMPUS.bounds, { width: rect.width || 1280, height: rect.height || 800 }, 48)

  map.jumpTo({
    center: CAMPUS.center,
    zoom,
    pitch: 0,
    bearing: 0,
  })
}
