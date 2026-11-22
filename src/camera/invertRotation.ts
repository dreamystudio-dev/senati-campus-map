import type { Map } from 'maplibre-gl'

type Point = { x: number; y: number }

/** MapLibre's rotate sign is reversed for this map; tilt keeps its native sign. */
export function rotationDelta(last: Point, current: Point) {
  return {
    bearingDelta: -(current.x - last.x) * 0.8,
    pitchDelta: -(current.y - last.y) * 0.5,
  }
}

/** Replaces MapLibre's rotate/pitch drag with one that turns the map the other way. */
export function installInvertedRotation(map: Map): () => void {
  map.dragRotate.disable()
  const canvas = map.getCanvas()
  let last: Point | null = null

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 2 && !(e.button === 0 && e.ctrlKey)) return
    last = { x: e.clientX, y: e.clientY }
  }

  const onMouseMove = (e: MouseEvent) => {
    if (!last) return
    const delta = rotationDelta(last, { x: e.clientX, y: e.clientY })
    last = { x: e.clientX, y: e.clientY }
    map.jumpTo({
      bearing: map.getBearing() + delta.bearingDelta,
      pitch: Math.max(0, Math.min(60, map.getPitch() + delta.pitchDelta)),
    })
  }

  const onMouseUp = () => {
    last = null
  }

  const onContextMenu = (e: MouseEvent) => e.preventDefault()

  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)

  return () => {
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('contextmenu', onContextMenu)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }
}
