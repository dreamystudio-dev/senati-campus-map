import { create } from 'zustand'

export type MapStatus = 'loading' | 'ready' | 'error'

interface AppState {
  mapStatus: MapStatus
  mapError: string | null
  hoveredId: string | null
  selectedId: string | null
  hoverPosition: { x: number; y: number } | null
  setMapStatus: (status: MapStatus, error?: string | null) => void
  setHovered: (id: string | null, position?: { x: number; y: number } | null) => void
  select: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  mapStatus: 'loading',
  mapError: null,
  hoveredId: null,
  selectedId: null,
  hoverPosition: null,

  setMapStatus: (mapStatus, mapError = null) =>
    set({
      mapStatus,
      mapError: mapStatus === 'error' ? (mapError || 'Map unavailable') : null,
    }),

  setHovered: (id, position = null) =>
    set({
      hoveredId: id,
      hoverPosition: position,
    }),

  select: (id) => set({ selectedId: id }),
}))
