// src/camera/player.test.ts
import { CAMPUS } from '../map/bounds'
import { FREE_VANTAGE } from './transition'
import {
  PLAYER_BOUNDS,
  PLAYER_LIMITS,
  eyeAndAhead,
  lngLatToMetres,
  metresToLngLat,
  playerFromVantage,
  stepPlayer,
  turn,
} from './player'

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

it('converts vantage coordinates back to local metres', () => {
  const [lng, lat] = metresToLngLat(CAMPUS.center, 12, -34)
  const [x, y] = lngLatToMetres(CAMPUS.center, lng, lat)
  expect(x).toBeCloseTo(12, 4)
  expect(y).toBeCloseTo(-34, 4)
})

it('keeps the player inside the padded campus box', () => {
  const p = stepPlayer(still, { ...noInput, forward: true, sprint: true }, 1000)
  expect(p.x).toBeCloseTo(PLAYER_BOUNDS.maxX, 3)
  expect(stepPlayer(still, { ...noInput, back: true, sprint: true }, 1000).x).toBeCloseTo(PLAYER_BOUNDS.minX, 3)
  expect(p.y).toBeGreaterThanOrEqual(PLAYER_BOUNDS.minY)
  expect(p.y).toBeLessThanOrEqual(PLAYER_BOUNDS.maxY)
})

it('seeds the player at the free vantage with a matching heading and pitch', () => {
  const p = playerFromVantage(FREE_VANTAGE)
  expect(p.x).toBeCloseTo(0, 3)
  expect(p.y).toBeCloseTo(-167, 0)
  expect(p.heading).toBeCloseTo(Math.PI / 2, 5)
  expect(p.eyeM).toBe(FREE_VANTAGE.eyeM)
  expect(p.pitchDeg).toBe(FREE_VANTAGE.mapPitch - 90)
  expect(eyeAndAhead(p).eye[1]).toBeCloseTo(FREE_VANTAGE.lat, 6)
})
