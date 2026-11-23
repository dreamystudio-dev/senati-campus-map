import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  Map,
} from 'maplibre-gl'
import { CATEGORIES, type CategoryId } from '../categories'

export const PLACES_SOURCE_ID = 'places'
export const HOVER_SOURCE_ID = 'places-hover'
export const INTERACTIVE_LAYER_IDS = ['places-points']

// OpenFreeMap's glyph server only hosts the fonts its own styles use.
// Omitting text-font makes MapLibre ask for "Open Sans Regular", which 404s.
export const BASEMAP_FONT = ['Noto Sans Regular']

function geometryIs(type: 'point'): ExpressionSpecification {
  return ['==', ['get', 'geometryType'], type] as ExpressionSpecification
}

type FilterPart = FilterSpecification | ExpressionSpecification

function placeFilter(
  hiddenCategories: CategoryId[],
  ...extra: FilterPart[]
): FilterSpecification {
  return [
    'all',
    ['!=', ['get', 'category'], null],
    ['!', ['in', ['get', 'category'], ['literal', hiddenCategories]]],
    ...extra,
  ] as FilterSpecification
}

export function categoryColorExpression(): ExpressionSpecification {
  const matchCases: (string | ExpressionSpecification)[] = ['match', ['get', 'category']]
  for (const cat of CATEGORIES) {
    matchCases.push(cat.id, cat.color)
  }
  // Fallback only; uncategorised features are filtered out of every layer.
  matchCases.push('#2a303b')
  return matchCases as unknown as ExpressionSpecification
}

export function layerFilters(
  hiddenCategories: CategoryId[],
): Record<string, FilterSpecification> {
  return {
    'places-points': placeFilter(hiddenCategories, geometryIs('point')),
    'places-hover-fill': placeFilter(hiddenCategories),
    'places-hover-line': placeFilter(hiddenCategories),
    'places-hover-point': placeFilter(hiddenCategories, geometryIs('point')),
    'places-labels': placeFilter(
      hiddenCategories,
      ['any', ['has', 'name'], ['has', 'genericLabel']] as FilterSpecification,
    ),
  }
}

export function applyLayerFilters(
  map: Pick<Map, 'setFilter'>,
  hiddenCategories: CategoryId[],
): void {
  const filters = layerFilters(hiddenCategories)
  for (const [id, filter] of Object.entries(filters)) {
    map.setFilter(id, filter)
  }
}

export function placesLayers(): LayerSpecification[] {
  const colorExpr = categoryColorExpression()
  const filters = layerFilters([])

  return [
    {
      id: 'places-points',
      type: 'circle',
      source: PLACES_SOURCE_ID,
      filter: filters['places-points'],
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
      filter: filters['places-hover-fill'],
      paint: {
        'fill-color': colorExpr,
        'fill-opacity': 0.35,
      },
    },
    {
      id: 'places-hover-line',
      type: 'line',
      source: HOVER_SOURCE_ID,
      filter: filters['places-hover-line'],
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
      filter: filters['places-hover-point'],
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
      filter: filters['places-labels'],
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
