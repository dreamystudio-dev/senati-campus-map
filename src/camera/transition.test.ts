// src/camera/transition.test.ts
import { FREE_VANTAGE, transitionPlan } from './transition'

it('enters free view at the drone vantage, not at eye level', () => {
  const plan = transitionPlan('top', 'free')
  expect(plan).toMatchObject({ pitch: 55, zoom: expect.any(Number) })
  expect(FREE_VANTAGE.eyeM).toBe(25)
})

it('returns to a flat north-up view at the fitted zoom', () => {
  const viewport = { width: 1280, height: 800 }
  expect(transitionPlan('free', 'top', viewport)).toMatchObject({
    pitch: 0,
    bearing: 0,
    zoom: expect.any(Number),
  })
  const tall = transitionPlan('free', 'top', { width: 1280, height: 1200 })
  expect(tall?.zoom).not.toBe(transitionPlan('free', 'top', viewport)?.zoom)
})

it('has no plan when the mode does not change', () => {
  expect(transitionPlan('top', 'top')).toBeNull()
})
