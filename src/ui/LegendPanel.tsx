import { CATEGORIES } from '../categories'
import { useAppStore } from '../store'

export function LegendPanel() {
  const hiddenCategories = useAppStore((state) => state.hiddenCategories)
  const toggleCategory = useAppStore((state) => state.toggleCategory)

  return (
    <div
      data-testid="legend-panel"
      className="pointer-events-auto fixed bottom-4 left-4 z-30 rounded-lg border border-white/15 bg-[#12151b]/90 p-3 shadow-xl reduce-blur"
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        Places
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {CATEGORIES.map((category) => {
          const visible = !hiddenCategories.includes(category.id)
          return (
            <div key={category.id} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                style={{ backgroundColor: category.color }}
              />
              <button
                type="button"
                data-testid={`legend-toggle-${category.id}`}
                aria-pressed={visible}
                onClick={() => toggleCategory(category.id)}
                className={`rounded px-1 py-0.5 text-left text-[11px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5aa9e6] ${
                  visible ? 'text-white' : 'text-gray-500 line-through'
                }`}
              >
                {category.label}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
