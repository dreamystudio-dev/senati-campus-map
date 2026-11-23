# Hover-only Place Tooltip and Category Trim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim the place category table to eleven categories, drop places that would only be labelled `Unnamed …`, and replace the click-to-open place panel with a hover-only, content-sized tooltip that also reveals the footprint.

**Architecture:** The fetch transform stays the single source of truth: it drops removed categories and any feature with no name and no generic label, then the committed GeoJSON is regenerated. On the map, `syncHoverSource` adds a hovered dot's linked footprint polygon to the existing hover source, so the current 35 % hover fill and thin outline reveal it; click selection, its dialog, and the base polygon-reveal layers are deleted.

**Tech Stack:** Vite 6 · React 19 · TypeScript 5.7 · Tailwind CSS 4 · MapLibre GL JS 5 · Zustand 5 · Vitest 3.

**Spec:** `docs/superpowers/specs/2026-11-23-hover-only-tooltip-and-category-trim-design.md`

## Global Constraints

- Desktop only; the page never scrolls; root stays `h-dvh overflow-hidden`.
- Static Vercel deployment; `src/data/places.geojson` stays committed; no API keys, env vars, server functions or runtime Overpass.
- Eleven categories exactly: education, food, market, shop, park, sport, worship, finance, health, community, entertainment.
- Fixed palette; no user text input; OSM proper names unchanged.
- Hover fill stays `0.35`; footprint reveal uses the existing hover source.
- Tooltip: name `text-base` semibold, type `text-xs` in the category colour, both centred, `w-fit`, `min-w-[10rem]`, `max-w-[24rem]`, `px-4 py-2.5`.
- Camera, centre `[-77.0604, -11.999]`, zoom 12–19.5, pitch 0–60°, rotation 0.4°/px, legend behaviour and 2× frame are unchanged.
- Gate before done: `pnpm typecheck && pnpm test && pnpm build`, plus a `playwright cli` browser check at 1280×800, 1440×900 and 1920×1080 (Task 3).

## Review Focus

1. **A very long place name** — the tooltip wraps inside `max-w-[24rem]`, stays centred and never overflows the viewport. Tested in Task 2's a11y test (classes + long name) and the browser check.
2. **A very short place name** — the tooltip shrinks with `w-fit` instead of leaving a fixed empty box. Tested in Task 2's a11y class assertion.
3. **A point-only place with no footprint** — hovering shows the tooltip and adds no polygon. Tested in Task 2's `hover.test.ts` point-only case.
4. **Toggling a category while a place is hovered** — the tooltip and footprint disappear immediately. Tested in Task 2's store test and the browser check.
5. **Unnamed areas vs unnamed buildings/points** — an unnamed park/pitch area survives with `Park`/`Pitch`; an unnamed shop building or point is dropped. Tested in Task 1's `fetch-places.test.ts`.

---

### Task 1: Trim the category table and drop `Unnamed …` places

**Files:**
- Modify: `src/categories.ts`
- Modify: `src/categories.test.ts`
- Modify: `scripts/fetch-places.ts`
- Modify: `scripts/fetch-places.test.ts`
- Modify: `src/places/describePlace.ts`
- Modify: `src/places/describePlace.test.ts`
- Regenerate: `src/data/places.geojson`

**Interfaces:**
- Consumes: nothing new.
- Produces: `CategoryId` without `'fuel' | 'art' | 'parking' | 'construction' | 'transit' | 'facilities'`; `CATEGORIES` with 11 entries; `transformOverpass` drops any feature with no `name` and no `genericLabel`; `describePlace` returns `title: ''` instead of `Unnamed <category>`.

- [ ] **Step 1: Rewrite the category tests for eleven categories**

Replace `src/categories.test.ts` with:

```ts
// src/categories.test.ts
import { readFileSync } from 'node:fs'
import { CATEGORIES, CATEGORY_BY_ID, resolveCategory } from './categories'

it('has the eleven remaining categories', () => {
  expect(CATEGORIES).toHaveLength(11)
  expect(Object.keys(CATEGORY_BY_ID)).toHaveLength(11)
  expect(CATEGORIES.map((c) => c.id).sort()).toEqual([
    'community', 'education', 'entertainment', 'finance', 'food',
    'health', 'market', 'park', 'shop', 'sport', 'worship',
  ])
})

it('draws education areas as a faint outline, not a solid fill', () => {
  expect(CATEGORY_BY_ID.education.style).toBe('outline')
})

it.each([
  [{ amenity: 'marketplace' }, 'market'],
  [{ shop: 'car_parts' }, 'shop'],
  [{ leisure: 'park' }, 'park'],
  [{ amenity: 'cafe' }, 'food'],
  [{ amenity: 'college' }, 'education'],
  [{ office: 'educational_institution' }, 'education'],
])('resolves %o to %s', (tags, id) => {
  expect(resolveCategory(tags)?.id).toBe(id)
})

it('drops the six removed categories', () => {
  for (const tags of [
    { amenity: 'fuel' },
    { amenity: 'parking' },
    { amenity: 'bus_station' },
    { public_transport: 'station' },
    { amenity: 'toilets' },
    { amenity: 'charging_station' },
    { amenity: 'fountain' },
    { tourism: 'artwork' },
    { landuse: 'construction' },
    { landuse: 'brownfield' },
  ]) {
    expect(resolveCategory(tags), JSON.stringify(tags)).toBeNull()
  }
})

it('gives areas English generic labels and buildings none', () => {
  expect(CATEGORY_BY_ID.park.genericLabel).toBe('Park')
  expect(CATEGORY_BY_ID.sport.genericLabel).toBe('Pitch')
  expect(CATEGORY_BY_ID.shop.genericLabel).toBeUndefined()
})

it('matches visitable place tags that remain', () => {
  const expected: Array<[Record<string, string>, string]> = [
    [{ amenity: 'pharmacy' }, 'health'],
    [{ amenity: 'veterinary' }, 'health'],
    [{ amenity: 'post_office' }, 'community'],
    [{ amenity: 'courthouse' }, 'community'],
    [{ tourism: 'information' }, 'community'],
    [{ tourism: 'theme_park' }, 'entertainment'],
    [{ leisure: 'dance' }, 'entertainment'],
    [{ amenity: 'nightclub' }, 'entertainment'],
    [{ amenity: 'ice_cream' }, 'food'],
    [{ amenity: 'food_court' }, 'food'],
    [{ leisure: 'recreation_ground' }, 'sport'],
    [{ amenity: 'prep_school' }, 'education'],
  ]
  for (const [tags, id] of expected) {
    expect(resolveCategory(tags)?.id, JSON.stringify(tags)).toBe(id)
  }
})

it('still drops street furniture and non-place land use', () => {
  const cases: Record<string, string>[] = [
    { amenity: 'waste_basket' },
    { amenity: 'recycling' },
    { amenity: 'parking_entrance' },
    { landuse: 'grass' },
    { landuse: 'industrial' },
    { landuse: 'residential' },
    { landuse: 'garages' },
    { landuse: 'greenfield' },
  ]
  for (const tags of cases) {
    expect(resolveCategory(tags), JSON.stringify(tags)).toBeNull()
  }
})

it('assigns fixed-palette colours to all eleven categories', () => {
  const palette = new Set([
    '#5aa9e6', '#ef6f6c', '#f2b134', '#9b7ede', '#8bc34a',
    '#2ec4b6', '#e56b9f', '#e8e2d6', '#f08a3c', '#6b7a8f',
  ])
  for (const category of CATEGORIES) expect(palette.has(category.color)).toBe(true)
})

it('keeps only English generic labels in the committed places data', () => {
  const places = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { genericLabel?: string } }>
  }
  const labels = places.features
    .map((feature) => feature.properties.genericLabel)
    .filter((label): label is string => Boolean(label))
  const allowed = new Set(['Park', 'Pitch'])
  expect(labels.length).toBeGreaterThan(0)
  for (const label of labels) expect(allowed.has(label)).toBe(true)
})
```

- [ ] **Step 2: Add fetch and title tests**

In `scripts/fetch-places.test.ts`, add:

```ts
it('drops places with neither a name nor a generic label', () => {
  const response = {
    version: 0.6,
    generator: 'Overpass API',
    elements: [
      { type: 'node', id: 1, lat: -11.999, lon: -77.06, tags: { shop: 'convenience' } },
      {
        type: 'way', id: 2, tags: { building: 'yes', shop: 'clothes' },
        geometry: [
          { lat: -11.999, lon: -77.06 }, { lat: -11.999, lon: -77.059 },
          { lat: -11.998, lon: -77.059 }, { lat: -11.998, lon: -77.06 },
          { lat: -11.999, lon: -77.06 },
        ],
      },
      {
        type: 'way', id: 3, tags: { leisure: 'park' },
        geometry: [
          { lat: -11.997, lon: -77.062 }, { lat: -11.997, lon: -77.061 },
          { lat: -11.996, lon: -77.061 }, { lat: -11.996, lon: -77.062 },
          { lat: -11.997, lon: -77.062 },
        ],
      },
    ],
  }
  const fc = transformOverpass(response as never)
  const ids = fc.features.map((f) => f.properties.id)
  expect(ids).not.toContain('node/1')
  expect(ids).not.toContain('way/2')
  expect(ids).not.toContain('way/2/point')
  expect(ids).toContain('way/3')
  expect(ids).toContain('way/3/point')
  expect(fc.features.find((f) => f.properties.id === 'way/3')?.properties.genericLabel).toBe('Park')
})

it('commits no place without a name or generic label', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { name?: string; genericLabel?: string } }>
  }
  expect(data.features.some((f) => !f.properties.name && !f.properties.genericLabel)).toBe(false)
})
```

Update `commits place dots linked to polygon footprints` to `expect(dots.length).toBeGreaterThan(80)`.

Replace `keeps the original sixteen POI dots among the restored nearby nodes` with the twelve named survivors (four originals were art or unnamed and are intentionally dropped):

```ts
it('keeps the named POI dots from the original sixteen', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { id: string; geometryType?: string; footprintId?: string } }>
  }
  const ids = data.features
    .filter((f) => f.properties.geometryType === 'point' && !f.properties.footprintId)
    .map((f) => f.properties.id)

  expect(ids).toEqual(expect.arrayContaining([
    'node/1863374473', 'node/4379685965', 'node/4379685966', 'node/4379812240',
    'node/4379812275', 'node/4379812276', 'node/5577057586', 'node/5577057587',
    'node/5577057588', 'node/5577057589', 'node/5577057590', 'node/5577057591',
  ]))
  expect(ids.length).toBeGreaterThan(12)
})
```

In `src/places/describePlace.test.ts`, replace `never returns a blank title for an unnamed building` with:

```ts
it('never invents an Unnamed title', () => {
  const p = { ...base, category: 'shop', geometryType: 'building' } as const
  expect(describePlace({ ...p }).title).toBe('')
  expect(JSON.stringify(describePlace({ ...p }))).not.toContain('Unnamed')
})
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm test src/categories.test.ts scripts/fetch-places.test.ts src/places/describePlace.test.ts`
Expected: FAIL — 17 categories, removed tags still resolve, unnamed features still present, `Unnamed shop` still returned.

- [ ] **Step 4: Remove the six categories from `src/categories.ts`**

Delete `'fuel' | 'art' | 'parking' | 'construction' | 'transit' | 'facilities'` from `CategoryId` and delete those six objects from `CATEGORIES`. Keep the existing order of the remaining eleven. The `parking` and `construction` `genericLabel` fields disappear with their objects; `park` keeps `Park` and `sport` keeps `Pitch`.

- [ ] **Step 5: Drop nameless places and stop inventing titles**

In `scripts/fetch-places.ts`, after the `props.genericLabel` assignment and before `features.push(...)`, add:

```ts
if (!props.name && !props.genericLabel) continue
```

In `src/places/describePlace.ts`, replace the title fallback block with:

```ts
let title = p.name ?? ''
if (!title && cat?.genericLabel) {
  title = cat.genericLabel
}
```

- [ ] **Step 6: Run the title test to verify it passes**

Run: `pnpm test src/places/describePlace.test.ts`
Expected: PASS. The category and fetch tests still fail on committed-data assertions until Step 7 regenerates the GeoJSON.

- [ ] **Step 7: Regenerate the committed data**

Run: `pnpm data`
Expected: Overpass returns and `src/data/places.geojson` is rewritten. Confirm it now has roughly 490 features, no removed categories, no `Unnamed …` candidates, and 115-ish linked dots. If Overpass is unreachable, stop and report; do not hand-edit the GeoJSON.

- [ ] **Step 8: Run the data tests to verify they pass**

Run: `pnpm test scripts/fetch-places.test.ts src/categories.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/categories.ts src/categories.test.ts scripts/fetch-places.ts scripts/fetch-places.test.ts src/places/describePlace.ts src/places/describePlace.test.ts src/data/places.geojson
git commit -m "feat(data): trim categories and drop unnamed places"
```

---

### Task 2: Make the place tooltip hover-only and reveal footprints on hover

**Files:**
- Modify: `src/store.ts`
- Modify: `src/store.test.ts`
- Modify: `src/map/hover.ts`
- Modify: `src/map/hover.test.ts`
- Modify: `src/map/layers.ts`
- Modify: `src/map/layers.test.ts`
- Modify: `src/map/createMap.ts`
- Modify: `tsconfig.json`
- Modify: `src/ui/PlacePanel.tsx`
- Modify: `src/ui/a11y.test.tsx`

**Interfaces:**
- Consumes: Task 1's eleven-category table and name/generic-label guarantee.
- Produces: `useAppStore` without `selectedId`, `selectedFootprintId` or `select`; `syncHoverSource` emits `[hovered, footprint]`; `layerFilters(hiddenCategories: CategoryId[])`; `applyLayerFilters(map, hiddenCategories)`; `PlacePanel` renders only the hover tooltip.

- [ ] **Step 1: Rewrite the store tests**

Replace `src/store.test.ts` with:

```ts
// src/store.test.ts
import { useAppStore } from './store'

beforeEach(() =>
  useAppStore.setState({
    mapStatus: 'loading',
    mapError: null,
    hoveredId: null,
    hoverPosition: null,
    hiddenCategories: [],
  }),
)

it('toggles categories and clears transient hover state', () => {
  useAppStore.getState().setHovered('way/1/point', { x: 1, y: 2 })
  useAppStore.getState().toggleCategory('shop')
  expect(useAppStore.getState().hiddenCategories).toEqual(['shop'])
  expect(useAppStore.getState().hoveredId).toBeNull()
  expect(useAppStore.getState().hoverPosition).toBeNull()
  useAppStore.getState().toggleCategory('shop')
  expect(useAppStore.getState().hiddenCategories).toEqual([])
})

it('stores hover id and screen position', () => {
  useAppStore.getState().setHovered('way/1', { x: 10, y: 20 })
  expect(useAppStore.getState().hoveredId).toBe('way/1')
  expect(useAppStore.getState().hoverPosition).toEqual({ x: 10, y: 20 })
})

it('keeps the error message only while the map is in error', () => {
  useAppStore.getState().setMapStatus('error', 'tiles blocked')
  expect(useAppStore.getState().mapError).toBe('tiles blocked')
  useAppStore.getState().setMapStatus('ready')
  expect(useAppStore.getState().mapError).toBeNull()
})
```

- [ ] **Step 2: Add the hover-source footprint test**

In `src/map/hover.test.ts`, add:

```ts
it('includes the linked footprint polygon when hovering a dot', () => {
  const withFootprint: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature', id: 'way/1/point',
        geometry: { type: 'Point', coordinates: [-77.06, -12] },
        properties: { id: 'way/1/point', footprintId: 'way/1' },
      },
      {
        type: 'Feature', id: 'way/1',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-77.06, -12], [-77.059, -12], [-77.059, -11.999], [-77.06, -11.999], [-77.06, -12]]],
        },
        properties: { id: 'way/1' },
      },
    ],
  }
  const { map, setData } = fakeMap()
  const unsubscribe = syncHoverSource(map, withFootprint)
  useAppStore.getState().setHovered('way/1/point')
  expect(setData).toHaveBeenCalledWith({
    type: 'FeatureCollection',
    features: [withFootprint.features[0], withFootprint.features[1]],
  })
  unsubscribe()
})
```

- [ ] **Step 3: Rewrite the layer tests for the reduced layer set**

Replace `src/map/layers.test.ts` with:

```ts
// src/map/layers.test.ts
import { featureFilter } from '@maplibre/maplibre-gl-style-spec'
import { vi } from 'vitest'
import { CATEGORIES } from '../categories'
import {
  applyLayerFilters,
  BASEMAP_FONT,
  categoryColorExpression,
  INTERACTIVE_LAYER_IDS,
  layerFilters,
  placesLayers,
} from './layers'

const LAYER_IDS = [
  'places-points',
  'places-hover-fill',
  'places-hover-line',
  'places-hover-point',
  'places-labels',
]

it('produces a dot layer, hover layers and labels', () => {
  expect(placesLayers().map((l) => l.id)).toEqual(LAYER_IDS)
})

it('maps every category colour into the expression', () => {
  const flat = JSON.stringify(categoryColorExpression())
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
})

it('renders no filled volume', () => {
  expect(placesLayers().some((l) => l.type === 'fill-extrusion')).toBe(false)
})

it('excludes category-less features from every layer', () => {
  const globals = { zoom: 15 }
  const feature = {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [0, 0] },
    properties: { id: 'way/1', geometryType: 'point', category: null, name: 'Context', genericLabel: 'Context' },
  } as never

  for (const [id, filter] of Object.entries(layerFilters([]))) {
    expect(featureFilter(filter).filter(globals, feature), id).toBe(false)
  }
})

it('hides a category from points and labels when toggled off', () => {
  const filters = layerFilters(['shop'])
  const pointFilter = featureFilter(filters['places-points'])
  const labelFilter = featureFilter(filters['places-labels'])
  const globals = { zoom: 15 }
  const feature = (category: string) =>
    ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties: { geometryType: 'point', category, name: 'X' } }) as never

  expect(pointFilter.filter(globals, feature('shop'))).toBe(false)
  expect(pointFilter.filter(globals, feature('food'))).toBe(true)
  expect(labelFilter.filter(globals, feature('shop'))).toBe(false)
  expect(labelFilter.filter(globals, feature('food'))).toBe(true)
})

it('hides a category from hover highlights when toggled off', () => {
  const filters = layerFilters(['shop'])
  const globals = { zoom: 15 }
  const feature = (category: string) =>
    ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties: { geometryType: 'point', category } }) as never

  for (const id of ['places-hover-fill', 'places-hover-line', 'places-hover-point']) {
    const filter = featureFilter(filters[id])
    expect(filter.filter(globals, feature('shop')), id).toBe(false)
    expect(filter.filter(globals, feature('food')), id).toBe(true)
  }
})

it('pushes the derived filters to every map layer', () => {
  const setFilter = vi.fn()
  applyLayerFilters({ setFilter } as never, ['shop'])
  const filters = layerFilters(['shop'])

  expect(setFilter).toHaveBeenCalledTimes(LAYER_IDS.length)
  for (const id of LAYER_IDS) expect(setFilter).toHaveBeenCalledWith(id, filters[id])
})

it('does not label named context buildings', () => {
  const labelFilter = featureFilter(layerFilters([])['places-labels'])
  const globals = { zoom: 15 }
  const feature = (properties: Record<string, unknown>) =>
    ({ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties }) as never

  expect(labelFilter.filter(globals, feature({ geometryType: 'building', category: null, name: 'Anfiteatro' }))).toBe(false)
  expect(labelFilter.filter(globals, feature({ geometryType: 'building', category: 'education', name: 'Comedor' }))).toBe(true)
  expect(labelFilter.filter(globals, feature({ geometryType: 'area', category: 'park', genericLabel: 'Park' }))).toBe(true)
})

it('labels named features and unnamed areas with the basemap font', () => {
  const labels = placesLayers().find((l) => l.id === 'places-labels') as never as {
    filter: unknown
    layout: { 'text-field': unknown; 'text-font': unknown }
  }
  const text = JSON.stringify(labels.layout['text-field'])
  expect(text).toContain('name')
  expect(text).toContain('genericLabel')
  expect(JSON.stringify(labels.filter)).toContain('genericLabel')
  expect(labels.layout['text-font']).toEqual(BASEMAP_FONT)
})

it('adds a hover highlight above the place layers', () => {
  const ids = placesLayers().map((l) => l.id)
  expect(ids).toContain('places-hover-fill')
  expect(ids).toContain('places-hover-line')
})

it('pins each hover layer to the category palette and the fill to 35% opacity', () => {
  const paintOf = (id: string) =>
    (placesLayers().find((l) => l.id === id) as never as { paint: Record<string, unknown> }).paint

  for (const id of ['places-hover-fill', 'places-hover-line', 'places-hover-point']) {
    const paint = JSON.stringify(paintOf(id))
    for (const category of CATEGORIES) expect(paint).toContain(category.color)
    expect(paint).not.toMatch(/#fff(?:ffff)?\b/i)
  }
  expect(paintOf('places-hover-fill')['fill-opacity']).toBe(0.35)
})

it('highlights hovered points with a circle layer', () => {
  const layer = placesLayers().find((l) => l.id === 'places-hover-point')
  expect(layer?.type).toBe('circle')
  expect(JSON.stringify((layer as { filter?: unknown }).filter)).toContain('point')
})

it('only lets dots answer hover', () => {
  expect(INTERACTIVE_LAYER_IDS).toEqual(['places-points'])
})
```

- [ ] **Step 4: Rewrite the a11y tests for the hover-only tooltip**

Replace `src/ui/a11y.test.tsx` with:

```tsx
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
  const card = screen.getByTestId('place-panel').firstElementChild
  expect(card).toHaveClass('w-fit', 'text-center')
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
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `pnpm test src/store.test.ts src/map/hover.test.ts src/map/layers.test.ts src/ui/a11y.test.tsx`
Expected: FAIL — selection APIs still exist, hover source returns one feature, nine layers exist, the panel still opens a dialog.

- [ ] **Step 6: Simplify the store**

In `src/store.ts`, remove `selectedId`, `selectedFootprintId` and `select`. Keep `hoveredId`, `hoverPosition`, `hiddenCategories`, `setHovered`, `setMapStatus` and `toggleCategory`. `toggleCategory` keeps clearing `hoveredId` and `hoverPosition` but no longer clears selection.

- [ ] **Step 7: Add the footprint to the hover source**

In `src/map/hover.ts`, change `update` to find the hovered feature, then its `footprintId` feature, and emit both:

```ts
const update = (hoveredId: string | null) => {
  const source = map.getSource(HOVER_SOURCE_ID) as SourceWithData | undefined
  if (!source) return
  const hovered = hoveredId
    ? places.features.find((f) => f.properties?.id === hoveredId)
    : undefined
  const footprintId = hovered?.properties?.footprintId
  const footprint = footprintId
    ? places.features.find((f) => f.properties?.id === footprintId)
    : undefined
  const features: FeatureCollection['features'] = []
  if (hovered) features.push(hovered)
  if (footprint) features.push(footprint)
  source.setData({ type: 'FeatureCollection', features })
}
```

- [ ] **Step 8: Reduce the layer set**

In `src/map/layers.ts`:

- Delete `FILL_IDS`, `OUTLINE_IDS` and `categoryIn`.
- Change `layerFilters(hiddenCategories: CategoryId[])` to return only `places-points`, `places-hover-fill`, `places-hover-line`, `places-hover-point` and `places-labels`.
- Change `applyLayerFilters(map, hiddenCategories)` to call `layerFilters(hiddenCategories)`.
- In `placesLayers()`, delete the `places-buildings`, `places-areas-fill`, `places-areas-outline-tint` and `places-areas-outline` layers. Keep points, hover layers and labels unchanged.

- [ ] **Step 9: Remove the click handler, update filter syncing, expose a dev map handle**

In `src/map/createMap.ts`:

- Delete the whole `map.on('click', ...)` block.
- In `syncFilters`, read only `hiddenCategories`, key on `hiddenCategories.join(',')`, and call `applyLayerFilters(map, hiddenCategories)`. Leave the mousemove and mouseout handlers as they are.
- Immediately after `const map = new Map({ ...opts, style })`, expose the instance for the Playwright checks. `import.meta.env.DEV` is `false` in `pnpm build`, so this branch is dead-code-eliminated from production:

```ts
if (import.meta.env.DEV) {
  ;(window as unknown as { __senatiMap?: Map }).__senatiMap = map
}
```

`import.meta.env` is typed by `vite/client`, which this project does not yet include. Add it to the `types` array in `tsconfig.json` so `pnpm typecheck` accepts the guard:

```json
"types": ["vite/client", "vitest/globals", "@testing-library/jest-dom"]
```

The browser check in Task 3 uses this handle to project known place coordinates onto the canvas with `map.project()`, so it can move the real mouse over a specific dot instead of sweeping the canvas.

- [ ] **Step 10: Rewrite `PlacePanel` as a hover-only tooltip**

Replace `src/ui/PlacePanel.tsx` with:

```tsx
import { useAppStore } from '../store'
import { describePlace } from '../places/describePlace'
import { CATEGORY_BY_ID, type CategoryId } from '../categories'
import placesData from '../data/places.geojson'

export function PlacePanel() {
  const hoveredId = useAppStore((state) => state.hoveredId)
  const feature = hoveredId
    ? placesData.features.find((f: any) => f.properties?.id === hoveredId)
    : undefined

  if (!feature) {
    return (
      <div
        data-testid="place-panel"
        className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2"
      />
    )
  }

  const props = feature.properties as any
  const summary = describePlace(props)
  const categoryId = props?.category as CategoryId | undefined | null
  const categoryDef = categoryId ? CATEGORY_BY_ID[categoryId] : null
  const typeLabel = categoryDef?.label ?? summary.categoryLabel
  const typeColor = categoryDef?.color ?? '#6b7a8f'

  return (
    <div
      data-testid="place-panel"
      className="pointer-events-none fixed left-1/2 top-4 z-30 -translate-x-1/2"
    >
      <div className="w-fit min-w-[10rem] max-w-[24rem] rounded-lg border border-white/15 bg-[#12151b]/90 px-4 py-2.5 text-center shadow-xl reduce-blur">
        {summary.title && (
          <div className="text-base font-semibold leading-tight text-white">{summary.title}</div>
        )}
        {typeLabel && (
          <div className="mt-0.5 text-xs font-medium" style={{ color: typeColor }}>
            {typeLabel}
          </div>
        )}
      </div>
    </div>
  )
}
```

The inner card deliberately inherits `pointer-events-none` from the wrapper: making it
`pointer-events-auto` covers dots in the top-centre band, firing `mouseout` as soon as
they are hovered and clearing hover in a loop.

- [ ] **Step 11: Run the task tests to verify they pass**

Run: `pnpm test src/store.test.ts src/map/hover.test.ts src/map/layers.test.ts src/ui/a11y.test.tsx src/map/layers.validate.test.ts`
Expected: PASS.

- [ ] **Step 12: Run typecheck**

Run: `pnpm typecheck`
Expected: no errors. Fix any remaining reference to `select`, `selectedId` or `selectedFootprintId` in source or tests.

- [ ] **Step 13: Commit**

```bash
git add src/store.ts src/store.test.ts src/map/hover.ts src/map/hover.test.ts src/map/layers.ts src/map/layers.test.ts src/map/createMap.ts tsconfig.json src/ui/PlacePanel.tsx src/ui/a11y.test.tsx
git commit -m "feat(map): make place tooltip hover-only"
```

---

### Task 3: Align project docs and verify with Playwright CLI

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: project guidance that matches the shipped behaviour.

- [ ] **Step 1: Update `AGENTS.md`**

Replace the stale bullets with:

- Current state: "all blocks implemented, hover-only place dots with a category legend".
- "Closed category table." Keep the closed-table rule; replace the uncategorised-context sentence with: "Only features with an OSM `name` or a category `genericLabel` are kept; everything else is dropped at fetch time."
- "Flat buildings." Replace with: "Buildings are not drawn at rest. Hovering a place dot fills its footprint with the category colour at 35 % opacity and draws a thin outline; there are no fill-extrusion layers."
- "No controls card." Replace with: "The bottom-left category legend is the only controls panel."
- Category list: state the eleven remaining categories and that only Park and Pitch have generic labels.
- Gotchas: replace "Unnamed areas need a label" with "No `Unnamed …` places: the fetch drops any feature with neither a name nor a generic label."

- [ ] **Step 2: Run the full gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: typecheck clean, all tests pass, build succeeds with only the known MapLibre >500 kB warning.

- [ ] **Step 3: Verify with Playwright CLI at three viewports**

This machine has Playwright 1.65.1 via mise and Chrome at `/opt/google/chrome/chrome`, but not the standalone `playwright-cli` binary. Use the `playwright cli` subcommand throughout.

Start the dev server in the background and wait for it to answer:

```bash
pnpm dev --host 127.0.0.1 > /tmp/senati-dev.log 2>&1 &
DEV_PID=$!
until curl -sf http://127.0.0.1:5173 > /dev/null; do sleep 0.5; done
```

Open the installed Chrome through Playwright CLI:

```bash
playwright cli open --browser=chrome http://127.0.0.1:5173
```

Save the probe below to `/tmp/senati-probe.js`. It waits for the map, reads the live camera through the dev handle, projects known places onto the canvas with `map.project()`, drives the real mouse, and returns a JSON report:

```js
async (page) => {
  await page.waitForFunction(
    () => !!window.__senatiMap && !document.querySelector('[data-testid="loading-overlay"]'),
    null,
    { timeout: 30000 },
  )

  const coords = await page.evaluate(async () => {
    const map = window.__senatiMap
    const data = await map.getSource('places').getData()
    const rect = map.getCanvas().getBoundingClientRect()
    const project = (feature) => {
      const [lng, lat] = feature.geometry.coordinates
      const p = map.project([lng, lat])
      return { x: rect.left + p.x, y: rect.top + p.y }
    }
    const safe = (p) =>
      p.y > 140 &&
      p.y < innerHeight - 60 &&
      p.x > 60 &&
      p.x < innerWidth - 60 &&
      !(p.x < 320 && p.y > innerHeight - 260)
    const candidates = data.features
      .filter((feature) => feature.geometry?.type === 'Point')
      .map((feature) => ({ feature, point: project(feature) }))
    const pick = (predicate) =>
      candidates.find(({ feature, point }) => predicate(feature) && safe(point))
    const named = candidates
      .filter(({ feature, point }) => feature.properties?.name && safe(point))
      .sort((a, b) => a.feature.properties.name.length - b.feature.properties.name.length)

    const withFootprint = pick((f) => f.properties?.footprintId && f.properties?.name)
    const pointOnly = pick(
      (f) =>
        f.properties?.geometryType === 'point' &&
        !f.properties?.footprintId &&
        f.properties?.name,
    )
    const shop = pick((f) => f.properties?.category === 'shop')
    const short = named[0]
    const long = named[named.length - 1]

    return {
      scrolls:
        document.documentElement.scrollHeight > innerHeight ||
        document.documentElement.scrollWidth > innerWidth,
      legendRows: document.querySelectorAll('[data-testid^="legend-toggle-"]').length,
      hasUnnamed: document.body.innerText.includes('Unnamed'),
      withFootprint: withFootprint && {
        ...withFootprint.point,
        name: withFootprint.feature.properties.name,
      },
      pointOnly: pointOnly && { ...pointOnly.point, name: pointOnly.feature.properties.name },
      shop: shop && { ...shop.point, name: shop.feature.properties.name },
      short: short && { ...short.point, name: short.feature.properties.name },
      long: long && { ...long.point, name: long.feature.properties.name },
    }
  })

  const readPanel = () =>
    page.evaluate(() => {
      const panel = document.querySelector('[data-testid="place-panel"]')
      return {
        text: (panel?.innerText ?? '').trim(),
        width: panel?.firstElementChild?.offsetWidth ?? 0,
      }
    })

  const hoverAt = async (point) => {
    await page.mouse.move(point.x, point.y)
    await page.waitForTimeout(150)
    return { name: point.name, ...(await readPanel()) }
  }

  const hovers = {}
  for (const key of ['withFootprint', 'pointOnly', 'short', 'long']) {
    if (coords[key]) hovers[key] = await hoverAt(coords[key])
  }

  const vp = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }))
  let afterClick = null
  let afterLeave = null
  if (coords.withFootprint) {
    await page.mouse.move(coords.withFootprint.x, coords.withFootprint.y)
    await page.waitForTimeout(150)
    await page.screenshot({ path: `/tmp/senati-hover-${vp.w}x${vp.h}.png` })
    await page.mouse.click(coords.withFootprint.x, coords.withFootprint.y)
    await page.waitForTimeout(150)
    afterClick = await page.evaluate(() => ({
      dialog: !!document.querySelector('[role="dialog"]'),
      text: (document.querySelector('[data-testid="place-panel"]')?.innerText ?? '').trim(),
    }))
    await page.mouse.move(2, 2)
    await page.waitForTimeout(150)
    afterLeave = (await readPanel()).text
  }

  let toggle = null
  if (coords.shop) {
    await page.mouse.move(coords.shop.x, coords.shop.y)
    await page.waitForTimeout(150)
    const before = (await readPanel()).text
    await page.evaluate(() => document.querySelector('[data-testid="legend-toggle-shop"]').click())
    await page.waitForTimeout(150)
    const after = (await readPanel()).text
    await page.evaluate(() => document.querySelector('[data-testid="legend-toggle-shop"]').click())
    toggle = { before, after }
  }

  return {
    viewport: vp,
    scrolls: coords.scrolls,
    legendRows: coords.legendRows,
    hasUnnamed: coords.hasUnnamed,
    hovers,
    afterClick,
    afterLeave,
    toggle,
  }
}
```

Run it at each viewport. `resize` changes the container, `reload` re-runs `fitCampus()`, and the probe projects against the new camera:

```bash
for size in "1280 800" "1440 900" "1920 1080"; do
  read -r w h <<< "$size"
  playwright cli resize "$w" "$h"
  playwright cli reload
  playwright cli run-code --filename=/tmp/senati-probe.js
done
```

Check every returned report:

- `scrolls` is `false` (no page scroll at any size).
- `legendRows` is `11` and `hasUnnamed` is `false`.
- `hovers.withFootprint.text` starts with the place name and has a second line for its type; the tooltip is centred at the top and the footprint is visible in `/tmp/senati-hover-<w>x<h>.png`.
- `hovers.pointOnly.text` is non-empty (a point-only place still shows a tooltip) and no footprint appears.
- `hovers.long.width` is `<= 384` (`max-w-[24rem]`) and `hovers.short.width` is at most `hovers.long.width` (a short name is not padded out to a fixed width; a long name wraps inside the max width).
- `afterClick.dialog` is `false` and `afterClick.text` equals the hovered text (clicking does nothing).
- `afterLeave` is `''` (leaving hides the tooltip).
- `toggle.before` is non-empty and `toggle.after` is `''` (toggling a category while hovered clears it).

Check the console, then close the session and stop the dev server:

```bash
playwright cli console error
playwright cli close
kill "$DEV_PID"
```

Expected: no console errors. `pnpm dev` must be running for the whole probe; if Chrome cannot launch, report the exact Playwright error instead of claiming the check passed.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md
git commit -m "docs: align AGENTS.md with hover-only tooltip"
```
