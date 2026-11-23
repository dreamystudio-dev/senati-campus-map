// src/categories.test.ts
import { readFileSync } from 'node:fs'
import { CATEGORIES, CATEGORY_BY_ID, resolveCategory } from './categories'

it('has the twelve spec categories', () => {
  expect(CATEGORIES).toHaveLength(12)
  expect(Object.keys(CATEGORY_BY_ID)).toHaveLength(12)
})

it('draws education areas as a faint outline, not a solid fill', () => {
  expect(CATEGORY_BY_ID.education.style).toBe('outline')
})

it.each([
  [{ amenity: 'marketplace' }, 'market'],
  [{ shop: 'car_parts' }, 'shop'],
  [{ leisure: 'park' }, 'park'],
  [{ amenity: 'cafe' }, 'food'],
  [{ amenity: 'college' }, 'education'],
  [{ office: 'educational_institution' }, 'education'],
  [{ tourism: 'artwork' }, 'art'],
  [{ landuse: 'construction' }, 'construction'],
])('resolves %o to %s', (tags, id) => {
  expect(resolveCategory(tags)?.id).toBe(id)
})

it('drops filler landuse and unknown tags', () => {
  expect(resolveCategory({ landuse: 'grass' })).toBeNull()
  expect(resolveCategory({ amenity: 'recycling' })).toBeNull()
  expect(resolveCategory({})).toBeNull()
})

it('gives areas English generic labels and buildings none', () => {
  expect(CATEGORY_BY_ID.park.genericLabel).toBe('Park')
  expect(CATEGORY_BY_ID.sport.genericLabel).toBe('Pitch')
  expect(CATEGORY_BY_ID.parking.genericLabel).toBe('Parking')
  expect(CATEGORY_BY_ID.construction.genericLabel).toBe('Construction')
  expect(CATEGORY_BY_ID.shop.genericLabel).toBeUndefined()
})

it('keeps only English generic labels in the committed places data', () => {
  const places = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { genericLabel?: string } }>
  }

  const labels = places.features
    .map((feature) => feature.properties.genericLabel)
    .filter((label): label is string => Boolean(label))
  const allowed = new Set(['Park', 'Pitch', 'Parking', 'Construction'])

  expect(labels.length).toBeGreaterThan(0)
  for (const label of labels) expect(allowed.has(label)).toBe(true)
})
