// src/map/layers.test.ts
import { CATEGORIES } from '../categories'
import { categoryColorExpression, placesLayers } from './layers'

it('produces one layer per geometry family plus labels', () => {
  const ids = placesLayers().map(l => l.id)
  expect(ids.slice(0, 5)).toEqual([
    'places-buildings', 'places-areas-fill', 'places-areas-outline', 'places-points', 'places-labels',
  ])
})

it('maps every category colour into the expression', () => {
  const flat = JSON.stringify(categoryColorExpression())
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
})

it('labels only named features, with a generic fallback for areas', () => {
  const labels = placesLayers().find(l => l.id === 'places-labels') as never as {
    layout: { 'text-field': unknown }
  }
  const text = JSON.stringify(labels.layout['text-field'])
  expect(text).toContain('name')
  expect(text).toContain('genericLabel')
})
