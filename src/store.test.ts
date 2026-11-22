// src/store.test.ts
import { useAppStore } from './store'

beforeEach(() =>
  useAppStore.setState({
    mapStatus: 'loading',
    mapError: null,
    hoveredId: null,
    hoverPosition: null,
    selectedId: null,
  }),
)

it('selects and clears a place', () => {
  useAppStore.getState().select('way/1')
  expect(useAppStore.getState().selectedId).toBe('way/1')
  useAppStore.getState().select(null)
  expect(useAppStore.getState().selectedId).toBeNull()
})

it('stores hover id and screen position', () => {
  useAppStore.getState().setHovered('way/1', { x: 10, y: 20 })
  expect(useAppStore.getState().hoveredId).toBe('way/1')
  expect(useAppStore.getState().hoverPosition).toEqual({ x: 10, y: 20 })
})

it('keeps the error message only while the map is in error', () => {
  useAppStore.getState().setMapStatus('error', 'tiles blocked')
  expect(useAppStore.getState().mapError).toBe('tiles blocked')
  useAppStore.getState().setMapStatus('ready')
  expect(useAppStore.getState().mapError).toBeNull()
})
