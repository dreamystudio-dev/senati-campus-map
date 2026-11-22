import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModeSwitch } from './ModeSwitch'
import { InfoCard } from './InfoCard'
import { useAppStore } from '../store'

it('is operable by keyboard and reports its state', async () => {
  render(<ModeSwitch />)
  const free = screen.getByRole('button', { name: /free/i })
  await userEvent.tab()
  await userEvent.tab()
  expect(free).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(free).toHaveAttribute('aria-pressed', 'true')
})

it('closes InfoCard on Escape and returns focus to map canvas', async () => {
  const canvas = document.createElement('div')
  canvas.setAttribute('data-testid', 'map-canvas')
  canvas.tabIndex = 0
  document.body.appendChild(canvas)

  useAppStore.getState().select('relation/21864174')
  const { unmount } = render(<InfoCard />)

  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(useAppStore.getState().selectedId).toBeNull()

  unmount()
  document.body.removeChild(canvas)
})
