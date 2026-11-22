import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { describePlace } from '../places/describePlace'
import { CATEGORY_BY_ID, type CategoryId } from '../categories'
import placesData from '../data/places.geojson'

export function InfoCard() {
  const selectedId = useAppStore((state) => state.selectedId)
  const select = useAppStore((state) => state.select)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Close on Esc
  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        select(null)
        // Return focus to the map canvas
        const canvas = document.querySelector<HTMLElement>('[data-testid="map-canvas"]')
        canvas?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, select])

  if (!selectedId) return null

  const feature = placesData.features.find((f: any) => f.properties?.id === selectedId)
  if (!feature) return null

  const props = feature.properties as any
  const summary = describePlace(props)
  const categoryId = props?.category as CategoryId | undefined | null
  const categoryDef = categoryId ? CATEGORY_BY_ID[categoryId] : null

  return (
    <div
      role="dialog"
      aria-label={summary.title}
      data-testid="info-card"
      className="absolute bottom-6 left-6 z-30 w-72 rounded-lg bg-[#12151b]/90 border border-white/15 p-4 shadow-xl reduce-blur"
    >
      {/* Header row: category chip + title + close */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {categoryDef && (
            <span
              className="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded mb-1"
              style={{ background: categoryDef.color + '33', color: categoryDef.color, border: `1px solid ${categoryDef.color}66` }}
            >
              {categoryDef.label}
            </span>
          )}
          <h3 className="text-base font-semibold text-white leading-tight truncate">{summary.title}</h3>
          {summary.categoryLabel && (
            <p className="text-xs text-gray-400 mt-0.5">{summary.categoryLabel}</p>
          )}
        </div>
        <button
          ref={closeRef}
          onClick={() => {
            select(null)
            const canvas = document.querySelector<HTMLElement>('[data-testid="map-canvas"]')
            canvas?.focus()
          }}
          className="shrink-0 text-gray-400 hover:text-white p-1 rounded transition-colors text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5aa9e6]"
          aria-label="Close info card"
        >
          ✕
        </button>
      </div>

      {/* Meta tags */}
      {summary.meta.length > 0 && (
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
      )}
    </div>
  )
}
