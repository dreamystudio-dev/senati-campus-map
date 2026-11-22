// src/categories.test.ts
import { CATEGORIES, CATEGORY_BY_ID, resolveCategory } from './categories'

it('has the twelve spec categories', () => {
  expect(CATEGORIES).toHaveLength(12)
  expect(Object.keys(CATEGORY_BY_ID)).toHaveLength(12)
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

it('gives areas a generic label and buildings none', () => {
  expect(CATEGORY_BY_ID.park.genericLabel).toBe('Parque')
  expect(CATEGORY_BY_ID.parking.genericLabel).toBe('Estacionamiento')
  expect(CATEGORY_BY_ID.shop.genericLabel).toBeUndefined()
})
