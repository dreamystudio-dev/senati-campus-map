import { Map, AttributionControl, type StyleSpecification, type MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection } from 'geojson'
import { sanitizeStyle } from './style'
import { PLACES_SOURCE_ID, placesLayers } from './layers'
import placesData from '../data/places.geojson'
import { useAppStore } from '../store'
import { mapOptions } from './options'

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
  const viewport = {
    width: rect.width || window.innerWidth || 1280,
    height: rect.height || window.innerHeight || 800,
  }

  const res = await fetch('https://tiles.openfreemap.org/styles/liberty')
  if (!res.ok) {
    throw new Error(`Failed to fetch basemap style: ${res.statusText}`)
  }
  const rawStyle = (await res.json()) as StyleSpecification
  const style = sanitizeStyle(rawStyle)

  const opts = mapOptions(viewport, container)

  const map = new Map({
    ...opts,
    style,
  })

  map.addControl(
    new AttributionControl({
      compact: false,
      customAttribution:
        '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">© OpenStreetMap</a>',
    }),
  )

  map.on('load', () => {
    // Add places GeoJSON source
    if (!map.getSource(PLACES_SOURCE_ID)) {
      map.addSource(PLACES_SOURCE_ID, {
        type: 'geojson',
        data: placesData as FeatureCollection,
      })
    }

    // Find the first symbol layer in the basemap to place our layers before (or add at top)
    const layers = map.getStyle().layers || []
    let firstSymbolId: string | undefined
    for (const l of layers) {
      if (l.type === 'symbol') {
        firstSymbolId = l.id
        break
      }
    }

    const interactiveLayerIds = [
      'places-buildings',
      'places-areas-fill',
      'places-points',
    ]

    for (const layer of placesLayers()) {
      if (!map.getLayer(layer.id)) {
        if (layer.id === 'places-labels') {
          map.addLayer(layer)
        } else {
          map.addLayer(layer, firstSymbolId)
        }
      }
    }

    // Hover interactions
    map.on('mousemove', (e: MapMouseEvent) => {
      const state = useAppStore.getState()
      if (state.mode === 'free' && state.locked) return

      const bboxSize = 6
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - bboxSize, e.point.y - bboxSize],
        [e.point.x + bboxSize, e.point.y + bboxSize],
      ]
      const features = map.queryRenderedFeatures(bbox, { layers: interactiveLayerIds })

      if (features.length > 0 && features[0].properties?.id) {
        map.getCanvas().style.cursor = 'pointer'
        state.setHovered(features[0].properties.id, { x: e.originalEvent.clientX, y: e.originalEvent.clientY })
      } else {
        map.getCanvas().style.cursor = ''
        state.setHovered(null)
      }
    })

    // Click selection
    map.on('click', (e: MapMouseEvent) => {
      const state = useAppStore.getState()
      if (state.mode === 'free' && state.locked) return

      const bboxSize = 6
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - bboxSize, e.point.y - bboxSize],
        [e.point.x + bboxSize, e.point.y + bboxSize],
      ]
      const features = map.queryRenderedFeatures(bbox, { layers: interactiveLayerIds })

      if (features.length > 0 && features[0].properties?.id) {
        state.select(features[0].properties.id)
      } else {
        state.select(null)
      }
    })
  })

  return map
}
