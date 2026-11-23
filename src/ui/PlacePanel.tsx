import { useAppStore } from '../store'
import { describePlace } from '../places/describePlace'
import { CATEGORY_BY_ID, type CategoryId } from '../categories'
import placesData from '../data/places.geojson'

export function PlacePanel() {
  const hoveredId = useAppStore((state) => state.hoveredId)
  const feature = hoveredId
    ? placesData.features.find((f: any) => f.properties?.id === hoveredId)
    : undefined

  if (!feature) {
    return (
      <div
        data-testid="place-panel"
        className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2"
      />
    )
  }

  const props = feature.properties as any
  const summary = describePlace(props)
  const categoryId = props?.category as CategoryId | undefined | null
  const categoryDef = categoryId ? CATEGORY_BY_ID[categoryId] : null
  const typeLabel = categoryDef?.label ?? summary.categoryLabel
  const typeColor = categoryDef?.color ?? '#6b7a8f'

  return (
    <div
      data-testid="place-panel"
      className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2"
    >
      <div className="w-fit min-w-[10rem] max-w-[24rem] rounded-lg border border-white/15 bg-[#12151b]/90 px-4 py-2.5 text-center shadow-xl reduce-blur">
        {summary.title && (
          <div className="text-base font-semibold leading-tight text-white">{summary.title}</div>
        )}
        {typeLabel && (
          <div className="mt-0.5 text-xs font-medium" style={{ color: typeColor }}>
            {typeLabel}
          </div>
        )}
      </div>
    </div>
  )
}
