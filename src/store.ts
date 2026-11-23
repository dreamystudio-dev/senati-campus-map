import { create } from 'zustand'
import type { CategoryId } from './categories'

export type MapStatus = 'loading' | 'ready' | 'error'

interface AppState {
  mapStatus: MapStatus
  mapError: string | null
  hoveredId: string | null
  selectedId: string | null
  selectedFootprintId: string | null
  hiddenCategories: CategoryId[]
  hoverPosition: { x: number; y: number } | null
  setMapStatus: (status: MapStatus, error?: string | null) => void
  setHovered: (id: string | null, position?: { x: number; y: number } | null) => void
  select: (id: string | null, footprintId?: string | null) => void
  toggleCategory: (id: CategoryId) => void
}

export const useAppStore = create<AppState>((set) => ({
  mapStatus: 'loading',
  mapError: null,
  hoveredId: null,
  selectedId: null,
  selectedFootprintId: null,
  hiddenCategories: [],
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

  select: (id, footprintId = null) =>
    set({ selectedId: id, selectedFootprintId: footprintId }),

  toggleCategory: (id) =>
    set((state) => ({
      hiddenCategories: state.hiddenCategories.includes(id)
        ? state.hiddenCategories.filter((category) => category !== id)
        : [...state.hiddenCategories, id],
      hoveredId: null,
      hoverPosition: null,
      selectedId: null,
      selectedFootprintId: null,
    })),
}))
