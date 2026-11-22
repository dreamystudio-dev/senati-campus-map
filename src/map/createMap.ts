import { Map, AttributionControl, type StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { CAMPUS, fitZoom, paddedBounds } from './bounds'
import { sanitizeStyle } from './style'

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}

export async function createMap(container: HTMLElement): Promise<Map> {
  const rect = container.getBoundingClientRect()
  const initialZoom = fitZoom(
    CAMPUS.bounds,
    {
      width: rect.width || window.innerWidth || 1280,
      height: rect.height || window.innerHeight || 800,
    },
    48,
  )

  const res = await fetch('https://tiles.openfreemap.org/styles/liberty')
  if (!res.ok) {
    throw new Error(`Failed to fetch basemap style: ${res.statusText}`)
  }
  const rawStyle = (await res.json()) as StyleSpecification
  const style = sanitizeStyle(rawStyle)

  const map = new Map({
    container,
    style,
    center: CAMPUS.center,
    zoom: initialZoom,
    maxBounds: paddedBounds(CAMPUS.bounds, 0.1),
    minZoom: 15.5,
    maxZoom: 19.5,
    maxPitch: 60,
    renderWorldCopies: false,
    attributionControl: false,
  })

  map.addControl(
    new AttributionControl({
      compact: false,
      customAttribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a>',
    }),
  )

  return map
}
