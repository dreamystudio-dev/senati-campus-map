import { MapCanvas } from './map/MapCanvas'
import { InfoCard } from './ui/InfoCard'
import { Tooltip } from './ui/Tooltip'
import { TitleBlock } from './ui/TitleBlock'
import { ControlsCard } from './ui/ControlsCard'

export default function App() {
  return (
    <div
      data-testid="app-shell"
      className="relative h-dvh overflow-hidden bg-[#12151b] text-white"
    >
      <MapCanvas />
      <TitleBlock />
      <ControlsCard />
      <Tooltip />
      <InfoCard />
    </div>
  )
}
