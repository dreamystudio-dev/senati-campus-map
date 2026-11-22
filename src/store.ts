import { create } from 'zustand'

export type CameraMode = 'top' | 'free'

interface AppState {
  mode: CameraMode
  locked: boolean
  transitioning: boolean
  hoveredId: string | null
  selectedId: string | null
  hoverPosition: { x: number; y: number } | null
  setMode: (mode: CameraMode) => void
  setLocked: (locked: boolean) => void
  setTransitioning: (transitioning: boolean) => void
  setHovered: (id: string | null, position?: { x: number; y: number } | null) => void
  select: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'top',
  locked: false,
  transitioning: false,
  hoveredId: null,
  selectedId: null,
  hoverPosition: null,

  setMode: (mode) =>
    set({
      mode,
      locked: mode === 'free',
      selectedId: null,
      hoveredId: null,
      hoverPosition: null,
    }),

  setLocked: (locked) =>
    set((state) => ({
      locked,
      hoveredId: locked ? null : state.hoveredId,
      hoverPosition: locked ? null : state.hoverPosition,
    })),

  setTransitioning: (transitioning) => set({ transitioning }),

  setHovered: (id, position = null) =>
    set({
      hoveredId: id,
      hoverPosition: position,
    }),

  select: (id) => set({ selectedId: id }),
}))
