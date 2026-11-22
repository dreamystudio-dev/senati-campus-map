import { useEffect, useRef, useState } from 'react'
import type { Map } from 'maplibre-gl'
import { createMap, webglAvailable } from './createMap'
import { fitCampus } from './options'
import { useTopView } from '../camera/useTopView'
import { useAppStore } from '../store'

interface MapCanvasProps {
  onMapLoaded?: (map: Map) => void
}

export function MapCanvas({ onMapLoaded }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<Map | null>(null)
  const [error, setError] = useState<string | null>(null)

  useTopView(mapInstance)

  useEffect(() => {
    if (!containerRef.current) return

    if (!webglAvailable()) {
      setError('WebGL is not available in your browser or device.')
      return
    }

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
        onMapLoaded?.(map)
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize map.')
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
  }, [onMapLoaded])

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} data-testid="map" className="w-full h-full" />
      {error && (
        <div
          data-testid="map-error"
          className="absolute inset-0 z-50 flex items-center justify-center bg-[#12151b]/90 text-white p-6"
        >
          <div className="p-4 rounded bg-[#1f242e] border border-red-500/40 text-center max-w-md">
            <h2 className="text-lg font-semibold text-red-400 mb-2">Map Error</h2>
            <p className="text-sm text-gray-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
