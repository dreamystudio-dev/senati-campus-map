import { useState } from 'react'
import type { Map } from 'maplibre-gl'
import { MapCanvas } from './map/MapCanvas'
import { InfoCard } from './ui/InfoCard'
import { Tooltip } from './ui/Tooltip'
import { ModeSwitch } from './ui/ModeSwitch'
import { useModeTransition } from './camera/useModeTransition'

export default function App() {
  const [map, setMap] = useState<Map | null>(null)
  const { switchTo } = useModeTransition(map)

  return (
    <div
      data-testid="app-shell"
      className="relative h-dvh overflow-hidden bg-[#12151b] text-white"
    >
      <MapCanvas onMapLoaded={setMap} />
      <ModeSwitch onSwitch={switchTo} />
      <Tooltip />
      <InfoCard />
    </div>
  )
}
