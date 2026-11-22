import type { StyleSpecification, LayerSpecification } from 'maplibre-gl'

/**
 * OpenFreeMap's Liberty style is light. The page is dark, so the basemap is
 * restyled here into a muted dark palette that lets the category colours carry
 * the map. Basemap buildings and POIs are removed entirely: our own layers
 * replace them.
 */
export const DARK_BASEMAP = {
  background: '#12151b',
  water: '#0f1a24',
  waterLine: '#1c2b38',
  land: '#171d22',
  green: '#18211d',
  road: '#2b3340',
  roadCasing: '#0e1218',
  boundary: '#2a303b',
  text: '#93a0b0',
  halo: '#12151b',
} as const

const FILL_AREAS = /^(park|landcover|landuse|natural|airport|aeroway)/
const ROAD_LINES = /^(road|bridge|tunnel|highway|aeroway)[_-]/

function darkenLayer(layer: LayerSpecification): LayerSpecification {
  const paint = { ...(layer.paint ?? {}) } as Record<string, unknown>
  const id = layer.id

  if (layer.type === 'background') {
    paint['background-color'] = DARK_BASEMAP.background
  } else if (layer.type === 'fill' && id.startsWith('water')) {
    paint['fill-color'] = DARK_BASEMAP.water
  } else if (layer.type === 'line' && id.startsWith('water')) {
    paint['line-color'] = DARK_BASEMAP.waterLine
  } else if (layer.type === 'fill' && FILL_AREAS.test(id)) {
    paint['fill-color'] = id.startsWith('park') ? DARK_BASEMAP.green : DARK_BASEMAP.land
    paint['fill-outline-color'] = 'rgba(0,0,0,0)'
  } else if (layer.type === 'line' && id.startsWith('park')) {
    paint['line-color'] = DARK_BASEMAP.green
  } else if (layer.type === 'line' && ROAD_LINES.test(id)) {
    paint['line-color'] = id.includes('casing') ? DARK_BASEMAP.roadCasing : DARK_BASEMAP.road
  } else if (layer.type === 'line' && id.startsWith('boundary')) {
    paint['line-color'] = DARK_BASEMAP.boundary
  } else if (layer.type === 'symbol') {
    if ('text-color' in paint) paint['text-color'] = DARK_BASEMAP.text
    if ('text-halo-color' in paint) paint['text-halo-color'] = DARK_BASEMAP.halo
  }

  return { ...layer, paint } as LayerSpecification
}

export function sanitizeStyle(style: StyleSpecification): StyleSpecification {
  const filteredLayers = style.layers.filter((layer: LayerSpecification) => {
    const id = layer.id
    if (id.startsWith('building') || id.startsWith('poi')) {
      return false
    }
    return true
  })

  return {
    ...style,
    layers: filteredLayers.map(darkenLayer),
  }
}
