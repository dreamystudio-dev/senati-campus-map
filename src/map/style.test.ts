// src/map/style.test.ts
import { sanitizeStyle } from './style'

const style = {
  version: 8,
  sources: {},
  layers: [
    { id: 'building-3d', type: 'fill-extrusion', source: 'openmaptiles' },
    { id: 'building', type: 'fill', source: 'openmaptiles' },
    { id: 'poi-label', type: 'symbol', source: 'openmaptiles' },
    { id: 'water', type: 'fill', source: 'openmaptiles' },
    { id: 'road-primary', type: 'line', source: 'openmaptiles' },
  ],
} as never

it('removes basemap buildings and POI layers, keeps context', () => {
  const ids = sanitizeStyle(style).layers.map(l => l.id)
  expect(ids).toEqual(['water', 'road-primary'])
})
