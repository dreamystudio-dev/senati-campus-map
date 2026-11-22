import { useEffect, useRef } from 'react'
import { LngLat, type Map } from 'maplibre-gl'
import { useAppStore } from '../store'
import { inputFromKeys, type KeyState } from './input'
import { stepPlayer, turn, eyeAndAhead, type PlayerRef } from './player'

export function useFreeView(
  map: Map | null,
  canvas: HTMLCanvasElement | null,
  playerRef: PlayerRef,
): void {
  const mode = useAppStore((state) => state.mode)
  const locked = useAppStore((state) => state.locked)
  const lockRefused = useAppStore((state) => state.lockRefused)
  const transitioning = useAppStore((state) => state.transitioning)
  const setLocked = useAppStore((state) => state.setLocked)
  const setLockRefused = useAppStore((state) => state.setLockRefused)

  const keysRef = useRef<KeyState>({})
  const lastTimeRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  // Disable standard map handlers while free view or a transition owns the camera
  useEffect(() => {
    if (!map) return

    if (mode === 'free' || transitioning) {
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
  }, [map, mode, transitioning])

  // Track keyboard events. While unlocked (Esc) the camera is frozen and WASD
  // is ignored — the effect cleanup also drops any half-pressed keys.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mode !== 'free' || transitioning || !locked) return
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
  }, [mode, transitioning, locked])

  // Track mouse movement, pointer lock, and drag-to-look fallback
  useEffect(() => {
    if (!canvas) return

    const onPointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvas
      setLocked(isLocked)
    }

    const onPointerLockError = () => {
      setLocked(false)
      setLockRefused(true)
    }

    const onMouseDown = (e: MouseEvent) => {
      if (mode !== 'free' || !lockRefused) return
      if (e.button === 0) {
        isDraggingRef.current = true
      }
    }

    const onMouseUp = () => {
      isDraggingRef.current = false
    }

    const onMouseMove = (e: MouseEvent) => {
      if (mode !== 'free' || transitioning) return

      // Drag-look is the fallback only when the browser refused pointer lock.
      // After Esc the camera stays frozen until the canvas is clicked.
      if (locked || (lockRefused && isDraggingRef.current)) {
        const deltaYawDeg = -e.movementX * 0.12
        const deltaPitchDeg = -e.movementY * 0.12
        playerRef.current = turn(playerRef.current, deltaYawDeg, deltaPitchDeg)
      }
    }

    document.addEventListener('pointerlockchange', onPointerLockChange)
    document.addEventListener('pointerlockerror', onPointerLockError)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('mousemove', onMouseMove)

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      document.removeEventListener('pointerlockerror', onPointerLockError)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [canvas, mode, locked, lockRefused, transitioning, setLocked, setLockRefused])

  // requestAnimationFrame loop — only the locked state owns the camera
  useEffect(() => {
    if (!map || mode !== 'free' || transitioning || !locked) {
      lastTimeRef.current = null
      return
    }

    let animId: number
    let failures = 0

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
        failures = 0
      } catch (error) {
        failures += 1
        if (failures >= 3) {
          console.error('Free-view camera projection failed; stopping the loop.', error)
          return
        }
      }

      animId = requestAnimationFrame(tick)
    }

    animId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animId)
      lastTimeRef.current = null
    }
  }, [map, mode, locked, transitioning])
}
