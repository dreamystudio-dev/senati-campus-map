// src/map/options.test.ts
import { applyCameraLimits, mapOptions } from './options'

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

function recordingMap() {
  const calls: [string, number | boolean][] = []
  return {
    calls,
    setMinZoom: (v: number) => calls.push(['minZoom', v]),
    setMaxZoom: (v: number) => calls.push(['maxZoom', v]),
    setMaxPitch: (v: number) => calls.push(['maxPitch', v]),
    setCenterClampedToGround: (v: boolean) => calls.push(['clamp', v]),
  }
}

it('releases the top-view camera caps when entering free view', () => {
  const map = recordingMap()
  applyCameraLimits(map as never, 'free')
  expect(Object.fromEntries(map.calls)).toMatchObject({
    maxZoom: 22,
    maxPitch: 95,
    clamp: false,
  })
})

it('restores the top-view caps when leaving free view', () => {
  const map = recordingMap()
  applyCameraLimits(map as never, 'top')
  expect(Object.fromEntries(map.calls)).toMatchObject({
    minZoom: 15.5,
    maxZoom: 19.5,
    maxPitch: 60,
    clamp: true,
  })
})
