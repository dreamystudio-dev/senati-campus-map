import { create } from 'zustand'

export type CameraMode = 'top' | 'free'

interface AppState {
  mode: CameraMode
  locked: boolean
  hoveredId: string | null
  selectedId: string | null
  hoverPosition: { x: number; y: number } | null
  setMode: (mode: CameraMode) => void
  setLocked: (locked: boolean) => void
  setHovered: (id: string | null, position?: { x: number; y: number } | null) => void
  select: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'top',
  locked: false,
  hoveredId: null,
  selectedId: null,
  hoverPosition: null,

  setMode: (mode) =>
    set({
      mode,
      locked: mode === 'free',
      selectedId: null,
      hoveredId: null,
    }),

  setLocked: (locked) =>
    set(
      locked
        ? { locked, hoveredId: null, hoverPosition: null }
        : { locked },
    ),

  setHovered: (id, position = null) =>
    set({
      hoveredId: id,
      hoverPosition: position,
    }),

  select: (id) => set({ selectedId: id }),
}))
