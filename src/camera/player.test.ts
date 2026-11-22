// src/camera/player.test.ts
import { PLAYER_LIMITS, eyeAndAhead, metresToLngLat, stepPlayer, turn } from './player'

const still = { x: 0, y: 0, heading: 0, eyeM: 25, pitchDeg: 0 }
const noInput = { forward: false, back: false, left: false, right: false, up: false, down: false, sprint: false }

it('moves forward along the heading at walk speed', () => {
  const p = stepPlayer(still, { ...noInput, forward: true }, 1)
  expect(p.x).toBeCloseTo(PLAYER_LIMITS.walk, 5)
  expect(p.y).toBeCloseTo(0, 5)
})

it('normalises diagonal movement', () => {
  const p = stepPlayer(still, { ...noInput, forward: true, right: true }, 1)
  expect(Math.hypot(p.x, p.y)).toBeCloseTo(PLAYER_LIMITS.walk, 5)
})

it('clamps eye height and pitch', () => {
  expect(stepPlayer(still, { ...noInput, up: true }, 60).eyeM).toBe(PLAYER_LIMITS.eyeMax)
  expect(stepPlayer(still, { ...noInput, down: true }, 60).eyeM).toBe(PLAYER_LIMITS.eyeMin)
  expect(turn(still, 0, 90).pitchDeg).toBe(PLAYER_LIMITS.pitchMax)
  expect(turn(still, 0, -90).pitchDeg).toBe(PLAYER_LIMITS.pitchMin)
})

it('round-trips metres through lng/lat', () => {
  const origin: [number, number] = [-77.0604, -11.999]
  const [lng, lat] = metresToLngLat(origin, 100, 50)
  expect(lng).toBeGreaterThan(origin[0])
  expect(lat).toBeGreaterThan(origin[1])
})

it('puts the look-ahead point in front of the camera', () => {
  const { eye, ahead } = eyeAndAhead({ ...still, heading: 0 }, 20)
  expect(ahead[0]).toBeGreaterThan(eye[0])
})
