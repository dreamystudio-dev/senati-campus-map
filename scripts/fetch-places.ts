import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import osmtogeojson from 'osmtogeojson'
import polylabel from '@mapbox/polylabel'
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon, Point, Position } from 'geojson'
import { resolveCategory, type CategoryId } from '../src/categories'
import { CAMPUS } from '../src/map/bounds'

export const PLACES_BBOX = '-12.00361,-77.06533,-11.99469,-77.05567'

export interface PlaceProps {
  id: string
  name?: string
  genericLabel?: string
  category: CategoryId | null
  kind: string
  geometryType: 'building' | 'area' | 'point'
  levels?: number
  heightM?: number
  labelLng: number
  labelLat: number
  [key: string]: unknown
}

export function deriveHeightM(tags: Record<string, string>): number {
  if (tags['building:levels']) {
    const levels = parseFloat(tags['building:levels'])
    if (!isNaN(levels)) {
      const h = levels * 3.2
      return Math.min(60, Math.max(4, Number(h.toFixed(1))))
    }
  }

  if (tags.height) {
    const h = parseFloat(tags.height)
    if (!isNaN(h)) {
      return Math.min(60, Math.max(4, Number(h.toFixed(1))))
    }
  }

  return 6
}

function getPrimaryKind(tags: Record<string, string>, categoryId: CategoryId): string {
  const keys = ['amenity', 'shop', 'leisure', 'tourism', 'office', 'landuse']
  for (const k of keys) {
    if (tags[k]) {
      return `${k}=${tags[k]}`
    }
  }
  return `category=${categoryId}`
}

function round5(num: number): number {
  return Math.round(num * 1e5) / 1e5
}

function roundCoords(geom: Geometry): Geometry {
  if (geom.type === 'Point') {
    return {
      type: 'Point',
      coordinates: geom.coordinates.map(round5) as [number, number],
    }
  }
  if (geom.type === 'Polygon') {
    return {
      type: 'Polygon',
      coordinates: geom.coordinates.map((ring: Position[]) =>
        ring.map((pt: Position) => pt.map(round5) as [number, number]),
      ),
    }
  }
  if (geom.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: geom.coordinates.map((poly: Position[][]) =>
        poly.map((ring: Position[]) => ring.map((pt: Position) => pt.map(round5) as [number, number])),
      ),
    }
  }
  return geom
}

function ringContains(point: Position, ring: Position[]): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointOnSegment(point: Position, start: Position, end: Position): boolean {
  const cross = (point[0] - start[0]) * (end[1] - start[1]) - (point[1] - start[1]) * (end[0] - start[0])
  const epsilon = 1e-12
  return (
    Math.abs(cross) < epsilon &&
    point[0] >= Math.min(start[0], end[0]) - epsilon &&
    point[0] <= Math.max(start[0], end[0]) + epsilon &&
    point[1] >= Math.min(start[1], end[1]) - epsilon &&
    point[1] <= Math.max(start[1], end[1]) + epsilon
  )
}

function polygonContains(point: Position, polygon: Position[][]): boolean {
  return ringContains(point, polygon[0]) && !polygon.slice(1).some((hole) => ringContains(point, hole))
}

export function strictlyInsidePolygon(point: Position, polygon: Position[][]): boolean {
  const onBoundary = polygon.some((ring) =>
    ring.some((vertex, i) => pointOnSegment(point, vertex, ring[(i + 1) % ring.length])),
  )
  return !onBoundary && polygonContains(point, polygon)
}

function interiorLabelPoint(polygon: Position[][]): Position | null {
  // The committed geometry is rounded too, so validate against that version:
  // a candidate clear of the raw ring can land exactly on a rounded vertex.
  const roundedPolygon = polygon.map((ring) => ring.map((pt) => [round5(pt[0]), round5(pt[1])] as Position))

  for (const precision of [1.0, 0.1, 0.01, 0.001]) {
    const [lng, lat] = polylabel(polygon, precision)
    const candidate: Position = [round5(lng), round5(lat)]
    if (strictlyInsidePolygon(candidate, roundedPolygon)) return candidate
  }

  // Fall back to a search on the same 1e-5 grid the committed data uses.
  const outer = roundedPolygon[0]
  const minX = Math.ceil(Math.min(...outer.map((p) => p[0])) * 1e5)
  const maxX = Math.floor(Math.max(...outer.map((p) => p[0])) * 1e5)
  const minY = Math.ceil(Math.min(...outer.map((p) => p[1])) * 1e5)
  const maxY = Math.floor(Math.max(...outer.map((p) => p[1])) * 1e5)
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      const candidate: Position = [x / 1e5, y / 1e5]
      if (strictlyInsidePolygon(candidate, roundedPolygon)) return candidate
    }
  }
  // Degenerate rings have no interior point; drop the feature rather than
  // committing an anchor that sits on the boundary or outside the footprint.
  return null
}

export function transformOverpass(osm: unknown): FeatureCollection<Geometry, PlaceProps> {
  const geojson = osmtogeojson(osm) as FeatureCollection<Geometry, Record<string, any>>
  const features: Feature<Geometry, PlaceProps>[] = []

  for (const feature of geojson.features) {
    if (!feature.geometry) continue

    const tags: Record<string, string> = (feature.properties?.tags || feature.properties || {})
    const category = resolveCategory(tags)
    const isBuilding = Boolean(tags.building && tags.building !== 'no')
    // Uncategorised buildings are kept as neutral context: they give the campus
    // its 3D mass. Uncategorised areas and points are filler and are dropped.
    if (!category && !isBuilding) continue

    // Determine geometryType
    const geomType = feature.geometry.type
    let placeGeometryType: 'building' | 'area' | 'point'

    if (isBuilding) {
      placeGeometryType = 'building'
    } else if (geomType === 'Point') {
      placeGeometryType = 'point'
    } else {
      placeGeometryType = 'area'
    }

    // Determine label coordinate
    let labelPoint: Position | null = null

    if (geomType === 'Point') {
      labelPoint = (feature.geometry as Point).coordinates
    } else if (geomType === 'Polygon') {
      labelPoint = interiorLabelPoint((feature.geometry as Polygon).coordinates)
    } else if (geomType === 'MultiPolygon') {
      const mpoly = feature.geometry as MultiPolygon
      // find largest polygon by ring length or first
      let bestPoly = mpoly.coordinates[0]
      for (const p of mpoly.coordinates) {
        if (p[0].length > bestPoly[0].length) {
          bestPoly = p
        }
      }
      labelPoint = interiorLabelPoint(bestPoly)
    }
    if (!labelPoint) continue
    const [labelLng, labelLat] = labelPoint

    // ID formatting: osm type and id (feature.id is usually "way/123", "node/123", "relation/123")
    const id = String(feature.id)

    const kind = category ? getPrimaryKind(tags, category.id) : `building=${tags.building ?? 'yes'}`
    const levels = tags['building:levels'] ? parseFloat(tags['building:levels']) : undefined
    const heightM = placeGeometryType === 'building' ? deriveHeightM(tags) : undefined

    const props: PlaceProps = {
      id,
      category: category?.id ?? null,
      kind,
      geometryType: placeGeometryType,
      labelLng: round5(labelLng),
      labelLat: round5(labelLat),
    }

    if (tags.name) {
      props.name = tags.name
    }
    // Unnamed areas need something to render: parks, pitches, parking and
    // construction sites fall back to their category's generic English label.
    if (placeGeometryType === 'area' && category?.genericLabel) {
      props.genericLabel = category.genericLabel
    }
    if (levels !== undefined && !isNaN(levels)) {
      props.levels = levels
    }
    if (heightM !== undefined) {
      props.heightM = heightM
    }

    features.push({
      type: 'Feature',
      id,
      geometry: roundCoords(feature.geometry),
      properties: props,
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

async function runFetch() {
  const bbox = PLACES_BBOX
  const query = `[out:json][timeout:90];
(
  nwr["building"](${bbox});
  nwr["amenity"](${bbox});
  nwr["shop"](${bbox});
  nwr["leisure"](${bbox});
  nwr["tourism"](${bbox});
  nwr["landuse"](${bbox});
);
out geom;`

  console.log('Querying Overpass API...')
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ]

  let data: any = null
  const fileArg = process.argv.indexOf('--from-file')
  if (fileArg !== -1) {
    const filePath = process.argv[fileArg + 1]
    if (!filePath) throw new Error('--from-file needs a path to a saved Overpass JSON response')
    console.log(`Reading Overpass response from ${filePath}`)
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } else {
    for (const url of endpoints) {
      try {
        console.log(`Trying ${url}...`)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'senati-campus-map-build/1.0',
          },
          body: `data=${encodeURIComponent(query)}`,
        })
        if (res.ok) {
          data = await res.json()
          break
        }
        console.warn(`${url} returned HTTP ${res.status}`)
      } catch (err) {
        console.warn(`Failed with ${url}:`, err)
      }
    }
  }

  if (!data) {
    throw new Error('All Overpass endpoints failed')
  }

  console.log(`Fetched ${data.elements?.length || 0} elements. Transforming...`)
  const fc = transformOverpass(data)

  // Only nearby buildings and areas are in scope for the wider fetch. POI dots
  // stay limited to the original campus frame so the marker set does not grow.
  const [west, south, east, north] = CAMPUS.bounds
  fc.features = fc.features.filter((feature) => {
    if (feature.properties.geometryType !== 'point') return true
    const { labelLng: lng, labelLat: lat } = feature.properties
    return lng >= west && lng <= east && lat >= south && lat <= north
  })

  const counts: Record<string, number> = {}
  for (const f of fc.features) {
    const c = f.properties.category ?? 'uncategorised'
    counts[c] = (counts[c] || 0) + 1
  }

  console.log('Features count per category:')
  console.table(counts)
  console.log(`Total features: ${fc.features.length}`)

  const outPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../src/data/places.geojson',
  )
  fs.writeFileSync(outPath, JSON.stringify(fc, null, 2), 'utf-8')
  console.log(`Wrote places.geojson to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`)
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && (process.argv[1] === currentFile || process.argv[1].endsWith('fetch-places.ts'))) {
  runFetch().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
