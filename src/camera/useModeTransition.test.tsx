// src/camera/useModeTransition.test.tsx
import { act, renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import type { CameraOptions } from 'maplibre-gl'
import type { Player } from './player'
import { useAppStore } from '../store'
import { useModeTransition } from './useModeTransition'

function fakeCanvas() {
  return { requestPointerLock: vi.fn(() => Promise.resolve()) }
}

function recordingMap() {
  let moveEnd: (() => void) | null = null
  const canvas = fakeCanvas()
  const map = {
    easeTo: vi.fn(),
    jumpTo: vi.fn(),
    once: vi.fn((event: string, cb: () => void) => {
      if (event === 'moveend') moveEnd = cb
    }),
    getContainer: () => ({ getBoundingClientRect: () => ({ width: 1280, height: 800 }) }),
    setMinZoom: vi.fn(),
    setMaxZoom: vi.fn(),
    setMaxPitch: vi.fn(),
    setCenterClampedToGround: vi.fn(),
    getCanvas: () => canvas,
  }
  return { map, canvas, finish: () => moveEnd?.() }
}

beforeEach(() => {
  useAppStore.setState({
    mode: 'top',
    locked: false,
    lockRefused: false,
    transitioning: false,
  })
})

it('relaxes the camera caps before easing into free view', () => {
  const { map } = recordingMap()
  const playerRef = { current: { x: 0, y: 0, heading: 0, eyeM: 2, pitchDeg: 0 } }
  const { result } = renderHook(() => useModeTransition(map as never, playerRef))

  act(() => result.current.switchTo('free'))

  expect(map.setMaxZoom).toHaveBeenCalledWith(22)
  expect(map.setMaxPitch).toHaveBeenCalledWith(95)
  expect(map.setCenterClampedToGround).toHaveBeenCalledWith(false)
})

it('restores the top-view caps when switching back', () => {
  const { map } = recordingMap()
  const playerRef = { current: { x: 0, y: 0, heading: 0, eyeM: 25, pitchDeg: -35 } }
  useAppStore.setState({ mode: 'free' })
  const { result } = renderHook(() => useModeTransition(map as never, playerRef))

  act(() => result.current.switchTo('top'))

  expect(map.setMinZoom).toHaveBeenCalledWith(15.5)
  expect(map.setMaxZoom).toHaveBeenCalledWith(19.5)
  expect(map.setMaxPitch).toHaveBeenCalledWith(60)
  expect(map.setCenterClampedToGround).toHaveBeenCalledWith(true)
})

it('seeds the player at the vantage when the free-view ease finishes', async () => {
  const { map, finish } = recordingMap()
  const playerRef: { current: Player } = {
    current: { x: 0, y: 0, heading: 0, eyeM: 2, pitchDeg: 0 },
  }
  const { result } = renderHook(() => useModeTransition(map as never, playerRef))

  act(() => result.current.switchTo('free'))
  await act(async () => {
    finish()
    await Promise.resolve()
  })

  expect(playerRef.current.eyeM).toBe(25)
  expect(playerRef.current.y).toBeCloseTo(-167, 0)
  expect(playerRef.current.heading).toBeCloseTo(Math.PI / 2, 5)
  expect(useAppStore.getState().mode).toBe('free')
})

it('requests pointer lock from the mode click, not from moveend', async () => {
  const { map, canvas, finish } = recordingMap()
  let grant: (() => void) | undefined
  canvas.requestPointerLock.mockImplementation(() => new Promise<void>((resolve) => { grant = resolve }))
  const { result } = renderHook(() => useModeTransition(map as never, { current: {} as Player }))

  act(() => result.current.switchTo('free'))
  expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1)
  expect(useAppStore.getState().locked).toBe(true)

  await act(async () => {
    finish()
    grant?.()
    await Promise.resolve()
  })
  expect(canvas.requestPointerLock).toHaveBeenCalledTimes(1)
  expect(useAppStore.getState().locked).toBe(true)
})

it('falls back to drag-look when pointer lock is refused', async () => {
  const { map, canvas } = recordingMap()
  canvas.requestPointerLock.mockImplementation(() => Promise.reject(new Error('denied')))
  const { result } = renderHook(() => useModeTransition(map as never, { current: {} as Player }))

  act(() => result.current.switchTo('free'))
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })

  expect(useAppStore.getState().locked).toBe(false)
  expect(useAppStore.getState().lockRefused).toBe(true)
})

it('ignores a second switch while a transition is in flight', () => {
  const { map } = recordingMap()
  const { result } = renderHook(() => useModeTransition(map as never, { current: {} as Player }))

  act(() => {
    result.current.switchTo('free')
    result.current.switchTo('top')
  })

  expect(map.once).toHaveBeenCalledTimes(1)
  expect(map.easeTo).toHaveBeenCalledTimes(1)
})

it('eases zoom to the fitted top view without a jump at moveend', () => {
  const { map, finish } = recordingMap()
  useAppStore.setState({ mode: 'free' })
  const { result } = renderHook(() => useModeTransition(map as never, { current: {} as Player }))

  act(() => result.current.switchTo('top'))
  expect(map.easeTo).toHaveBeenCalledWith(
    expect.objectContaining({ zoom: expect.any(Number), pitch: 0, bearing: 0, duration: 1200 }),
  )
  const plan = map.easeTo.mock.calls[0][0] as CameraOptions
  expect(plan.zoom).toBeGreaterThanOrEqual(15.5)
  expect(plan.zoom).toBeLessThanOrEqual(19.5)

  act(() => finish())
  expect(map.jumpTo).not.toHaveBeenCalled()
})
