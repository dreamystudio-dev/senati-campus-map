// src/ui/states.test.ts
import { useAppStore } from '../store'

it('starts loading and can move to error', () => {
  useAppStore.setState({ mapStatus: 'loading' })
  useAppStore.getState().setMapStatus('error')
  expect(useAppStore.getState().mapStatus).toBe('error')
})

it('goes ready only once the map is idle', () => {
  useAppStore.setState({ mapStatus: 'loading' })
  useAppStore.getState().setMapStatus('ready')
  expect(useAppStore.getState().mapStatus).toBe('ready')
})
