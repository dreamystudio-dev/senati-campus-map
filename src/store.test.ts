// src/store.test.ts
import { useAppStore } from './store'

beforeEach(() => useAppStore.setState({ mode: 'top', locked: false, hoveredId: null, selectedId: null }))

it('locks the pointer when entering free view and unlocks on escape', () => {
  useAppStore.getState().setMode('free')
  expect(useAppStore.getState().locked).toBe(true)
  useAppStore.getState().setLocked(false)
  expect(useAppStore.getState().mode).toBe('free')
  expect(useAppStore.getState().locked).toBe(false)
})

it('clears selection when the mode changes', () => {
  useAppStore.getState().select('way/1')
  useAppStore.getState().setMode('free')
  expect(useAppStore.getState().selectedId).toBeNull()
})
