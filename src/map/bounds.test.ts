// src/map/bounds.test.ts
import { CAMPUS, fitZoom, paddedBounds } from './bounds'

it('pads the campus box by the given ratio', () => {
  const [w, s, e, n] = paddedBounds([-77.0635, -12.0018, -77.0575, -11.9965], 0.1)
  expect(w).toBeCloseTo(-77.0641, 6)
  expect(s).toBeCloseTo(-12.00233, 6)
  expect(e).toBeCloseTo(-77.0569, 6)
  expect(n).toBeCloseTo(-11.99597, 6)
})

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

it('clamps to the top-view limits', () => {
  expect(fitZoom([-77.0606, -11.9997, -77.0605, -11.9996], { width: 1280, height: 800 }, 0)).toBe(19.5)
})
