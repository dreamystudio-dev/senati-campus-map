import { useAppStore } from '../store'
import { describePlace } from '../places/describePlace'
import placesData from '../data/places.geojson'

export function Tooltip() {
  const hoveredId = useAppStore((state) => state.hoveredId)
  const hoverPosition = useAppStore((state) => state.hoverPosition)

  if (!hoveredId || !hoverPosition) {
    return null
  }

  const feature = placesData.features.find((f: any) => f.properties?.id === hoveredId)
  if (!feature) return null

  const summary = describePlace(feature.properties as any)

  return (
    <div
      data-testid="tooltip"
      className="pointer-events-none fixed z-40 transform -translate-x-1/2 -translate-y-full mb-3 px-2.5 py-1.5 rounded bg-[#12151b]/90 border border-white/10 text-xs shadow-lg reduce-blur"
      style={{
        left: `${hoverPosition.x}px`,
        top: `${hoverPosition.y - 10}px`,
      }}
    >
      <div className="font-medium text-white">{summary.title}</div>
      <div className="text-gray-400 text-[11px]">{summary.categoryLabel}</div>
    </div>
  )
}
