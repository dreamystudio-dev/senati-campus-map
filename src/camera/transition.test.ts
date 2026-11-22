// src/camera/transition.test.ts
import { FREE_VANTAGE, transitionPlan } from './transition'

it('enters free view at the drone vantage, not at eye level', () => {
  const plan = transitionPlan('top', 'free')
  expect(plan).toMatchObject({ pitch: 55, zoom: expect.any(Number) })
  expect(FREE_VANTAGE.eyeM).toBe(25)
})

it('returns to a flat north-up view', () => {
  expect(transitionPlan('free', 'top')).toMatchObject({ pitch: 0, bearing: 0 })
})

it('has no plan when the mode does not change', () => {
  expect(transitionPlan('top', 'top')).toBeNull()
})
