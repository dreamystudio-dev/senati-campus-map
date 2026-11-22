import { installInvertedRotation, rotationDelta } from './invertRotation'

it('negates horizontal bearing delta and keeps the pitch delta', () => {
  expect(rotationDelta({ x: 100, y: 100 }, { x: 150, y: 80 })).toEqual({
    bearingDelta: -40,
    pitchDelta: 10,
  })
})

function setup() {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  const jumpTo = vi.fn()
  let bearing = 0
  let pitch = 0
  const map = {
    dragRotate: { disable: vi.fn() },
    getCanvas: () => canvas,
    getBearing: () => bearing,
    getPitch: () => pitch,
    jumpTo: (o: { bearing?: number; pitch?: number }) => {
      jumpTo(o)
      if (o.bearing !== undefined) bearing = o.bearing
      if (o.pitch !== undefined) pitch = o.pitch
    },
  }
  const uninstall = installInvertedRotation(map as never)
  const drag = (from: { x: number; y: number }, to: { x: number; y: number }, init: MouseEventInit = {}) => {
    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: from.x, clientY: from.y, bubbles: true, ...init }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: to.x, clientY: to.y, bubbles: true }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  }
  return { canvas, map, jumpTo, uninstall, drag }
}

it('takes over right-drag and ctrl+left-drag from MapLibre', () => {
  const { map, jumpTo, drag } = setup()
  expect(map.dragRotate.disable).toHaveBeenCalledOnce()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 })
  expect(jumpTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: -40, pitch: 5 }))
  jumpTo.mockClear()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 }, { button: 0, ctrlKey: true })
  expect(jumpTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: -80, pitch: 10 }))
})

it('ignores plain left-drag, suppresses the context menu and cleans up', () => {
  const { canvas, jumpTo, uninstall, drag } = setup()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 }, { button: 0 })
  expect(jumpTo).not.toHaveBeenCalled()
  expect(canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))).toBe(false)
  uninstall()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 })
  expect(jumpTo).not.toHaveBeenCalled()
})
