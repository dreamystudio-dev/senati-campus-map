import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LegendPanel } from './LegendPanel'
import { PlacePanel } from './PlacePanel'
import { useAppStore } from '../store'

beforeEach(() => {
  useAppStore.setState({ hoveredId: null, hoverPosition: null, hiddenCategories: [] })
})

it('shows the name above the type when a place is hovered', () => {
  useAppStore.getState().setHovered('way/440258367', { x: 100, y: 100 })
  render(<PlacePanel />)
  const panel = screen.getByTestId('place-panel')

  expect(within(panel).getByText('Direccion Zonal Lima Callao')).toBeInTheDocument()
  expect(within(panel).getByText('Education')).toBeInTheDocument()
  expect(within(panel).queryByRole('dialog')).not.toBeInTheDocument()
  expect(within(panel).queryByRole('button')).not.toBeInTheDocument()
})

it('shows nothing when no place is hovered', () => {
  render(<PlacePanel />)
  expect(screen.getByTestId('place-panel').textContent).toBe('')
})

it('sizes the tooltip to its content and centres it', () => {
  useAppStore.getState().setHovered('way/440258367', { x: 100, y: 100 })
  render(<PlacePanel />)
  const panel = screen.getByTestId('place-panel')
  const card = panel.firstElementChild
  expect(panel).toHaveClass('pointer-events-none', 'left-1/2', '-translate-x-1/2')
  expect(card).toHaveClass('w-fit', 'text-center')
  expect(card).not.toHaveClass('pointer-events-auto')
})

it('keeps a long name inside the tooltip', () => {
  useAppStore.getState().setHovered('node/5577057586', { x: 100, y: 100 })
  render(<PlacePanel />)
  const panel = screen.getByTestId('place-panel')
  expect(
    within(panel).getByText('Institución educativa inicial Querubines Del Divina Misericordia'),
  ).toBeInTheDocument()
  expect(panel.firstElementChild).toHaveClass('max-w-[24rem]')
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
