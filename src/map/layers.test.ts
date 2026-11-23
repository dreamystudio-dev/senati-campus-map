// src/map/layers.test.ts
import { featureFilter } from '@maplibre/maplibre-gl-style-spec'
import { vi } from 'vitest'
import { CATEGORIES } from '../categories'
import {
  applyLayerFilters,
  BASEMAP_FONT,
  categoryColorExpression,
  INTERACTIVE_LAYER_IDS,
  layerFilters,
  placesLayers,
} from './layers'

const LAYER_IDS = [
  'places-points',
  'places-hover-fill',
  'places-hover-line',
  'places-hover-point',
  'places-labels',
]

it('produces a dot layer, hover layers and labels', () => {
  expect(placesLayers().map((l) => l.id)).toEqual(LAYER_IDS)
})

it('maps every category colour into the expression', () => {
  const flat = JSON.stringify(categoryColorExpression())
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
})

it('renders no filled volume', () => {
  expect(placesLayers().some((l) => l.type === 'fill-extrusion')).toBe(false)
})

it('excludes category-less features from every layer', () => {
  const globals = { zoom: 15 }
  const feature = {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [0, 0] },
    properties: { id: 'way/1', geometryType: 'point', category: null, name: 'Context', genericLabel: 'Context' },
  } as never

  for (const [id, filter] of Object.entries(layerFilters([]))) {
    expect(featureFilter(filter).filter(globals, feature), id).toBe(false)
  }
})

it('hides a category from points and labels when toggled off', () => {
  const filters = layerFilters(['shop'])
  const pointFilter = featureFilter(filters['places-points'])
  const labelFilter = featureFilter(filters['places-labels'])
  const globals = { zoom: 15 }
  const feature = (category: string) =>
    ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties: { geometryType: 'point', category, name: 'X' } }) as never

  expect(pointFilter.filter(globals, feature('shop'))).toBe(false)
  expect(pointFilter.filter(globals, feature('food'))).toBe(true)
  expect(labelFilter.filter(globals, feature('shop'))).toBe(false)
  expect(labelFilter.filter(globals, feature('food'))).toBe(true)
})

it('hides a category from hover highlights when toggled off', () => {
  const filters = layerFilters(['shop'])
  const globals = { zoom: 15 }
  const feature = (category: string) =>
    ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties: { geometryType: 'point', category } }) as never

  for (const id of ['places-hover-fill', 'places-hover-line', 'places-hover-point']) {
    const filter = featureFilter(filters[id])
    expect(filter.filter(globals, feature('shop')), id).toBe(false)
    expect(filter.filter(globals, feature('food')), id).toBe(true)
  }
})

it('pushes the derived filters to every map layer', () => {
  const setFilter = vi.fn()
  applyLayerFilters({ setFilter } as never, ['shop'])
  const filters = layerFilters(['shop'])

  expect(setFilter).toHaveBeenCalledTimes(LAYER_IDS.length)
  for (const id of LAYER_IDS) expect(setFilter).toHaveBeenCalledWith(id, filters[id])
})

it('does not label named context buildings', () => {
  const labelFilter = featureFilter(layerFilters([])['places-labels'])
  const globals = { zoom: 15 }
  const feature = (properties: Record<string, unknown>) =>
    ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties }) as never

  expect(labelFilter.filter(globals, feature({ geometryType: 'building', category: null, name: 'Anfiteatro' }))).toBe(false)
  expect(labelFilter.filter(globals, feature({ geometryType: 'building', category: 'education', name: 'Comedor' }))).toBe(true)
  expect(labelFilter.filter(globals, feature({ geometryType: 'area', category: 'park', genericLabel: 'Park' }))).toBe(true)
})

it('labels named features and unnamed areas with the basemap font', () => {
  const labels = placesLayers().find((l) => l.id === 'places-labels') as never as {
    filter: unknown
    layout: { 'text-field': unknown; 'text-font': unknown }
  }
  const text = JSON.stringify(labels.layout['text-field'])
  expect(text).toContain('name')
  expect(text).toContain('genericLabel')
  expect(JSON.stringify(labels.filter)).toContain('genericLabel')
  expect(labels.layout['text-font']).toEqual(BASEMAP_FONT)
})

it('adds a hover highlight above the place layers', () => {
  const ids = placesLayers().map((l) => l.id)
  expect(ids).toContain('places-hover-fill')
  expect(ids).toContain('places-hover-line')
})

it('pins each hover layer to the category palette and the fill to 35% opacity', () => {
  const paintOf = (id: string) =>
    (placesLayers().find((l) => l.id === id) as never as { paint: Record<string, unknown> }).paint

  for (const id of ['places-hover-fill', 'places-hover-line', 'places-hover-point']) {
    const paint = JSON.stringify(paintOf(id))
    for (const category of CATEGORIES) expect(paint).toContain(category.color)
    expect(paint).not.toMatch(/#fff(?:ffff)?\b/i)
  }
  expect(paintOf('places-hover-fill')['fill-opacity']).toBe(0.35)
})

it('highlights hovered points with a circle layer', () => {
  const layer = placesLayers().find((l) => l.id === 'places-hover-point')
  expect(layer?.type).toBe('circle')
  expect(JSON.stringify((layer as { filter?: unknown }).filter)).toContain('point')
})

it('only lets dots answer hover', () => {
  expect(INTERACTIVE_LAYER_IDS).toEqual(['places-points'])
})
