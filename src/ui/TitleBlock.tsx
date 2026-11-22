import { CAMPUS } from '../map/bounds'
import { THEME } from '../theme'

export function TitleBlock() {
  return (
    <div
      data-testid="title-block"
      className="pointer-events-none absolute top-6 left-6 z-30 select-none"
    >
      <h1 className="text-xl font-bold tracking-tight drop-shadow-md" style={{ color: THEME.text }}>
        {CAMPUS.name}
      </h1>
      <p className="text-sm font-medium drop-shadow" style={{ color: THEME.muted }}>
        {CAMPUS.city}
      </p>
    </div>
  )
}
