// src/map/style.test.ts
import { DARK_BASEMAP, sanitizeStyle } from './style'

const style = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#ffffff' } },
    { id: 'building-3d', type: 'fill-extrusion', source: 'openmaptiles' },
    { id: 'building', type: 'fill', source: 'openmaptiles' },
    { id: 'poi-label', type: 'symbol', source: 'openmaptiles' },
    { id: 'water', type: 'fill', source: 'openmaptiles', paint: { 'fill-color': '#a0c8f0' } },
    { id: 'park', type: 'fill', source: 'openmaptiles', paint: { 'fill-color': '#d8e8c8' } },
    { id: 'road-primary', type: 'line', source: 'openmaptiles', paint: { 'line-color': '#ffffff' } },
    {
      id: 'road-primary_casing',
      type: 'line',
      source: 'openmaptiles',
      paint: { 'line-color': '#ffffff' },
    },
    {
      id: 'place_city',
      type: 'symbol',
      source: 'openmaptiles',
      paint: { 'text-color': '#000000', 'text-halo-color': '#ffffff' },
    },
  ],
} as never

it('removes basemap buildings and POI layers, keeps context', () => {
  const ids = sanitizeStyle(style).layers.map((l) => l.id)
  expect(ids).toEqual([
    'background',
    'water',
    'park',
    'road-primary',
    'road-primary_casing',
    'place_city',
  ])
})

it('restyles the basemap into the dark palette', () => {
  const byId = Object.fromEntries(
    sanitizeStyle(style).layers.map((l) => [l.id, l]),
  ) as Record<string, { paint?: Record<string, unknown> }>

  expect(byId.background.paint?.['background-color']).toBe(DARK_BASEMAP.background)
  expect(byId.water.paint?.['fill-color']).toBe(DARK_BASEMAP.water)
  expect(byId.park.paint?.['fill-color']).toBe(DARK_BASEMAP.green)
  expect(byId['road-primary'].paint?.['line-color']).toBe(DARK_BASEMAP.road)
  expect(byId['road-primary_casing'].paint?.['line-color']).toBe(DARK_BASEMAP.roadCasing)
  expect(byId.place_city.paint?.['text-color']).toBe(DARK_BASEMAP.text)
})
