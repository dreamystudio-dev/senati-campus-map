import { useEffect } from 'react'
import { useAppStore } from '../store'
import { describePlace } from '../places/describePlace'
import { CATEGORY_BY_ID, type CategoryId } from '../categories'
import placesData from '../data/places.geojson'

function focusMap() {
  document.querySelector<HTMLElement>('[data-testid="map-canvas"]')?.focus()
}

export function PlacePanel() {
  const selectedId = useAppStore((state) => state.selectedId)
  const hoveredId = useAppStore((state) => state.hoveredId)
  const select = useAppStore((state) => state.select)

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        select(null)
        focusMap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, select])

  const activeId = selectedId ?? hoveredId
  const feature = activeId
    ? placesData.features.find((f: any) => f.properties?.id === activeId)
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
  const chipLabel = categoryDef?.label ?? summary.categoryLabel
  const chipColor = categoryDef?.color ?? '#6b7a8f'
  const expanded = Boolean(selectedId)
  const metaRows = [
    ...(typeof props?.kind === 'string' && props.kind ? [props.kind] : []),
    ...summary.meta.slice(1),
  ]

  return (
    <div
      data-testid="place-panel"
      className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2"
    >
      <div
        role={expanded ? 'dialog' : undefined}
        aria-label={expanded ? summary.title : undefined}
        className="pointer-events-auto w-72 rounded-lg border border-white/15 bg-[#12151b]/90 p-3 shadow-xl reduce-blur"
      >
        <div className="flex items-start gap-2">
          <span
            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: `${chipColor}33`,
              color: chipColor,
              borderColor: `${chipColor}66`,
            }}
          >
            {chipLabel}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold leading-tight text-white">
              {summary.title}
            </div>
          </div>
          {expanded && (
            <button
              type="button"
              aria-label="Close place info"
              onClick={() => {
                select(null)
                focusMap()
              }}
              className="shrink-0 rounded p-1 text-sm text-gray-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5aa9e6]"
            >
              ✕
            </button>
          )}
        </div>
        {expanded && metaRows.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {metaRows.map((item, idx) => (
              <span
                key={idx}
                className="rounded border border-white/5 bg-white/10 px-2 py-0.5 text-[11px] text-gray-200"
              >
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
