// src/camera/useFreeView.test.tsx
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import type { Player } from './player'
import { useAppStore } from '../store'
import { useFreeView } from './useFreeView'

let frames: FrameRequestCallback[] = []

function flush(time = 16) {
  const batch = frames
  frames = []
  batch.forEach((cb) => cb(time))
}

function makeMap() {
  const handler = () => ({ enable: vi.fn(), disable: vi.fn() })
  return {
    jumpTo: vi.fn(),
    calculateCameraOptionsFromTo: vi.fn(() => ({
      center: [-77, -12],
      zoom: 21,
      pitch: 60,
      bearing: 0,
    })),
    dragPan: handler(),
    dragRotate: handler(),
    scrollZoom: handler(),
    doubleClickZoom: handler(),
    touchZoomRotate: handler(),
  }
}

function makePlayerRef(): { current: Player } {
  return { current: { x: 0, y: -167, heading: Math.PI / 2, eyeM: 25, pitchDeg: -35 } }
}

beforeEach(() => {
  frames = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frames.push(cb)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  useAppStore.setState({
    mode: 'top',
    locked: false,
    lockRefused: false,
    transitioning: false,
  })
})

afterEach(() => {
  window.removeEventListener('keydown', () => {})
  vi.unstubAllGlobals()
})

it('ignores WASD while unlocked and drives the camera once locked', () => {
  const map = makeMap()
  const canvas = document.createElement('canvas')
  const playerRef = makePlayerRef()
  useAppStore.setState({ mode: 'free', locked: false })
  renderHook(() => useFreeView(map as never, canvas, playerRef))

  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    flush()
  })
  expect(map.jumpTo).not.toHaveBeenCalled()

  act(() => useAppStore.setState({ locked: true }))
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
    flush(16)
    flush(32)
  })
  expect(map.jumpTo).toHaveBeenCalled()
})

it('enables drag-look only when pointer lock was refused', () => {
  const map = makeMap()
  const canvas = document.createElement('canvas')
  const playerRef = makePlayerRef()
  const move = new MouseEvent('mousemove')
  Object.defineProperty(move, 'movementX', { value: 100 })
  Object.defineProperty(move, 'movementY', { value: 0 })

  useAppStore.setState({ mode: 'free', locked: false, lockRefused: false })
  const first = renderHook(() => useFreeView(map as never, canvas, playerRef))
  act(() => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    window.dispatchEvent(move)
    window.dispatchEvent(new MouseEvent('mouseup'))
  })
  expect(playerRef.current.heading).toBe(Math.PI / 2)
  first.unmount()

  useAppStore.setState({ lockRefused: true })
  renderHook(() => useFreeView(map as never, canvas, playerRef))
  act(() => {
    window.dispatchEvent(new MouseEvent('mousedown', { button: 0 }))
    window.dispatchEvent(move)
    window.dispatchEvent(new MouseEvent('mouseup'))
  })
  expect(playerRef.current.heading).not.toBe(Math.PI / 2)
})

it('disables standard map handlers while transitioning', () => {
  const map = makeMap()
  useAppStore.setState({ transitioning: true })
  renderHook(() => useFreeView(map as never, document.createElement('canvas'), makePlayerRef()))

  expect(map.dragPan.disable).toHaveBeenCalled()
  expect(map.dragPan.enable).not.toHaveBeenCalled()
})

it('stops the camera loop after repeated projection failures', () => {
  const map = makeMap()
  map.calculateCameraOptionsFromTo.mockImplementation(() => {
    throw new Error('same From and To')
  })
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  useAppStore.setState({ mode: 'free', locked: true })
  renderHook(() => useFreeView(map as never, document.createElement('canvas'), makePlayerRef()))

  act(() => {
    flush(16)
    flush(32)
    flush(48)
  })

  expect(error).toHaveBeenCalled()
  expect(frames).toHaveLength(0)
  error.mockRestore()
})
