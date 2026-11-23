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

it('transforms a sample response, dropping filler and uncategorised features', () => {
  const fc = transformOverpass(sample as never)
  expect(fc.features.some((f: Feature<Geometry, PlaceProps>) => f.properties.kind === 'landuse=grass')).toBe(false)
  expect(fc.features.some((f: Feature<Geometry, PlaceProps>) => f.properties.kind === 'amenity=recycling')).toBe(false)
  expect(fc.features.some((f: Feature<Geometry, PlaceProps>) => f.properties.id === 'way/500')).toBe(false)
  expect(fc.features.some((f: Feature<Geometry, PlaceProps>) => f.properties.category === null)).toBe(false)
})

it('drops uncategorised features and emits a dot for each polygon place', () => {
  const fc = transformOverpass(sample as never)
  expect(fc.features.some((f: Feature<Geometry, PlaceProps>) => f.properties.category === null)).toBe(false)

  const polygons = fc.features.filter((f: Feature<Geometry, PlaceProps>) =>
    f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon',
  )
  const dots = fc.features.filter((f: Feature<Geometry, PlaceProps>) => f.properties.footprintId !== undefined)
  expect(dots).toHaveLength(polygons.length)
  for (const dot of dots) {
    expect(dot.geometry.type).toBe('Point')
    expect(dot.properties.id).toBe(`${dot.properties.footprintId}/point`)
    expect(dot.properties.geometryType).toBe('point')
  }
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
    'way/100/point',
    'way/200/point',
    'relation/700/point',
  ].sort())
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

it('uses the widened two-times-campus bbox', () => {
  expect(PLACES_BBOX).toBe('-12.0053,-77.0674,-11.9927,-77.0534')
})

it('commits place dots linked to polygon footprints', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ geometry: any; properties: PlaceProps }>
  }
  const dots = data.features.filter((f) => f.properties.footprintId !== undefined)
  expect(dots.length).toBeGreaterThan(80)
  for (const dot of dots) {
    expect(dot.geometry.type).toBe('Point')
    expect(dot.properties.id).toBe(`${dot.properties.footprintId}/point`)
  }
})

it('commits no uncategorised features', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { category: string | null } }>
  }
  expect(data.features.some((f) => f.properties.category === null)).toBe(false)
})

it('keeps the named POI dots from the original sixteen', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { id: string; geometryType?: string; footprintId?: string } }>
  }
  const ids = data.features
    .filter((f) => f.properties.geometryType === 'point' && !f.properties.footprintId)
    .map((f) => f.properties.id)

  expect(ids).toEqual(expect.arrayContaining([
    'node/1863374473', 'node/4379685965', 'node/4379685966', 'node/4379812240',
    'node/4379812275', 'node/4379812276', 'node/5577057586', 'node/5577057587',
    'node/5577057588', 'node/5577057589', 'node/5577057590', 'node/5577057591',
  ]))
  expect(ids.length).toBeGreaterThan(12)
})

it('drops places with neither a name nor a generic label', () => {
  const response = {
    version: 0.6,
    generator: 'Overpass API',
    elements: [
      { type: 'node', id: 1, lat: -11.999, lon: -77.06, tags: { shop: 'convenience' } },
      {
        type: 'way', id: 2, tags: { building: 'yes', shop: 'clothes' },
        geometry: [
          { lat: -11.999, lon: -77.06 }, { lat: -11.999, lon: -77.059 },
          { lat: -11.998, lon: -77.059 }, { lat: -11.998, lon: -77.06 },
          { lat: -11.999, lon: -77.06 },
        ],
      },
      {
        type: 'way', id: 3, tags: { leisure: 'park' },
        geometry: [
          { lat: -11.997, lon: -77.062 }, { lat: -11.997, lon: -77.061 },
          { lat: -11.996, lon: -77.061 }, { lat: -11.996, lon: -77.062 },
          { lat: -11.997, lon: -77.062 },
        ],
      },
    ],
  }
  const fc = transformOverpass(response as never)
  const ids = fc.features.map((f) => f.properties.id)
  expect(ids).not.toContain('node/1')
  expect(ids).not.toContain('way/2')
  expect(ids).not.toContain('way/2/point')
  expect(ids).toContain('way/3')
  expect(ids).toContain('way/3/point')
  expect(fc.features.find((f) => f.properties.id === 'way/3')?.properties.genericLabel).toBe('Park')
})

it('commits no place without a name or generic label', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { name?: string; genericLabel?: string } }>
  }
  expect(data.features.some((f) => !f.properties.name && !f.properties.genericLabel)).toBe(false)
})
