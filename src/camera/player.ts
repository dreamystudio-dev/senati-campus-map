import { CAMPUS } from '../map/bounds'

export interface Player {
  x: number
  y: number
  heading: number // in radians or degrees? let's check heading 0 points east => cos(heading), sin(heading)
  eyeM: number
  pitchDeg: number
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

    // Heading 0 points East (+x). Heading theta rotates coordinate frame:
    // Forward direction: (cos(heading), sin(heading))
    // Right direction: (sin(heading), -cos(heading)) or similar standard FPS movement
    // When heading is 0: forward is +x, right is -y or +y?
    // In still test: heading 0, forward=true => p.x = walk, p.y = 0.
    // forward: dx = normX * cos(heading) - normY * sin(heading)... wait, let's check:
    // If forward=true, right=true => moveX=1, moveY=1.
    // Hypotenuse is sqrt(2). normX = 1/sqrt(2), normY = 1/sqrt(2).
    // The test expects: Math.hypot(p.x, p.y) toBeCloseTo walk
    // With heading 0:
    // forward moves along heading: (cos(heading), sin(heading))
    // right moves perpendicular to forward (90 deg clockwise or counterclockwise? In cartesian +x is East, +y is North):
    // If heading is from East counter-clockwise or clockwise?
    // Forward vector: F = [cos(h), sin(h)]
    // Strafe right vector: R = [sin(h), -cos(h)]
    // Then movement = (normX * F + normY * R) * speed * dt
    // If heading = 0: F = [1, 0], R = [0, -1].
    // Then forward=1, right=1 => movement = [1/sqrt(2)*1, 1/sqrt(2)*(-1)] * speed * dt.
    // Hypotenuse = sqrt( (speed/sqrt(2))^2 + (-speed/sqrt(2))^2 ) = speed * dt!
    const forwardX = Math.cos(p.heading)
    const forwardY = Math.sin(p.heading)
    const rightX = Math.sin(p.heading)
    const rightY = -Math.cos(p.heading)

    const vx = normX * forwardX + normY * rightX
    const vy = normX * forwardY + normY * rightY

    newX += vx * speed * dt
    newY += vy * speed * dt
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
