// src/map/options.test.ts
import { mapOptions } from './options'

it('applies the top-view guardrails', () => {
  const o = mapOptions({ width: 1280, height: 800 })
  expect(o.minZoom).toBe(15.5)
  expect(o.maxZoom).toBe(19.5)
  expect(o.maxPitch).toBe(60)
  expect(o.renderWorldCopies).toBe(false)
  expect(o.centerClampedToGround).toBe(true)
  const [w, s, e, n] = o.maxBounds as [number, number, number, number]
  expect(w).toBeCloseTo(-77.0641, 6)
  expect(s).toBeCloseTo(-12.00233, 6)
  expect(e).toBeCloseTo(-77.0569, 6)
  expect(n).toBeCloseTo(-11.99597, 6)
})
