import { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { Map } from 'maplibre-gl'
import { createMap, webglAvailable } from './createMap'
import { fitCampus } from './options'
import { useTopView } from '../camera/useTopView'
import { useFreeView } from '../camera/useFreeView'
import type { PlayerRef } from '../camera/player'
import { useAppStore } from '../store'
import { LoadingOverlay } from '../ui/LoadingOverlay'
import { ErrorOverlay } from '../ui/ErrorOverlay'

export interface MapCanvasHandle {
  getMap: () => Map | null
}

interface MapCanvasProps {
  onMapLoaded?: (map: Map) => void
  playerRef: PlayerRef
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { onMapLoaded, playerRef },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const onMapLoadedRef = useRef(onMapLoaded)
  onMapLoadedRef.current = onMapLoaded
  const [mapInstance, setMapInstance] = useState<Map | null>(null)
  const [mountKey, setMountKey] = useState(0)

  const setMapStatus = useAppStore((state) => state.setMapStatus)

  useImperativeHandle(ref, () => ({
    getMap: () => mapInstance,
  }))

  useTopView(mapInstance)
  useFreeView(mapInstance, mapInstance ? mapInstance.getCanvas() : null, playerRef)

  const handleRetry = useCallback(() => {
    setMapStatus('loading')
    setMountKey((prev) => prev + 1)
  }, [setMapStatus])

  useEffect(() => {
    if (!containerRef.current) return

    if (!webglAvailable()) {
      setMapStatus('error', 'WebGL is not available in your browser or device.')
      return
    }

    setMapStatus('loading')
    let isCancelled = false
    let currentMap: Map | null = null

    createMap(containerRef.current)
      .then((map) => {
        if (isCancelled) {
          map.remove()
          return
        }
        currentMap = map
        setMapInstance(map)
        onMapLoadedRef.current?.(map)
      })
      .catch((err) => {
        if (!isCancelled) {
          setMapStatus('error', err instanceof Error ? err.message : 'Failed to initialize map.')
        }
      })

    // ResizeObserver: re-fit when mode is top, otherwise just resize
    const resizeObserver = new ResizeObserver(() => {
      if (!currentMap) return
      currentMap.resize()
      if (useAppStore.getState().mode === 'top') {
        fitCampus(currentMap)
      }
    })

    resizeObserver.observe(containerRef.current)

    const onWindowResize = () => {
      if (currentMap) {
        currentMap.resize()
      }
    }
    window.addEventListener('resize', onWindowResize)

    return () => {
      isCancelled = true
      resizeObserver.disconnect()
      window.removeEventListener('resize', onWindowResize)
      if (currentMap) {
        currentMap.remove()
        setMapInstance(null)
      }
    }
  }, [mountKey, setMapStatus])

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        data-testid="map-canvas"
        tabIndex={0}
        aria-label="3D map of SENATI Sede Principal campus"
        className="w-full h-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#5aa9e6]"
      />
      <LoadingOverlay />
      <ErrorOverlay onRetry={handleRetry} />
    </div>
  )
})
