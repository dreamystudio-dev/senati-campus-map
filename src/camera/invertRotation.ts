import type { Map } from 'maplibre-gl'

type Point = { x: number; y: number }

const ROTATION_DEGREES_PER_PIXEL = 0.8
const ROTATION_SENSITIVITY = 0.5
// MapLibre uses -0.5 per pixel moved downwards; expressed as gain per pixel dragged up.
const PITCH_GAIN_PER_PIXEL = 0.5
const ANGULAR_THRESHOLD_PX = 100
const CLICK_TOLERANCE_PX = 3

/** Mirrors MapLibre's own bearing math so its negation behaves the same everywhere. */
function nativeBearingDelta(last: Point, current: Point, center: Point): number {
  if (Math.abs(center.y - last.y) > ANGULAR_THRESHOLD_PX) {
    // Far from the centre MapLibre rotates about the map centre, using the
    // cursor's current y for both vectors so vertical travel only affects tilt.
    const currentVec = { x: current.x - center.x, y: current.y - center.y }
    const lastVec = { x: last.x - center.x, y: current.y - center.y }
    const cross = currentVec.x * lastVec.y - currentVec.y * lastVec.x
    const dot = currentVec.x * lastVec.x + currentVec.y * lastVec.y
    return (Math.atan2(cross, dot) * 180) / Math.PI
  }
  let delta = (current.x - last.x) * ROTATION_DEGREES_PER_PIXEL
  if (current.y < center.y) delta = -delta
  return delta
}

/** Negates MapLibre's bearing at every drag position; tilt keeps its native sign. */
export function rotationDelta(last: Point, current: Point, center: Point) {
  return {
    bearingDelta: -nativeBearingDelta(last, current, center) * ROTATION_SENSITIVITY || 0,
    pitchDelta: (last.y - current.y) * PITCH_GAIN_PER_PIXEL,
  }
}

/** Replaces MapLibre's rotate/pitch drag with one that turns the map the other way. */
export function installInvertedRotation(map: Map): () => void {
  map.dragRotate.disable()
  const canvas = map.getCanvas()
  let last: Point | null = null
  let button: number | null = null
  let moved = false

  const reset = () => {
    last = null
    button = null
    moved = false
  }

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 2 && !(e.button === 0 && e.ctrlKey)) return
    last = { x: e.clientX, y: e.clientY }
    button = e.button
    moved = false
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!last || button === null) return
    // A missing mouseup (release outside the window) must not leave a live drag.
    const flag = button === 0 ? 1 : 2
    if (!(e.buttons & flag)) {
      reset()
      return
    }
    const current = { x: e.clientX, y: e.clientY }
    if (!moved && Math.hypot(current.x - last.x, current.y - last.y) < CLICK_TOLERANCE_PX) return
    moved = true
    const delta = rotationDelta(last, current, map.project(map.getCenter()))
    last = current
    map.jumpTo({
      bearing: map.getBearing() + delta.bearingDelta,
      pitch: Math.max(0, Math.min(map.getMaxPitch(), map.getPitch() + delta.pitchDelta)),
    })
  }

  const onMouseUp = (e: MouseEvent) => {
    if (button !== null && e.button !== button) return
    reset()
  }

  const onBlur = () => reset()
  const onContextMenu = (e: MouseEvent) => e.preventDefault()

  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
  window.addEventListener('blur', onBlur)

  return () => {
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('contextmenu', onContextMenu)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    window.removeEventListener('blur', onBlur)
    reset()
  }
}
