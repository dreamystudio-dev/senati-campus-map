import { useEffect } from 'react'
import type { Map } from 'maplibre-gl'
import { fitCampus } from '../map/options'
import { useAppStore } from '../store'

export function useTopView(map: Map | null): void {
  const mode = useAppStore((state) => state.mode)

  useEffect(() => {
    if (!map) return

    if (mode === 'top') {
      // If map is already idle, fit immediately, otherwise fit on next idle/load
      if (map.isStyleLoaded()) {
        fitCampus(map)
      } else {
        map.once('load', () => {
          fitCampus(map)
        })
      }
    }
  }, [map, mode])
}
