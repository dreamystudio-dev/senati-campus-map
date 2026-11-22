import { MapCanvas } from './map/MapCanvas'

export default function App() {
  return (
    <div
      data-testid="app-shell"
      className="relative h-dvh overflow-hidden bg-[#12151b] text-white"
    >
      <MapCanvas />
    </div>
  )
}
