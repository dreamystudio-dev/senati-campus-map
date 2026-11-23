import type { FeatureCollection } from 'geojson'
import { useAppStore } from '../store'
import { HOVER_SOURCE_ID } from './layers'

type SourceWithData = { setData: (data: FeatureCollection) => void }

/** Returns an unsubscribe function so a removed map stops listening. */
export function syncHoverSource(
  map: { getSource: (id: string) => unknown },
  places: FeatureCollection,
): () => void {
  const update = (hoveredId: string | null) => {
    const source = map.getSource(HOVER_SOURCE_ID) as SourceWithData | undefined
    if (!source) return
    const hovered = hoveredId
      ? places.features.find((f) => f.properties?.id === hoveredId)
      : undefined
    const footprintId = hovered?.properties?.footprintId
    const footprint = footprintId
      ? places.features.find((f) => f.properties?.id === footprintId)
      : undefined
    const features: FeatureCollection['features'] = []
    if (hovered) features.push(hovered)
    if (footprint) features.push(footprint)
    source.setData({ type: 'FeatureCollection', features })
  }

  let previous = useAppStore.getState().hoveredId
  return useAppStore.subscribe((state) => {
    if (state.hoveredId === previous) return
    previous = state.hoveredId
    update(previous)
  })
}
