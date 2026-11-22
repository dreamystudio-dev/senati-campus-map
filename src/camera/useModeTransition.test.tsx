// src/camera/useModeTransition.test.tsx
import { act, renderHook } from '@testing-library/react'
import type { Player } from './player'
import { useAppStore } from '../store'
import { useModeTransition } from './useModeTransition'

function recordingMap() {
  let moveEnd: (() => void) | null = null
  const map = {
    easeTo: () => {},
    once: (event: string, cb: () => void) => {
      if (event === 'moveend') moveEnd = cb
    },
    setMinZoom: () => {},
    setMaxZoom: () => {},
    setMaxPitch: () => {},
    setCenterClampedToGround: () => {},
    getCanvas: () => ({ requestPointerLock: () => undefined }),
  }
  return { map, finish: () => moveEnd?.() }
}

beforeEach(() => {
  useAppStore.setState({ mode: 'top', locked: false, transitioning: false })
})

it('relaxes the camera caps before easing into free view', () => {
  const { map } = recordingMap()
  const playerRef = { current: { x: 0, y: 0, heading: 0, eyeM: 2, pitchDeg: 0 } }
  const { result } = renderHook(() => useModeTransition(map as never, playerRef))
  const calls: string[] = []
  map.setMaxZoom = ((v: number) => calls.push(`zoom:${v}`)) as never
  map.setMaxPitch = ((v: number) => calls.push(`pitch:${v}`)) as never
  map.setCenterClampedToGround = ((v: boolean) => calls.push(`clamp:${v}`)) as never

  act(() => result.current.switchTo('free'))

  expect(calls).toEqual(['zoom:22', 'pitch:95', 'clamp:false'])
})

it('restores the top-view caps when switching back', () => {
  const { map } = recordingMap()
  const playerRef = { current: { x: 0, y: 0, heading: 0, eyeM: 25, pitchDeg: -35 } }
  useAppStore.setState({ mode: 'free' })
  const { result } = renderHook(() => useModeTransition(map as never, playerRef))
  const calls: string[] = []
  map.setMaxZoom = ((v: number) => calls.push(`zoom:${v}`)) as never
  map.setMaxPitch = ((v: number) => calls.push(`pitch:${v}`)) as never
  map.setCenterClampedToGround = ((v: boolean) => calls.push(`clamp:${v}`)) as never

  act(() => result.current.switchTo('top'))

  expect(calls).toEqual(['zoom:19.5', 'pitch:60', 'clamp:true'])
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
