// src/map/bounds.test.ts
import { CAMPUS, fitZoom } from './bounds'

it('fits the campus at a laptop viewport inside the allowed range', () => {
  const zoom = fitZoom(CAMPUS.bounds, { width: 1280, height: 800 }, 48)
  expect(zoom).toBeGreaterThanOrEqual(15.5)
  expect(zoom).toBeLessThanOrEqual(19.5)
})

it('zooms out as the viewport shrinks', () => {
  const wide = fitZoom(CAMPUS.bounds, { width: 1920, height: 1080 }, 48)
  const narrow = fitZoom(CAMPUS.bounds, { width: 1100, height: 900 }, 48)
  expect(narrow).toBeLessThanOrEqual(wide)
})

it('clamps to the widened zoom range', () => {
  expect(fitZoom([-77.0606, -11.9997, -77.0605, -11.9996], { width: 1280, height: 800 }, 0)).toBe(19.5)
  expect(fitZoom([-79, -14, -75, -10], { width: 1280, height: 800 }, 0)).toBe(12)
})
