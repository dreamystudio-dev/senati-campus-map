// src/map/layers.test.ts
import { CATEGORIES } from '../categories'
import { BASEMAP_FONT, categoryColorExpression, INTERACTIVE_LAYER_IDS, placesLayers } from './layers'

const LAYER_IDS = [
  'places-buildings',
  'places-buildings-context',
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
  for (const id of ['places-buildings', 'places-buildings-context']) {
    expect(layers.find((l) => l.id === id)?.type).toBe('line')
  }
})

it('draws context buildings in neutral slate', () => {
  const layer = placesLayers().find((l) => l.id === 'places-buildings-context') as never as {
    filter?: unknown
    paint: { 'line-color': unknown }
  }
  expect(layer.paint['line-color']).toBe('#2a303b')
  expect(JSON.stringify(layer.filter)).toContain('building')
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

it('colours hover fills and outlines with the category palette', () => {
  const flat = JSON.stringify(placesLayers().filter((l) => l.id.startsWith('places-hover')))
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
  expect(flat).toContain('0.35')
  expect(flat).not.toContain('#ffffff')
})

it('highlights hovered points with a circle layer', () => {
  const layer = placesLayers().find((l) => l.id === 'places-hover-point')
  expect(layer?.type).toBe('circle')
  expect(JSON.stringify((layer as { filter?: unknown }).filter)).toContain('point')
})

it('never treats neutral context buildings as interactive', () => {
  expect(INTERACTIVE_LAYER_IDS).toContain('places-buildings')
  expect(INTERACTIVE_LAYER_IDS).not.toContain('places-buildings-context')
  expect(INTERACTIVE_LAYER_IDS).not.toContain('places-hover-fill')
})
