import type { MapOptions, Map } from 'maplibre-gl'
import { CAMPUS, fitZoom, paddedBounds } from './bounds'

export const TOP_VIEW_LIMITS = {
  minZoom: 15.5,
  maxZoom: 19.5,
  maxPitch: 60,
  centerClampedToGround: true,
} as const

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
