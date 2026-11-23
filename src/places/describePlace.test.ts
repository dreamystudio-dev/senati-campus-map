// src/places/describePlace.test.ts
import { describePlace } from './describePlace'

const base = { id: 'way/1', category: 'park', kind: 'leisure=park', geometryType: 'area', labelLng: 0, labelLat: 0 } as const

it('uses the name when present', () => {
  expect(describePlace({ ...base, name: 'Parque Central' }).title).toBe('Parque Central')
})

it('falls back to the generic label for unnamed areas', () => {
  expect(describePlace({ ...base }).title).toBe('Park')
})

it('never returns a blank title for an unnamed building', () => {
  const p = { ...base, category: 'shop', geometryType: 'building' } as const
  expect(describePlace({ ...p }).title).toBe('Unnamed shop')
})

it('does not invent a type for a category-less feature', () => {
  const p = { ...base, category: null, geometryType: 'building' } as const
  const summary = describePlace({ ...p })
  expect(JSON.stringify(summary)).not.toContain('Unnamed building')
  expect(JSON.stringify(summary)).not.toContain('Building')
})

it('reports levels and height when known', () => {
  const p = { ...base, category: 'education', geometryType: 'building', levels: 2, heightM: 6.4 } as const
  expect(describePlace({ ...p }).meta).toEqual(['Education', '2 levels', '6.4 m'])
})
