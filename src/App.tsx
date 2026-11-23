import { MapCanvas } from './map/MapCanvas'
import { LegendPanel } from './ui/LegendPanel'
import { PlacePanel } from './ui/PlacePanel'

export default function App() {
  return (
    <div
      data-testid="app-shell"
      className="relative h-dvh overflow-hidden bg-[#12151b] text-white"
    >
      <MapCanvas />
      <PlacePanel />
      <LegendPanel />
    </div>
  )
}
