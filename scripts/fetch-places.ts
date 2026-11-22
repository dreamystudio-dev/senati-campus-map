import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import osmtogeojson from 'osmtogeojson'
import polylabel from '@mapbox/polylabel'
import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon, Point, Position } from 'geojson'
import { resolveCategory, type CategoryId } from '../src/categories'

export interface PlaceProps {
  id: string
  name?: string
  category: CategoryId
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

export function transformOverpass(osm: unknown): FeatureCollection<Geometry, PlaceProps> {
  const geojson = osmtogeojson(osm) as FeatureCollection<Geometry, Record<string, any>>
  const features: Feature<Geometry, PlaceProps>[] = []

  for (const feature of geojson.features) {
    if (!feature.geometry) continue

    const tags: Record<string, string> = (feature.properties?.tags || feature.properties || {})
    const category = resolveCategory(tags)
    if (!category) continue

    // Determine geometryType
    const geomType = feature.geometry.type
    let placeGeometryType: 'building' | 'area' | 'point'

    if (tags.building && tags.building !== 'no') {
      placeGeometryType = 'building'
    } else if (geomType === 'Point') {
      placeGeometryType = 'point'
    } else {
      placeGeometryType = 'area'
    }

    // Determine label coordinate
    let labelLng: number
    let labelLat: number

    if (geomType === 'Point') {
      const pt = (feature.geometry as Point).coordinates
      labelLng = pt[0]
      labelLat = pt[1]
    } else if (geomType === 'Polygon') {
      const poly = feature.geometry as Polygon
      const [lng, lat] = polylabel(poly.coordinates, 1.0)
      labelLng = lng
      labelLat = lat
    } else if (geomType === 'MultiPolygon') {
      const mpoly = feature.geometry as MultiPolygon
      // find largest polygon by ring length or first
      let bestPoly = mpoly.coordinates[0]
      for (const p of mpoly.coordinates) {
        if (p[0].length > bestPoly[0].length) {
          bestPoly = p
        }
      }
      const [lng, lat] = polylabel(bestPoly, 1.0)
      labelLng = lng
      labelLat = lat
    } else {
      continue
    }

    // ID formatting: osm type and id (feature.id is usually "way/123", "node/123", "relation/123")
    const id = String(feature.id)

    const kind = getPrimaryKind(tags, category.id)
    const levels = tags['building:levels'] ? parseFloat(tags['building:levels']) : undefined
    const heightM = placeGeometryType === 'building' ? deriveHeightM(tags) : undefined

    const props: PlaceProps = {
      id,
      category: category.id,
      kind,
      geometryType: placeGeometryType,
      labelLng: round5(labelLng),
      labelLat: round5(labelLat),
    }

    if (tags.name) {
      props.name = tags.name
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
  const bbox = '-12.0018,-77.0635,-11.9965,-77.0575'
  const query = `[out:json][timeout:90];
(
  nwr["building"](${bbox});
  nwr["amenity"](${bbox});
  nwr["shop"](${bbox});
  nwr["leisure"](${bbox});
  nwr["tourism"](${bbox});
);
out geom;`

  console.log('Querying Overpass API...')
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  ]

  let data: any = null
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
    } catch (err) {
      console.warn(`Failed with ${url}:`, err)
    }
  }

  if (!data) {
    throw new Error('All Overpass endpoints failed')
  }

  console.log(`Fetched ${data.elements?.length || 0} elements. Transforming...`)
  const fc = transformOverpass(data)

  const counts: Record<string, number> = {}
  for (const f of fc.features) {
    const c = f.properties.category
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
