import { render, screen } from '@testing-library/react'
import App from './App'

it('renders a full-viewport, non-scrolling shell', () => {
  render(<App />)
  expect(screen.getByTestId('app-shell')).toHaveClass('h-dvh', 'overflow-hidden')
  expect(screen.queryByRole('group', { name: /camera mode/i })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^free$/i })).not.toBeInTheDocument()
  expect(screen.queryByTestId('controls-card')).not.toBeInTheDocument()
})

it('does not render the SENATI corner title', () => {
  render(<App />)
  expect(screen.queryByText('SENATI · Sede Principal')).not.toBeInTheDocument()
})

it('renders one info panel and one legend panel, and no old overlays', () => {
  render(<App />)
  expect(screen.getByTestId('place-panel')).toBeInTheDocument()
  expect(screen.getByTestId('legend-panel')).toBeInTheDocument()
  expect(screen.queryByTestId('info-card')).not.toBeInTheDocument()
  expect(screen.queryByTestId('tooltip')).not.toBeInTheDocument()
  expect(screen.queryByTestId('title-block')).not.toBeInTheDocument()
})
