import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoCard } from './InfoCard'
import { useAppStore } from '../store'

beforeEach(() => {
  useAppStore.setState({
    selectedId: null,
    hoveredId: null,
    hoverPosition: null,
  })
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
  expect(canvas).toHaveFocus()

  unmount()
  document.body.removeChild(canvas)
})

it('shows kind once alongside the category chip and measurements', () => {
  useAppStore.getState().select('relation/21864174')
  render(<InfoCard />)
  const card = screen.getByRole('dialog')

  expect(within(card).getByText('building=college')).toBeInTheDocument()
  expect(within(card).getAllByText('Building')).toHaveLength(1)
  expect(within(card).getByText('2 levels')).toBeInTheDocument()
  expect(within(card).getByText('6.4 m')).toBeInTheDocument()
})
