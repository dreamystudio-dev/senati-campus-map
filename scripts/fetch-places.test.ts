// scripts/fetch-places.test.ts
import type { Feature, Geometry } from 'geojson'
import { deriveHeightM, transformOverpass, type PlaceProps } from './fetch-places'
import sample from './fixtures/overpass-sample.json'

function insidePolygon(point: [number, number], geometry: any): boolean {
  const [x, y] = point
  let rings: number[][][] = []
  if (geometry.type === 'Polygon') {
    rings = geometry.coordinates
  } else if (geometry.type === 'MultiPolygon') {
    rings = geometry.coordinates[0]
  } else {
    return false
  }

  const ring = rings[0]
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

it('derives height from levels, then height, then default', () => {
  expect(deriveHeightM({ 'building:levels': '2' })).toBe(6.4)
  expect(deriveHeightM({ height: '12 m' })).toBe(12)
  expect(deriveHeightM({})).toBe(6)
  expect(deriveHeightM({ 'building:levels': '0' })).toBe(4)
  expect(deriveHeightM({ 'building:levels': '99' })).toBe(60)
})

it('transforms a sample response, dropping filler but keeping untagged buildings', () => {
  const fc = transformOverpass(sample as never)
  expect(fc.features).toHaveLength(5)
  expect(fc.features.some((f: Feature<Geometry, PlaceProps>) => f.properties.kind === 'landuse=grass')).toBe(false)
  expect(fc.features.some((f: Feature<Geometry, PlaceProps>) => f.properties.kind === 'amenity=recycling')).toBe(false)
})

it('keeps uncategorised buildings as neutral context', () => {
  const fc = transformOverpass(sample as never)
  const neutral = fc.features.filter((f: Feature<Geometry, PlaceProps>) => f.properties.category === null)
  expect(neutral.map((f: Feature<Geometry, PlaceProps>) => f.properties.id)).toEqual(['way/500'])
  expect(neutral[0].properties).toMatchObject({ geometryType: 'building', heightM: 9.6, levels: 3 })
  expect(neutral[0].properties.kind).toBe('building=yes')
})

it('formats ids as osm type and id, and types each geometry class', () => {
  const fc = transformOverpass(sample as never)
  expect(fc.features.map((f: Feature<Geometry, PlaceProps>) => f.properties.id).sort()).toEqual([
    'node/900',
    'relation/700',
    'way/100',
    'way/200',
    'way/500',
  ])
  expect(fc.features.find((f: Feature<Geometry, PlaceProps>) => f.properties.id === 'node/900')?.properties.geometryType).toBe(
    'point',
  )
  expect(fc.features.find((f: Feature<Geometry, PlaceProps>) => f.properties.id === 'relation/700')?.properties.geometryType).toBe(
    'area',
  )
  expect(fc.features.find((f: Feature<Geometry, PlaceProps>) => f.properties.id === 'way/100')?.properties.geometryType).toBe(
    'building',
  )
})

it('puts label points inside their polygons', () => {
  const fc = transformOverpass(sample as never)
  for (const f of fc.features.filter((f: Feature<Geometry, PlaceProps>) => f.properties.geometryType !== 'point')) {
    expect(insidePolygon([f.properties.labelLng, f.properties.labelLat], f.geometry)).toBe(true)
  }
})
