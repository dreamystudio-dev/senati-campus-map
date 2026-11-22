import { create } from 'zustand'

export type CameraMode = 'top' | 'free'
export type MapStatus = 'loading' | 'ready' | 'error'

interface AppState {
  mode: CameraMode
  locked: boolean
  lockRefused: boolean
  transitioning: boolean
  mapStatus: MapStatus
  mapError: string | null
  hoveredId: string | null
  selectedId: string | null
  hoverPosition: { x: number; y: number } | null
  setMode: (mode: CameraMode) => void
  setLocked: (locked: boolean) => void
  setLockRefused: (refused: boolean) => void
  setTransitioning: (transitioning: boolean) => void
  setMapStatus: (status: MapStatus, error?: string | null) => void
  setHovered: (id: string | null, position?: { x: number; y: number } | null) => void
  select: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'top',
  locked: false,
  lockRefused: false,
  transitioning: false,
  mapStatus: 'loading',
  mapError: null,
  hoveredId: null,
  selectedId: null,
  hoverPosition: null,

  setMode: (mode) =>
    set((state) => ({
      mode,
      locked: mode === 'free' && state.locked,
      lockRefused: mode === 'free' && state.lockRefused,
      selectedId: null,
      hoveredId: null,
      hoverPosition: null,
    })),

  setLocked: (locked) =>
    set((state) => ({
      locked,
      hoveredId: locked ? null : state.hoveredId,
      hoverPosition: locked ? null : state.hoverPosition,
    })),

  setLockRefused: (lockRefused) => set({ lockRefused }),

  setTransitioning: (transitioning) => set({ transitioning }),

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
