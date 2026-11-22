import type { LayerSpecification, ExpressionSpecification } from 'maplibre-gl'
import { CATEGORIES } from '../categories'

export const PLACES_SOURCE_ID = 'places'

export function categoryColorExpression(): ExpressionSpecification {
  const matchCases: (string | ExpressionSpecification)[] = ['match', ['get', 'category']]
  for (const cat of CATEGORIES) {
    matchCases.push(cat.id, cat.color)
  }
  // Default neutral slate for unclassified / null category
  matchCases.push('#2a303b')
  return matchCases as unknown as ExpressionSpecification
}

export function placesLayers(): LayerSpecification[] {
  const colorExpr = categoryColorExpression()

  return [
    {
      id: 'places-buildings',
      type: 'fill-extrusion',
      source: PLACES_SOURCE_ID,
      filter: ['==', ['get', 'geometryType'], 'building'],
      paint: {
        'fill-extrusion-color': colorExpr as any,
        'fill-extrusion-height': ['coalesce', ['get', 'heightM'], 6],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.92,
      },
    },
    {
      id: 'places-areas-fill',
      type: 'fill',
      source: PLACES_SOURCE_ID,
      filter: ['==', ['get', 'geometryType'], 'area'],
      paint: {
        'fill-color': colorExpr as any,
        'fill-opacity': 0.25,
      },
    },
    {
      id: 'places-areas-outline',
      type: 'line',
      source: PLACES_SOURCE_ID,
      filter: ['==', ['get', 'geometryType'], 'area'],
      paint: {
        'line-color': colorExpr as any,
        'line-width': 2,
        'line-opacity': 0.85,
      },
    },
    {
      id: 'places-points',
      type: 'circle',
      source: PLACES_SOURCE_ID,
      filter: ['==', ['get', 'geometryType'], 'point'],
      paint: {
        'circle-color': colorExpr as any,
        'circle-pitch-alignment': 'viewport',
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15.5,
          5,
          19.5,
          7,
        ],
        'circle-stroke-color': '#12151b',
        'circle-stroke-width': 1.5,
      },
    },
    {
      id: 'places-labels',
      type: 'symbol',
      source: PLACES_SOURCE_ID,
      layout: {
        'text-field': ['coalesce', ['get', 'name'], ['get', 'genericLabel']],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15.5,
          11,
          19.5,
          15,
        ],
        'text-anchor': 'top',
        'text-offset': [0, 0.6],
        'text-optional': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#12151b',
        'text-halo-width': 1.5,
      },
    },
  ]
}
