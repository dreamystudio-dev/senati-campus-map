import { render, screen } from '@testing-library/react'
import App from './App'

it('renders a full-viewport, non-scrolling shell', () => {
  render(<App />)
  expect(screen.getByTestId('app-shell')).toHaveClass('h-dvh', 'overflow-hidden')
})
