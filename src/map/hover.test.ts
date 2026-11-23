import type { FeatureCollection } from 'geojson'
import { syncHoverSource } from './hover'
import { HOVER_SOURCE_ID } from './layers'
import { useAppStore } from '../store'

const places: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'node/1',
      geometry: { type: 'Point', coordinates: [-77.06, -12] },
      properties: { id: 'node/1', name: 'Shop' },
    },
  ],
}

function fakeMap() {
  const setData = vi.fn()
  return {
    map: { getSource: () => ({ setData }) } as never,
    setData,
  }
}

beforeEach(() => {
  useAppStore.setState({ hoveredId: null })
})

it('copies the hovered feature into the hover source', () => {
  const { map, setData } = fakeMap()
  const unsubscribe = syncHoverSource(map, places)

  useAppStore.getState().setHovered('node/1')

  expect(setData).toHaveBeenCalledWith({
    type: 'FeatureCollection',
    features: [places.features[0]],
  })
  unsubscribe()
})

it('clears the hover source when the hover ends', () => {
  const { map, setData } = fakeMap()
  const unsubscribe = syncHoverSource(map, places)

  useAppStore.getState().setHovered('node/1')
  setData.mockClear()
  useAppStore.getState().setHovered(null)

  expect(setData).toHaveBeenCalledWith({ type: 'FeatureCollection', features: [] })
  unsubscribe()
})

it('stops syncing after the map is removed', () => {
  const { map, setData } = fakeMap()
  const unsubscribe = syncHoverSource(map, places)
  unsubscribe()

  useAppStore.getState().setHovered('node/1')

  expect(setData).not.toHaveBeenCalled()
  expect(HOVER_SOURCE_ID).toBe('places-hover')
})

it('includes the linked footprint polygon when hovering a dot', () => {
  const withFootprint: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature', id: 'way/1/point',
        geometry: { type: 'Point', coordinates: [-77.06, -12] },
        properties: { id: 'way/1/point', footprintId: 'way/1' },
      },
      {
        type: 'Feature', id: 'way/1',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-77.06, -12], [-77.059, -12], [-77.059, -11.999], [-77.06, -11.999], [-77.06, -12]]],
        },
        properties: { id: 'way/1' },
      },
    ],
  }
  const { map, setData } = fakeMap()
  const unsubscribe = syncHoverSource(map, withFootprint)
  useAppStore.getState().setHovered('way/1/point')
  expect(setData).toHaveBeenCalledWith({
    type: 'FeatureCollection',
    features: [withFootprint.features[0], withFootprint.features[1]],
  })
  unsubscribe()
})
