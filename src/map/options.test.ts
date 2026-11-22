// src/map/options.test.ts
import { mapOptions } from './options'

it('uses one static, unrestricted overview configuration', () => {
  const o = mapOptions({ width: 1280, height: 800 })
  expect(o.minZoom).toBe(12)
  expect(o.maxZoom).toBe(19.5)
  expect(o.maxPitch).toBe(60)
  expect(o.centerClampedToGround).toBe(true)
  expect(o.renderWorldCopies).toBe(true)
  expect(o.maxBounds).toBeUndefined()
  expect(o.zoom).toBeGreaterThan(12)
})
