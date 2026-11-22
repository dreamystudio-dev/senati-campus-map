import campusData from '../data/campus.json'

export type Bounds = [west: number, south: number, east: number, north: number]

export interface CampusInfo {
  name: string
  city: string
  center: [number, number]
  bounds: Bounds
}

export const CAMPUS: CampusInfo = campusData as CampusInfo

export function paddedBounds(bounds: Bounds, ratio: number): Bounds {
  const [w, s, e, n] = bounds
  const dx = (e - w) * ratio
  const dy = (n - s) * ratio
  return [w - dx, s - dy, e + dx, n + dy]
}

export function fitZoom(
  bounds: Bounds,
  viewport: { width: number; height: number },
  paddingPx = 0,
): number {
  const [w, s, e, n] = bounds
  const availableWidth = Math.max(1, viewport.width - paddingPx * 2)
  const availableHeight = Math.max(1, viewport.height - paddingPx * 2)

  const deltaLng = Math.abs(e - w)

  const yMerc = (lat: number) => {
    const sin = Math.sin((lat * Math.PI) / 180)
    return Math.log((1 + sin) / (1 - sin)) / 2
  }
  const deltaYMerc = Math.abs(yMerc(n) - yMerc(s))

  // MapLibre's world size at zoom 0 is 512 pixels:
  // worldSize = 512 * 2^zoom
  // px_x = (deltaLng / 360) * 512 * 2^zoom
  // px_y = (deltaYMerc / (2 * Math.PI)) * 512 * 2^zoom
  const zoomX = Math.log2((availableWidth * 360) / (deltaLng * 512))
  const zoomY = Math.log2((availableHeight * 2 * Math.PI) / (deltaYMerc * 512))

  const zoom = Math.min(zoomX, zoomY)

  return Math.min(19.5, Math.max(15.5, Number(zoom.toFixed(4))))
}
