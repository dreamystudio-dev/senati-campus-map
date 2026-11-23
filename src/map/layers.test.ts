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
  'places-buildings',
  'places-areas-fill',
  'places-areas-outline-tint',
  'places-areas-outline',
  'places-points',
  'places-hover-fill',
  'places-hover-line',
  'places-hover-point',
  'places-labels',
]

it('produces a layer per geometry family plus labels', () => {
  expect(placesLayers().map((l) => l.id)).toEqual(LAYER_IDS)
})

it('maps every category colour into the expression', () => {
  const flat = JSON.stringify(categoryColorExpression())
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
})

it('renders every building as a flat border, never a filled volume', () => {
  const layers = placesLayers()
  expect(layers.some((l) => l.type === 'fill-extrusion')).toBe(false)
  expect(layers.find((l) => l.id === 'places-buildings')?.type).toBe('line')
})

it('excludes category-less features from every layer', () => {
  const globals = { zoom: 15 }
  const feature = {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [0, 0] },
    properties: {
      id: 'way/1',
      geometryType: 'building',
      category: null,
      name: 'Context',
      genericLabel: 'Context',
    },
  } as never

  for (const [id, filter] of Object.entries(layerFilters([], 'way/1'))) {
    expect(featureFilter(filter).filter(globals, feature), id).toBe(false)
  }
})

it('keeps category-less buildings out of the revealed building layer', () => {
  const filter = featureFilter(layerFilters([], 'way/1')['places-buildings'])
  const globals = { zoom: 15 }
  const building = (category: string | null) =>
    ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [0, 0] },
      properties: { id: 'way/1', geometryType: 'building', category },
    }) as never

  expect(filter.filter(globals, building('shop'))).toBe(true)
  expect(filter.filter(globals, building(null))).toBe(false)
})

it('hides a category from points and labels when toggled off', () => {
  const filters = layerFilters(['shop'], null)
  const pointFilter = featureFilter(filters['places-points'])
  const labelFilter = featureFilter(filters['places-labels'])
  const globals = { zoom: 15 }
  const feature = (category: string) =>
    ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [0, 0] },
      properties: { geometryType: 'point', category, name: 'X' },
    }) as never

  expect(pointFilter.filter(globals, feature('shop'))).toBe(false)
  expect(pointFilter.filter(globals, feature('food'))).toBe(true)
  expect(labelFilter.filter(globals, feature('shop'))).toBe(false)
  expect(labelFilter.filter(globals, feature('food'))).toBe(true)
})

it('hides a category from hover highlights when toggled off', () => {
  const filters = layerFilters(['shop'], null)
  const globals = { zoom: 15 }
  const feature = (category: string) =>
    ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [0, 0] },
      properties: { geometryType: 'point', category },
    }) as never

  for (const id of ['places-hover-fill', 'places-hover-line', 'places-hover-point']) {
    const filter = featureFilter(filters[id])
    expect(filter.filter(globals, feature('shop')), id).toBe(false)
    expect(filter.filter(globals, feature('food')), id).toBe(true)
  }
})

it('reveals only the selected footprint in polygon layers', () => {
  const filters = layerFilters([], 'way/1')
  const buildingFilter = featureFilter(filters['places-buildings'])
  const areaFilter = featureFilter(filters['places-areas-outline'])
  const globals = { zoom: 15 }
  const feature = (id: string, geometryType: string, category = 'education') =>
    ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [0, 0] },
      properties: { id, geometryType, category },
    }) as never

  expect(buildingFilter.filter(globals, feature('way/1', 'building'))).toBe(true)
  expect(buildingFilter.filter(globals, feature('way/2', 'building'))).toBe(false)
  expect(areaFilter.filter(globals, feature('way/1', 'area'))).toBe(true)
  expect(areaFilter.filter(globals, feature('way/2', 'area'))).toBe(false)
  expect(
    featureFilter(layerFilters([], null)['places-buildings']).filter(
      globals,
      feature('way/1', 'building'),
    ),
  ).toBe(false)
})

it('pushes the derived filters to every map layer', () => {
  const setFilter = vi.fn()
  applyLayerFilters({ setFilter } as never, ['shop'], 'way/1')
  const filters = layerFilters(['shop'], 'way/1')

  expect(setFilter).toHaveBeenCalledTimes(LAYER_IDS.length)
  for (const id of LAYER_IDS) expect(setFilter).toHaveBeenCalledWith(id, filters[id])
})

it('does not label named context buildings', () => {
  const labelLayer = placesLayers().find((l) => l.id === 'places-labels') as never as {
    filter?: Parameters<typeof featureFilter>[0]
  }
  const labelFilter = featureFilter(labelLayer.filter)
  const globals = { zoom: 15 }
  const feature = (properties: Record<string, unknown>) =>
    ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [0, 0] },
      properties,
    }) as never

  expect(
    labelFilter.filter(
      globals,
      feature({ geometryType: 'building', category: null, name: 'Anfiteatro' }),
    ),
  ).toBe(false)
  expect(
    labelFilter.filter(
      globals,
      feature({ geometryType: 'building', category: 'education', name: 'Comedor' }),
    ),
  ).toBe(true)
  expect(
    labelFilter.filter(
      globals,
      feature({ geometryType: 'area', category: 'park', genericLabel: 'Park' }),
    ),
  ).toBe(true)
})

it('splits fills from outlines using the category style', () => {
  const byId = Object.fromEntries(placesLayers().map((l) => [l.id, l])) as Record<
    string,
    { filter?: unknown }
  >
  const outlineFilter = JSON.stringify(byId['places-areas-outline'].filter)
  const fillFilter = JSON.stringify(byId['places-areas-fill'].filter)

  for (const c of CATEGORIES.filter((c) => c.style === 'outline')) {
    expect(outlineFilter).toContain(`"${c.id}"`)
  }
  for (const c of CATEGORIES.filter((c) => c.style === 'fill')) {
    expect(fillFilter).toContain(`"${c.id}"`)
  }
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

it('only lets dots answer hover and click', () => {
  expect(INTERACTIVE_LAYER_IDS).toEqual(['places-points'])
})
