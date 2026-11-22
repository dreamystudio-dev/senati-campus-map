// src/map/layers.test.ts
import { CATEGORIES } from '../categories'
import { BASEMAP_FONT, buildingColorExpression, categoryColorExpression, placesLayers } from './layers'

const LAYER_IDS = [
  'places-buildings',
  'places-buildings-outline-volume',
  'places-buildings-outline',
  'places-areas-fill',
  'places-areas-outline-tint',
  'places-areas-outline',
  'places-points',
  'places-labels',
]

it('produces a layer per geometry family plus labels', () => {
  expect(placesLayers().map((l) => l.id)).toEqual(LAYER_IDS)
})

it('maps every category colour into the expression', () => {
  const flat = JSON.stringify(categoryColorExpression())
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
})

it('varies building lightness by height without losing the palette', () => {
  const flat = JSON.stringify(buildingColorExpression())
  expect(flat).toContain('heightM')
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
  expect(flat).not.toBe(JSON.stringify(categoryColorExpression()))
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
