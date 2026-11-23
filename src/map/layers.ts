import type { ExpressionSpecification, FilterSpecification, LayerSpecification } from 'maplibre-gl'
import { CATEGORIES, type CategoryId } from '../categories'

export const PLACES_SOURCE_ID = 'places'
export const HOVER_SOURCE_ID = 'places-hover'
export const INTERACTIVE_LAYER_IDS = [
  'places-buildings',
  'places-areas-fill',
  'places-areas-outline-tint',
  'places-points',
]

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

export function categoryColorExpression(): ExpressionSpecification {
  const matchCases: (string | ExpressionSpecification)[] = ['match', ['get', 'category']]
  for (const cat of CATEGORIES) {
    matchCases.push(cat.id, cat.color)
  }
  // Neutral slate for context buildings with a null category.
  matchCases.push('#2a303b')
  return matchCases as unknown as ExpressionSpecification
}

export function placesLayers(): LayerSpecification[] {
  const colorExpr = categoryColorExpression()

  return [
    {
      id: 'places-buildings',
      type: 'line',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('building'), ['!=', ['get', 'category'], null]] as FilterSpecification,
      paint: {
        'line-color': colorExpr,
        'line-width': 3,
        'line-opacity': 0.9,
      },
    },
    {
      id: 'places-buildings-context',
      type: 'line',
      source: PLACES_SOURCE_ID,
      filter: ['all', geometryIs('building'), ['==', ['get', 'category'], null]] as FilterSpecification,
      paint: {
        'line-color': '#2a303b',
        'line-width': 2,
        'line-opacity': 0.6,
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
        'fill-color': colorExpr,
        'fill-opacity': 0.35,
      },
    },
    {
      id: 'places-hover-line',
      type: 'line',
      source: HOVER_SOURCE_ID,
      paint: {
        'line-color': colorExpr,
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
        'circle-color': colorExpr,
        'circle-opacity': 0.35,
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 15.5, 8, 19.5, 10],
        'circle-stroke-color': colorExpr,
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
