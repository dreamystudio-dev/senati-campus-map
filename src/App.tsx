import { useRef, useState } from 'react'
import type { Map } from 'maplibre-gl'
import { MapCanvas } from './map/MapCanvas'
import { InfoCard } from './ui/InfoCard'
import { Tooltip } from './ui/Tooltip'
import { ModeSwitch } from './ui/ModeSwitch'
import { TitleBlock } from './ui/TitleBlock'
import { ControlsCard } from './ui/ControlsCard'
import { useModeTransition } from './camera/useModeTransition'
import { playerFromVantage, type Player } from './camera/player'
import { FREE_VANTAGE } from './camera/transition'

export default function App() {
  const [map, setMap] = useState<Map | null>(null)
  const playerRef = useRef<Player>(playerFromVantage(FREE_VANTAGE))
  const { switchTo } = useModeTransition(map, playerRef)

  return (
    <div
      data-testid="app-shell"
      className="relative h-dvh overflow-hidden bg-[#12151b] text-white"
    >
      <MapCanvas onMapLoaded={setMap} playerRef={playerRef} />
      <TitleBlock />
      <ModeSwitch onSwitch={switchTo} />
      <ControlsCard />
      <Tooltip />
      <InfoCard />
    </div>
  )
}
