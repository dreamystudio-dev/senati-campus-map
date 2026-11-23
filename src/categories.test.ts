// src/categories.test.ts
import { readFileSync } from 'node:fs'
import { CATEGORIES, CATEGORY_BY_ID, resolveCategory } from './categories'

it('has the seventeen spec categories', () => {
  expect(CATEGORIES).toHaveLength(17)
  expect(Object.keys(CATEGORY_BY_ID)).toHaveLength(17)
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

it('matches visitable place tags that were previously dropped', () => {
  const expected: Array<[Record<string, string>, string]> = [
    [{ amenity: 'pharmacy' }, 'health'],
    [{ amenity: 'veterinary' }, 'health'],
    [{ amenity: 'post_office' }, 'community'],
    [{ amenity: 'courthouse' }, 'community'],
    [{ tourism: 'information' }, 'community'],
    [{ amenity: 'bus_station' }, 'transit'],
    [{ tourism: 'theme_park' }, 'entertainment'],
    [{ leisure: 'dance' }, 'entertainment'],
    [{ amenity: 'nightclub' }, 'entertainment'],
    [{ amenity: 'toilets' }, 'facilities'],
    [{ amenity: 'charging_station' }, 'facilities'],
    [{ amenity: 'fountain' }, 'facilities'],
    [{ amenity: 'ice_cream' }, 'food'],
    [{ amenity: 'food_court' }, 'food'],
    [{ leisure: 'recreation_ground' }, 'sport'],
    [{ amenity: 'prep_school' }, 'education'],
  ]
  for (const [tags, id] of expected) {
    expect(resolveCategory(tags)?.id, JSON.stringify(tags)).toBe(id)
  }
})

it('still drops street furniture and non-place land use', () => {
  for (const tags of [
    { amenity: 'waste_basket' },
    { amenity: 'recycling' },
    { amenity: 'parking_entrance' },
    { landuse: 'grass' },
    { landuse: 'industrial' },
    { landuse: 'residential' },
    { landuse: 'garages' },
    { landuse: 'greenfield' },
  ]) {
    expect(resolveCategory(tags), JSON.stringify(tags)).toBeNull()
  }
})

it('assigns fixed-palette colours to all seventeen categories', () => {
  const palette = new Set([
    '#5aa9e6', '#ef6f6c', '#f2b134', '#9b7ede', '#8bc34a',
    '#2ec4b6', '#e56b9f', '#e8e2d6', '#f08a3c', '#6b7a8f',
  ])
  for (const category of CATEGORIES) expect(palette.has(category.color)).toBe(true)
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
