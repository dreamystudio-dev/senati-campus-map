import { Map, AttributionControl, type StyleSpecification, type MapMouseEvent } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection } from 'geojson'
import { sanitizeStyle } from './style'
import { isFatalMapError } from './errors'
import { syncHoverSource } from './hover'
import { PLACES_SOURCE_ID, HOVER_SOURCE_ID, placesLayers } from './layers'
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

  let rawStyle: StyleSpecification
  try {
    const res = await fetch('https://tiles.openfreemap.org/styles/liberty')
    if (!res.ok) {
      throw new Error(`Failed to fetch basemap style: ${res.statusText}`)
    }
    rawStyle = (await res.json()) as StyleSpecification
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch basemap style'
    useAppStore.getState().setMapStatus('error', msg)
    throw err
  }

  const style = sanitizeStyle(rawStyle)
  const opts = mapOptions(viewport, container)

  const map = new Map({
    ...opts,
    style,
  })

  // Set map ready status on first idle
  map.once('idle', () => {
    if (useAppStore.getState().mapStatus !== 'error') {
      useAppStore.getState().setMapStatus('ready')
    }
  })

  // Only a failed tile source leaves an empty basemap; glyph/sprite errors do not.
  map.on('error', (e) => {
    if (isFatalMapError(e)) {
      useAppStore.getState().setMapStatus('error', 'Basemap tiles or style failed to load.')
    }
  })

  // The TileJSON already carries the OpenFreeMap/OSM attribution; adding a
  // custom string here renders it twice.
  map.addControl(new AttributionControl({ compact: false }))

  map.on('load', () => {
    // Add places GeoJSON source
    if (!map.getSource(PLACES_SOURCE_ID)) {
      map.addSource(PLACES_SOURCE_ID, {
        type: 'geojson',
        data: placesData as FeatureCollection,
      })
    }

    if (!map.getSource(HOVER_SOURCE_ID)) {
      map.addSource(HOVER_SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
    }

    // Keep hover source in sync with store, and stop when the map is removed.
    const unsubscribeHover = syncHoverSource(map, placesData as FeatureCollection)
    map.once('remove', unsubscribeHover)

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
      'places-buildings-outline-volume',
      'places-areas-fill',
      'places-areas-outline-tint',
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

    map.on('mouseout', () => {
      map.getCanvas().style.cursor = ''
      useAppStore.getState().setHovered(null)
    })

    // Click selection
    map.on('click', (e: MapMouseEvent) => {
      const state = useAppStore.getState()

      const bboxSize = 6
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - bboxSize, e.point.y - bboxSize],
        [e.point.x + bboxSize, e.point.y + bboxSize],
      ]
      const features = map.queryRenderedFeatures(bbox, { layers: interactiveLayerIds })

      if (features.length > 0 && features[0].properties?.id) {
        state.select(features[0].properties.id)
        return
      }

      state.select(null)
    })
  })

  return map
}
