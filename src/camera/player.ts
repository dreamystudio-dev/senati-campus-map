import { CAMPUS, paddedBounds } from '../map/bounds'

export interface Player {
  x: number
  y: number
  heading: number // radians; 0 points east, positive rotates north
  eyeM: number
  pitchDeg: number
}

export type PlayerRef = { current: Player }

export interface Vantage {
  lng: number
  lat: number
  eyeM: number
  mapPitch: number
  headingDeg: number
}

export interface InputState {
  forward: boolean
  back: boolean
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  sprint: boolean
}

export const PLAYER_LIMITS = {
  eyeMin: 2,
  eyeMax: 80,
  pitchMin: -60,
  pitchMax: 5,
  walk: 8,
  sprint: 20,
  verticalSpeed: 6,
}

export function metresToLngLat(origin: [number, number], x: number, y: number): [number, number] {
  const [lng0, lat0] = origin
  const latRad = (lat0 * Math.PI) / 180
  const metersPerDegreeLat = 111320
  const metersPerDegreeLng = 111320 * Math.cos(latRad)

  const lng = lng0 + x / metersPerDegreeLng
  const lat = lat0 + y / metersPerDegreeLat
  return [lng, lat]
}

export function lngLatToMetres(origin: [number, number], lng: number, lat: number): [number, number] {
  const latRad = (origin[1] * Math.PI) / 180
  return [
    (lng - origin[0]) * 111320 * Math.cos(latRad),
    (lat - origin[1]) * 111320,
  ]
}

export const PLAYER_BOUNDS = (() => {
  const [w, s, e, n] = paddedBounds(CAMPUS.bounds, 0.1)
  const [minX, minY] = lngLatToMetres(CAMPUS.center, w, s)
  const [maxX, maxY] = lngLatToMetres(CAMPUS.center, e, n)
  return { minX, maxX, minY, maxY }
})()

export function playerFromVantage(v: Vantage): Player {
  const [x, y] = lngLatToMetres(CAMPUS.center, v.lng, v.lat)
  return {
    x,
    y,
    heading: (v.headingDeg * Math.PI) / 180,
    eyeM: v.eyeM,
    // MapLibre pitch is measured from straight down; a level gaze is 90°.
    pitchDeg: v.mapPitch - 90,
  }
}

export function stepPlayer(p: Player, input: InputState, dt: number): Player {
  let moveX = 0
  let moveY = 0

  if (input.forward) moveX += 1
  if (input.back) moveX -= 1
  if (input.right) moveY += 1
  if (input.left) moveY -= 1

  const len = Math.hypot(moveX, moveY)
  const speed = input.sprint ? PLAYER_LIMITS.sprint : PLAYER_LIMITS.walk

  let newX = p.x
  let newY = p.y

  if (len > 0) {
    const normX = moveX / len
    const normY = moveY / len

    // Forward is (cos h, sin h); strafe right is (sin h, -cos h).
    const forwardX = Math.cos(p.heading)
    const forwardY = Math.sin(p.heading)
    const rightX = Math.sin(p.heading)
    const rightY = -Math.cos(p.heading)

    const vx = normX * forwardX + normY * rightX
    const vy = normX * forwardY + normY * rightY

    newX += vx * speed * dt
    newY += vy * speed * dt

    // Keep the player inside the same padded box that constrains the camera.
    newX = Math.min(PLAYER_BOUNDS.maxX, Math.max(PLAYER_BOUNDS.minX, newX))
    newY = Math.min(PLAYER_BOUNDS.maxY, Math.max(PLAYER_BOUNDS.minY, newY))
  }

  // Vertical movement
  let newEyeM = p.eyeM
  if (input.up) newEyeM += PLAYER_LIMITS.verticalSpeed * dt
  if (input.down) newEyeM -= PLAYER_LIMITS.verticalSpeed * dt
  newEyeM = Math.min(PLAYER_LIMITS.eyeMax, Math.max(PLAYER_LIMITS.eyeMin, newEyeM))

  return {
    ...p,
    x: newX,
    y: newY,
    eyeM: newEyeM,
  }
}

export function turn(p: Player, deltaYawDeg: number, deltaPitchDeg: number): Player {
  const newPitch = Math.min(
    PLAYER_LIMITS.pitchMax,
    Math.max(PLAYER_LIMITS.pitchMin, p.pitchDeg + deltaPitchDeg),
  )

  const deltaYawRad = (deltaYawDeg * Math.PI) / 180
  const newHeading = (p.heading + deltaYawRad) % (2 * Math.PI)

  return {
    ...p,
    heading: newHeading,
    pitchDeg: newPitch,
  }
}

export function eyeAndAhead(
  p: Player,
  lookAheadM = 20,
): {
  eye: [number, number]
  ahead: [number, number]
  aheadAltitudeM: number
} {
  const eye = metresToLngLat(CAMPUS.center, p.x, p.y)

  // Ahead direction vector in metres
  const aheadX = p.x + Math.cos(p.heading) * lookAheadM
  const aheadY = p.y + Math.sin(p.heading) * lookAheadM
  const ahead = metresToLngLat(CAMPUS.center, aheadX, aheadY)

  // Look direction pitch: tan(pitchDeg)
  const pitchRad = (p.pitchDeg * Math.PI) / 180
  const aheadAltitudeM = p.eyeM + Math.tan(pitchRad) * lookAheadM

  return {
    eye,
    ahead,
    aheadAltitudeM,
  }
}
