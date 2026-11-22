import { CAMPUS } from '../map/bounds'

export function TitleBlock() {
  return (
    <div
      data-testid="title-block"
      className="pointer-events-none absolute top-6 left-6 z-30 select-none"
    >
      <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-md">
        {CAMPUS.name}
      </h1>
      <p className="text-sm font-medium text-gray-400 drop-shadow">
        {CAMPUS.city}
      </p>
    </div>
  )
}
