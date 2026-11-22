import { useEffect, useRef } from 'react'
import { LngLat, type Map } from 'maplibre-gl'
import { useAppStore } from '../store'
import { inputFromKeys, type KeyState } from './input'
import { stepPlayer, turn, eyeAndAhead, type Player } from './player'

export function useFreeView(map: Map | null, canvas: HTMLCanvasElement | null): void {
  const mode = useAppStore((state) => state.mode)
  const locked = useAppStore((state) => state.locked)
  const setLocked = useAppStore((state) => state.setLocked)

  const playerRef = useRef<Player>({
    x: 0,
    y: 0,
    heading: 0,
    eyeM: 25,
    pitchDeg: 0,
  })

  const keysRef = useRef<KeyState>({})
  const lastTimeRef = useRef<number | null>(null)

  // Disable standard map handlers while free view is active
  useEffect(() => {
    if (!map) return

    if (mode === 'free') {
      map.dragPan.disable()
      map.dragRotate.disable()
      map.scrollZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoomRotate.disable()
    } else {
      map.dragPan.enable()
      map.dragRotate.enable()
      map.scrollZoom.enable()
      map.doubleClickZoom.enable()
      map.touchZoomRotate.enable()
    }
  }, [map, mode])

  // Track keyboard events
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'free') return
      keysRef.current[e.code] = true
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (mode !== 'free') return
      keysRef.current[e.code] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      keysRef.current = {}
    }
  }, [mode])

  // Track mouse movement and pointer lock
  useEffect(() => {
    if (!canvas) return

    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas
      setLocked(isLocked)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (mode !== 'free' || !useAppStore.getState().locked) return
      const deltaYawDeg = -e.movementX * 0.12
      const deltaPitchDeg = -e.movementY * 0.12

      playerRef.current = turn(playerRef.current, deltaYawDeg, deltaPitchDeg)
    }

    document.addEventListener('pointerlockchange', onPointerLockChange)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [canvas, mode, setLocked])

  // requestAnimationFrame loop
  useEffect(() => {
    if (!map || mode !== 'free' || !locked) {
      lastTimeRef.current = null
      return
    }

    let animId: number

    const tick = (time: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = time
      }
      const rawDt = (time - lastTimeRef.current) / 1000
      lastTimeRef.current = time
      const dt = Math.min(0.05, Math.max(0.001, rawDt))

      const input = inputFromKeys(keysRef.current)
      playerRef.current = stepPlayer(playerRef.current, input, dt)

      const { eye, ahead, aheadAltitudeM } = eyeAndAhead(playerRef.current, 20)

      try {
        const eyeLngLat = new LngLat(eye[0], eye[1])
        const aheadLngLat = new LngLat(ahead[0], ahead[1])
        const camOpts = map.calculateCameraOptionsFromTo(
          eyeLngLat,
          playerRef.current.eyeM,
          aheadLngLat,
          aheadAltitudeM,
        )
        map.jumpTo(camOpts)
      } catch {
        // MapLibre safety check
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animId)
      lastTimeRef.current = null
    }
  }, [map, mode, locked])
}
