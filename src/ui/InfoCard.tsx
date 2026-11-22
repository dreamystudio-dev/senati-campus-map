import { useAppStore } from '../store'
import { describePlace } from '../places/describePlace'
import placesData from '../data/places.geojson'

export function InfoCard() {
  const selectedId = useAppStore((state) => state.selectedId)
  const select = useAppStore((state) => state.select)

  if (!selectedId) return null

  const feature = placesData.features.find((f: any) => f.properties?.id === selectedId)
  if (!feature) return null

  const summary = describePlace(feature.properties as any)
  const kind = (feature.properties as any)?.kind

  return (
    <div
      data-testid="info-card"
      className="absolute bottom-6 left-6 z-30 w-72 rounded-lg bg-[#12151b]/90 border border-white/15 p-4 shadow-xl backdrop-blur-md"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{summary.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{summary.categoryLabel}</p>
        </div>
        <button
          onClick={() => select(null)}
          className="text-gray-400 hover:text-white p-1 rounded transition-colors text-sm"
          aria-label="Close info card"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {summary.meta.map((item, idx) => (
          <span
            key={idx}
            className="text-[11px] px-2 py-0.5 rounded bg-white/10 text-gray-200 border border-white/5"
          >
            {item}
          </span>
        ))}
      </div>

      {kind && (
        <div className="mt-2 text-[11px] text-gray-500 font-mono">
          {kind}
        </div>
      )}
    </div>
  )
}
