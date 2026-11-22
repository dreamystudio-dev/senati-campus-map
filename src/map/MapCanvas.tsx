import { useEffect, useRef, useState } from 'react'
import type { Map } from 'maplibre-gl'
import { createMap, webglAvailable } from './createMap'

interface MapCanvasProps {
  onMapLoaded?: (map: Map) => void
}

export function MapCanvas({ onMapLoaded }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (!webglAvailable()) {
      setError('WebGL is not available in your browser or device.')
      return
    }

    let isCancelled = false

    createMap(containerRef.current)
      .then((map) => {
        if (isCancelled) {
          map.remove()
          return
        }
        mapRef.current = map
        onMapLoaded?.(map)
      })
      .catch((err) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize map.')
        }
      })

    return () => {
      isCancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
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
