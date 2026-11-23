import { installInvertedRotation, rotationDelta } from './invertRotation'

const CENTER = { x: 500, y: 300 }
const cleanups: Array<() => void> = []
const canvases: HTMLCanvasElement[] = []

afterEach(() => {
  cleanups.splice(0).forEach((fn) => fn())
  canvases.splice(0).forEach((el) => el.remove())
})

function setup(maxPitch = 60) {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  canvases.push(canvas)
  const jumpTo = vi.fn()
  let bearing = 0
  let pitch = 0
  const map = {
    dragRotate: { disable: vi.fn() },
    getCanvas: () => canvas,
    getBearing: () => bearing,
    getPitch: () => pitch,
    getMaxPitch: () => maxPitch,
    getCenter: vi.fn(() => ({ lng: 0, lat: 0 })),
    project: vi.fn(() => CENTER),
    jumpTo: (o: { bearing?: number; pitch?: number }) => {
      jumpTo(o)
      if (o.bearing !== undefined) bearing = o.bearing
      if (o.pitch !== undefined) pitch = o.pitch
    },
  }
  const uninstall = installInvertedRotation(map as never)
  cleanups.push(uninstall)
  const mouse = (type: string, x: number, y: number, init: MouseEventInit = {}) =>
    (type === 'mousedown' ? canvas : window).dispatchEvent(
      new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, ...init }),
    )
  const drag = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    init: { button?: number; ctrlKey?: boolean } = {},
  ) => {
    const button = init.button ?? 2
    const buttons = button === 0 ? 1 : 2
    const opts = { button, buttons, ctrlKey: init.ctrlKey ?? false }
    mouse('mousedown', from.x, from.y, opts)
    mouse('mousemove', to.x, to.y, opts)
    mouse('mouseup', to.x, to.y, { ...opts, buttons: 0 })
  }
  const setBearing = (value: number) => {
    bearing = value
  }
  return { canvas, map, jumpTo, uninstall, drag, mouse, setBearing }
}

it('negates native bearing below the centre and keeps the pitch delta', () => {
  expect(rotationDelta({ x: 500, y: 350 }, { x: 550, y: 350 }, CENTER)).toEqual({
    bearingDelta: -40,
    pitchDelta: 0,
  })
  expect(rotationDelta({ x: 500, y: 350 }, { x: 500, y: 330 }, CENTER)).toEqual({
    bearingDelta: 0,
    pitchDelta: 10,
  })
})

it('also negates the bearing MapLibre flips above the centre', () => {
  expect(rotationDelta({ x: 500, y: 250 }, { x: 550, y: 250 }, CENTER)).toEqual({
    bearingDelta: 40,
    pitchDelta: 0,
  })
})

it('negates MapLibre angular rotation far from the centre', () => {
  const delta = rotationDelta({ x: 500, y: 500 }, { x: 700, y: 500 }, CENTER)
  expect(delta.bearingDelta).toBeCloseTo(-45, 6)
  expect(delta.pitchDelta).toBe(0)
})

it('takes over right-drag and ctrl+left-drag with inverted bearing', () => {
  const { map, jumpTo, drag, setBearing } = setup()
  expect(map.dragRotate.disable).toHaveBeenCalledOnce()
  drag({ x: 500, y: 250 }, { x: 550, y: 250 })
  expect(jumpTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: 40, pitch: 0 }))
  jumpTo.mockClear()
  setBearing(0)
  drag({ x: 500, y: 350 }, { x: 550, y: 340 }, { button: 0, ctrlKey: true })
  expect(jumpTo).toHaveBeenLastCalledWith(expect.objectContaining({ bearing: -40, pitch: 5 }))
})

it('clamps tilt to the map maximum', () => {
  const { jumpTo, drag } = setup(45)
  drag({ x: 500, y: 350 }, { x: 500, y: 550 })
  drag({ x: 500, y: 350 }, { x: 500, y: 550 })
  expect(jumpTo).toHaveBeenCalledTimes(2)
  for (const call of jumpTo.mock.calls) {
    const pitch = (call[0] as { pitch: number }).pitch
    expect(pitch).toBeGreaterThanOrEqual(0)
    expect(pitch).toBeLessThanOrEqual(45)
  }
  expect(jumpTo.mock.calls.at(-1)?.[0]).toMatchObject({ pitch: 0 })
})

it('ignores sub-3px drags and measures the first accepted move from the start', () => {
  const { jumpTo, mouse } = setup()
  mouse('mousedown', 500, 350, { button: 2, buttons: 2 })
  mouse('mousemove', 502, 350, { button: 2, buttons: 2 })
  expect(jumpTo).not.toHaveBeenCalled()
  mouse('mousemove', 520, 350, { button: 2, buttons: 2 })
  expect(jumpTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: -16 }))
})

it('resets when the button is released outside the window or the window blurs', () => {
  const { jumpTo, mouse } = setup()
  mouse('mousedown', 500, 350, { button: 2, buttons: 2 })
  mouse('mousemove', 520, 350, { button: 2, buttons: 0 })
  expect(jumpTo).not.toHaveBeenCalled()
  mouse('mousemove', 520, 350, { button: 2, buttons: 2 })
  expect(jumpTo).not.toHaveBeenCalled()

  mouse('mousedown', 500, 350, { button: 2, buttons: 2 })
  window.dispatchEvent(new Event('blur'))
  mouse('mousemove', 520, 350, { button: 2, buttons: 2 })
  expect(jumpTo).not.toHaveBeenCalled()
})

it('ignores plain left-drag, suppresses the context menu and cleans up', () => {
  const { canvas, jumpTo, uninstall, drag } = setup()
  drag({ x: 500, y: 350 }, { x: 550, y: 350 }, { button: 0 })
  expect(jumpTo).not.toHaveBeenCalled()
  expect(canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))).toBe(false)
  uninstall()
  drag({ x: 500, y: 350 }, { x: 550, y: 350 })
  expect(jumpTo).not.toHaveBeenCalled()
})
