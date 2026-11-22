import { render, screen } from '@testing-library/react'
import { ControlsCard } from './ControlsCard'
import { useAppStore } from '../store'

it('uses the shared theme tokens for the panel chrome', () => {
  useAppStore.setState({ mapStatus: 'loading' })
  render(<ControlsCard />)
  const card = screen.getByTestId('controls-card')

  expect(card.style.backgroundColor).toBe('rgba(18, 21, 27, 0.8)')
  expect(card.style.borderColor).toBe('rgb(42, 48, 59)')
})
