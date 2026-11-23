// src/store.test.ts
import { useAppStore } from './store'

beforeEach(() =>
  useAppStore.setState({
    mapStatus: 'loading',
    mapError: null,
    hoveredId: null,
    hoverPosition: null,
    hiddenCategories: [],
  }),
)

it('toggles categories and clears transient hover state', () => {
  useAppStore.getState().setHovered('way/1/point', { x: 1, y: 2 })
  useAppStore.getState().toggleCategory('shop')
  expect(useAppStore.getState().hiddenCategories).toEqual(['shop'])
  expect(useAppStore.getState().hoveredId).toBeNull()
  expect(useAppStore.getState().hoverPosition).toBeNull()
  useAppStore.getState().toggleCategory('shop')
  expect(useAppStore.getState().hiddenCategories).toEqual([])
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
