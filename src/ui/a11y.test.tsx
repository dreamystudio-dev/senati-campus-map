import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LegendPanel } from './LegendPanel'
import { PlacePanel } from './PlacePanel'
import { useAppStore } from '../store'

beforeEach(() => {
  useAppStore.setState({
    selectedId: null,
    selectedFootprintId: null,
    hoveredId: null,
    hoverPosition: null,
    hiddenCategories: [],
  })
})

it('closes PlacePanel on Escape and returns focus to map canvas', async () => {
  const canvas = document.createElement('div')
  canvas.setAttribute('data-testid', 'map-canvas')
  canvas.tabIndex = 0
  document.body.appendChild(canvas)

  useAppStore.getState().select('way/440258367')
  const { unmount } = render(<PlacePanel />)

  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(useAppStore.getState().selectedId).toBeNull()
  expect(canvas).toHaveFocus()

  unmount()
  document.body.removeChild(canvas)
})

it('shows kind once alongside the category chip and measurements', () => {
  useAppStore.getState().select('way/440258367')
  render(<PlacePanel />)
  const card = screen.getByRole('dialog')

  expect(within(card).getByText('office=educational_institution')).toBeInTheDocument()
  expect(within(card).getAllByText('Education')).toHaveLength(1)
  expect(within(card).getByText('2 levels')).toBeInTheDocument()
  expect(within(card).getByText('6.4 m')).toBeInTheDocument()
})

it('shows a compact hover summary without opening a dialog', () => {
  useAppStore.getState().setHovered('way/440258367', { x: 100, y: 100 })
  render(<PlacePanel />)
  const panel = screen.getByTestId('place-panel')

  expect(within(panel).queryByRole('dialog')).not.toBeInTheDocument()
  expect(within(panel).getByText('Direccion Zonal Lima Callao')).toBeInTheDocument()
  expect(within(panel).getByText('Education')).toBeInTheDocument()
  expect(within(panel).queryByText('office=educational_institution')).not.toBeInTheDocument()
})

it('toggles category visibility from the legend', async () => {
  render(<LegendPanel />)
  const shop = screen.getByRole('button', { name: 'Shop' })

  expect(shop).toHaveAttribute('aria-pressed', 'true')
  await userEvent.click(shop)
  expect(useAppStore.getState().hiddenCategories).toEqual(['shop'])
  expect(shop).toHaveAttribute('aria-pressed', 'false')

  await userEvent.click(shop)
  expect(useAppStore.getState().hiddenCategories).toEqual([])
  expect(shop).toHaveAttribute('aria-pressed', 'true')
})
