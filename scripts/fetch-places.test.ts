// scripts/fetch-places.test.ts
import { readFileSync } from 'node:fs'
import type { Feature, Geometry } from 'geojson'
import {
  deriveHeightM,
  PLACES_BBOX,
  strictlyInsidePolygon,
  transformOverpass,
  type PlaceProps,
} from './fetch-places'
import sample from './fixtures/overpass-sample.json'

function polygonsOf(geometry: any): number[][][][] {
  return geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : []
}

function labelInside(point: [number, number], geometry: any): boolean {
  return polygonsOf(geometry).some((polygon) => strictlyInsidePolygon(point, polygon))
}

it('rejects boundary points as label anchors', () => {
  const square = [
    [
      [-77.06, -12.0],
      [-77.059, -12.0],
      [-77.059, -11.999],
      [-77.06, -11.999],
      [-77.06, -12.0],
    ],
  ]
  expect(strictlyInsidePolygon([-77.0595, -11.9995], square)).toBe(true)
  expect(strictlyInsidePolygon([-77.059, -11.9995], square)).toBe(false)
  expect(strictlyInsidePolygon([-77.0595, -11.999], square)).toBe(false)
})

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

it('gives unnamed areas a generic label but not buildings', () => {
  const fc = transformOverpass(sample as never)
  const park = fc.features.find((f: Feature<Geometry, PlaceProps>) => f.properties.id === 'way/200')
  const building = fc.features.find((f: Feature<Geometry, PlaceProps>) => f.properties.id === 'way/100')
  expect(park?.properties.genericLabel).toBe('Park')
  expect(building?.properties.genericLabel).toBeUndefined()
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

it('puts label points inside their polygons in fixtures and committed data', () => {
  const fc = transformOverpass(sample as never)
  for (const f of fc.features.filter((f: Feature<Geometry, PlaceProps>) => f.properties.geometryType !== 'point')) {
    expect(labelInside([f.properties.labelLng, f.properties.labelLat], f.geometry), f.properties.id).toBe(true)
  }

  const committed = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ geometry: any; properties: PlaceProps }>
  }
  for (const f of committed.features.filter(
    (f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon',
  )) {
    expect(labelInside([f.properties.labelLng, f.properties.labelLat], f.geometry), f.properties.id).toBe(true)
  }
})

it('fetches a wider box than the campus frame', () => {
  const [south, west, north, east] = PLACES_BBOX.split(',').map(Number)
  expect(south).toBeLessThan(-12.003)
  expect(west).toBeLessThan(-77.065)
  expect(north).toBeGreaterThan(-11.995)
  expect(east).toBeGreaterThan(-77.056)
})

it('commits more real buildings than the original campus-only fetch', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { geometryType?: string } }>
  }
  const buildings = data.features.filter((f) => f.properties.geometryType === 'building')
  expect(buildings.length).toBeGreaterThan(350)
})

it('keeps the original sixteen POI dots in the committed data', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { id: string; geometryType?: string } }>
  }
  const ids = data.features
    .filter((f) => f.properties.geometryType === 'point')
    .map((f) => f.properties.id)

  expect([...ids].sort()).toEqual([
    'node/1863374473',
    'node/4379685965',
    'node/4379685966',
    'node/4379812240',
    'node/4379812275',
    'node/4379812276',
    'node/5577057586',
    'node/5577057587',
    'node/5577057588',
    'node/5577057589',
    'node/5577057590',
    'node/5577057591',
    'node/9406636346',
    'node/14361385759',
    'node/14361385760',
    'node/14383648668',
  ].sort())
})
