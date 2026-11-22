import type { ExpressionSpecification, FilterSpecification, LayerSpecification } from 'maplibre-gl'
import { CATEGORIES, type CategoryId } from '../categories'

export const PLACES_SOURCE_ID = 'places'
export const HOVER_SOURCE_ID = 'places-hover'

// OpenFreeMap's glyph server only hosts the fonts its own styles use.
// Omitting text-font makes MapLibre ask for "Open Sans Regular", which 404s.
export const BASEMAP_FONT = ['Noto Sans Regular']

const FILL_IDS = CATEGORIES.filter((c) => c.style === 'fill').map((c) => c.id)
const OUTLINE_IDS = CATEGORIES.filter((c) => c.style === 'outline').map((c) => c.id)

function categoryIn(ids: CategoryId[]): ExpressionSpecification {
  return ['in', ['get', 'category'], ['literal', ids]] as ExpressionSpecification
}

function geometryIs(type: 'building' | 'area' | 'point'): ExpressionSpecification {
  return ['==', ['get', 'geometryType'], type] as ExpressionSpecification
}

/** Mix a hex colour towards black (negative) or white (positive). */
function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16)
  const rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => {
    const mixed = amount < 0 ? channel * (1 + amount) : channel + (255 - channel) * amount
    return Math.max(0, Math.min(255, Math.round(mixed)))
  })
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

// The spec asks for a subtle height-based lightness variation so the campus
// does not read as one flat slab. The exact palette colour sits at mid-height
// so the category swatch remains recognisable.
function shadeByHeight(color: string): ExpressionSpecification {
  return [
    'interpolate',
    ['linear'],
    ['coalesce', ['get', 'heightM'], 6],
    4,
    shade(color, -0.18),
    20,
    color,
    60,
    shade(color, 0.16),
  ] as unknown as ExpressionSpecification
}

export function categoryColorExpression(): ExpressionSpecification {
  const matchCases: (string | ExpressionSpecification)[] = ['match', ['get', 'category']]
  for (const cat of CATEGORIES) {
    matchCases.push(cat.id, cat.color)
  }
  // Neutral slate for context buildings with a null category.
  matchCases.push('#2a303b')
  return matchCases as unknown as ExpressionSpecification
}

export function buildingColorExpression(): ExpressionSpecification {
  const matchCases: (string | ExpressionSpecification)[] = ['match', ['get', 'category']]
  for (const cat of CATEGORIES) {
    matchCases.push(cat.id, shadeByHeight(cat.color))
  }
  matchCases.push(shadeByHeight('#2a303b'))
  return matchCases as unknown as ExpressionSpecification
}

export function placesLayers(): LayerSpecification[] {
  const colorExpr = categoryColorExpression()

  return [
    {
      id: 'places-buildings',
      type: 'fill-extrusion',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('building'), ['!', categoryIn(OUTLINE_IDS)]] as FilterSpecification,
      paint: {
        'fill-extrusion-color': buildingColorExpression(),
        'fill-extrusion-height': ['coalesce', ['get', 'heightM'], 6],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.92,
      },
    },
    {
      id: 'places-buildings-outline-volume',
      type: 'fill-extrusion',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('building'), categoryIn(OUTLINE_IDS)] as FilterSpecification,
      paint: {
        'fill-extrusion-color': buildingColorExpression(),
        'fill-extrusion-height': ['coalesce', ['get', 'heightM'], 6],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.35,
      },
    },
    {
      id: 'places-buildings-outline',
      type: 'line',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('building'), categoryIn(OUTLINE_IDS)] as FilterSpecification,
      paint: {
        'line-color': colorExpr,
        'line-width': 3,
        'line-opacity': 0.9,
      },
    },
    {
      id: 'places-areas-fill',
      type: 'fill',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('area'), categoryIn(FILL_IDS)] as FilterSpecification,
      paint: {
        'fill-color': colorExpr,
        'fill-opacity': 0.3,
      },
    },
    {
      id: 'places-areas-outline-tint',
      type: 'fill',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('area'), categoryIn(OUTLINE_IDS)] as FilterSpecification,
      paint: {
        'fill-color': colorExpr,
        'fill-opacity': 0.12,
      },
    },
    {
      id: 'places-areas-outline',
      type: 'line',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('area'), categoryIn(OUTLINE_IDS)] as FilterSpecification,
      paint: {
        'line-color': colorExpr,
        'line-width': 2.5,
        'line-opacity': 0.9,
      },
    },
    {
      id: 'places-points',
      type: 'circle',
      source: PLACES_SOURCE_ID,
      filter: geometryIs('point') as FilterSpecification,
      paint: {
        'circle-color': colorExpr,
        'circle-pitch-alignment': 'viewport',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.5, 5, 19.5, 7],
        'circle-stroke-color': '#12151b',
        'circle-stroke-width': 1.5,
      },
    },
    {
      id: 'places-hover-fill',
      type: 'fill',
      source: HOVER_SOURCE_ID,
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.18,
      },
    },
    {
      id: 'places-hover-line',
      type: 'line',
      source: HOVER_SOURCE_ID,
      paint: {
        'line-color': '#ffffff',
        'line-width': 1.5,
        'line-opacity': 0.9,
      },
    },
    {
      id: 'places-hover-point',
      type: 'circle',
      source: HOVER_SOURCE_ID,
      filter: geometryIs('point') as FilterSpecification,
      paint: {
        'circle-color': '#ffffff',
        'circle-opacity': 0.35,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.5, 8, 19.5, 10],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-pitch-alignment': 'viewport',
      },
    },
    {
      id: 'places-labels',
      type: 'symbol',
      source: PLACES_SOURCE_ID,
      filter: ['any', ['has', 'name'], ['has', 'genericLabel']] as FilterSpecification,
      layout: {
        'text-field': ['coalesce', ['get', 'name'], ['get', 'genericLabel']],
        'text-font': BASEMAP_FONT,
        'text-size': ['interpolate', ['linear'], ['zoom'], 15.5, 11, 19.5, 15],
        'text-anchor': 'top',
        'text-offset': [0, 0.6],
        'text-optional': true,
        'symbol-sort-key': ['case', ['has', 'name'], 0, 1],
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#12151b',
        'text-halo-width': 1.5,
      },
    },
  ]
}
