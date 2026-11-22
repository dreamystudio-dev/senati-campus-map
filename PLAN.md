# SENATI Campus Map Implementation Plan

> **Superseded (camera & modes):** the camera-mode, Free view, `maxBounds`, 15.5–19.5 top zoom and related a11y/QA sections below are historical. See `docs/superpowers/specs/2026-11-22-top-view-only-redesign-design.md` for the single-mode overview now in place.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A one-screen 3D landing page for the SENATI campus in San Martín de Porres, with category-coloured places, a top view, and a WASD first-person view.

**Architecture:** Vite + React SPA with a single MapLibre map. Place data is fetched once from Overpass into a committed GeoJSON, categorised at fetch time, and rendered as three layer families: extruded buildings, flat areas, and viewport-aligned points. Camera is a small state machine over MapLibre's own camera API, with a first-person controller that writes the camera each animation frame.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Tailwind CSS 4, MapLibre GL JS 6, Zustand 5, Vitest 5, deployed static on Vercel.

**Spec:** `docs/superpowers/specs/2026-11-21-campus-map-design.md`

**Plan location:** `PLAN.md` at the repo root, per the author's request. The spec remains the source of truth for design intent.

## Global Constraints

- Static Vercel deployment. No environment variables, no API keys, no server functions.
- Desktop only. No mobile or touch layout, no coarse-pointer branches beyond hiding nothing.
- One route, no router.
- The page never scrolls: root element is `h-dvh overflow-hidden`.
- Place data is committed. No Overpass request at runtime.
- OSM and OpenFreeMap attribution visible at all times.
- Category table is closed: unknown tags are dropped at fetch time.
- `maxBounds` = campus box padded 10%. Camera cannot leave it in either mode.
- Top view: zoom 15.5–19.5, pitch 0–60°. Free view: eye 2–80 m, pitch ≤ 95°.
- Palette hexes are fixed: sky `#5aa9e6`, coral `#ef6f6c`, amber `#f2b134`, violet `#9b7ede`, lime `#8bc34a`, teal `#2ec4b6`, pink `#e56b9f`, bone `#e8e2d6`, orange `#f08a3c`, slate `#6b7a8f`.
- No user text input anywhere. All labels come from committed data and are rendered as React text.

## Review Focus

These are the conditions most likely to bite a real visitor. Each has a test in the task that owns the code.

1. **Unnamed area features.** Three parks have no `name` in OSM. They must render a generic category label (`Parque`, `Cancha`, `Estacionamiento`), never a blank or an empty symbol. Owned by Task 7.
2. **WebGL unavailable.** A machine without WebGL must show the error overlay with a retry, never a blank page. Owned by Task 5.
3. **Pointer lock refused.** Browsers can deny `requestPointerLock` (iframe, permissions, second request too soon). Free view must stay usable by falling back to drag-to-look. Owned by Task 11.
4. **Basemap tiles fail.** OpenFreeMap outage must surface the error overlay, not an empty dark screen with buildings floating in space. Owned by Task 13.
5. **Resize and odd aspect ratios.** Fitting the campus must survive a 1280×800 laptop, a 1920×1080 monitor and a narrow 1100×900 window without scrolling or cropping the campus edge. Owned by Task 9.

---

## Block 1 — Foundation

### Task 1: Scaffold the app shell

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `src/App.test.tsx`, `src/test/setup.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `App` default export rendering `<div data-testid="app-shell">`; `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm data` scripts.

- [ ] **Step 1: Write the failing test**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react'
import App from './App'

it('renders a full-viewport, non-scrolling shell', () => {
  render(<App />)
  expect(screen.getByTestId('app-shell')).toHaveClass('h-dvh', 'overflow-hidden')
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test`
Expected: FAIL, cannot resolve `./App`.

- [ ] **Step 3: Scaffold Vite, React, TypeScript and Tailwind**

The repo already holds `docs/` and `PLAN.md`, so scaffold into a temporary directory and copy in, rather than letting Vite prompt about a non-empty folder:

```bash
pnpm create vite .scaffold --template react-ts
cp -r .scaffold/. .
rm -rf .scaffold
pnpm add maplibre-gl zustand @mapbox/polylabel
pnpm add -D tailwindcss @tailwindcss/vite vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event tsx osmtogeojson
```

Add `@tailwindcss/vite` to `vite.config.ts`, set `test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' }`, and add scripts `dev`, `build`, `preview`, `test`, `data: "tsx scripts/fetch-places.ts"`.

`src/index.css` starts with `@import "tailwindcss";`. `src/App.tsx` renders the shell with `h-dvh overflow-hidden bg-[#12151b]`. `src/main.tsx` imports `./index.css`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test`
Expected: PASS, 1 test.

- [ ] **Step 5: Confirm the production build works**

Run: `pnpm build`
Expected: `dist/` produced with no TypeScript errors.

- [ ] **Step 6: Initialise git and commit**

```bash
git init
git add .
git commit -m "chore: scaffold Vite React TS app shell"
```

---

### Task 2: Campus bounds and fit zoom

**Files:**
- Create: `src/data/campus.json`
- Create: `src/map/bounds.ts`
- Test: `src/map/bounds.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Bounds = [west: number, south: number, east: number, north: number]`
  - `CAMPUS: { name: string; city: string; center: [number, number]; bounds: Bounds }`
  - `paddedBounds(bounds: Bounds, ratio: number): Bounds`
  - `fitZoom(bounds: Bounds, viewport: { width: number; height: number }, paddingPx: number): number`

- [ ] **Step 1: Write the failing tests**

```ts
// src/map/bounds.test.ts
import { CAMPUS, fitZoom, paddedBounds } from './bounds'

it('pads the campus box by the given ratio', () => {
  const [w, s, e, n] = paddedBounds([-77.0635, -12.0018, -77.0575, -11.9965], 0.1)
  expect(w).toBeCloseTo(-77.0641, 6)
  expect(s).toBeCloseTo(-12.00233, 6)
  expect(e).toBeCloseTo(-77.0569, 6)
  expect(n).toBeCloseTo(-11.99597, 6)
})

it('fits the campus at a laptop viewport inside the allowed range', () => {
  const zoom = fitZoom(CAMPUS.bounds, { width: 1280, height: 800 }, 48)
  expect(zoom).toBeGreaterThanOrEqual(15.5)
  expect(zoom).toBeLessThanOrEqual(19.5)
})

it('zooms out as the viewport shrinks', () => {
  const wide = fitZoom(CAMPUS.bounds, { width: 1920, height: 1080 }, 48)
  const narrow = fitZoom(CAMPUS.bounds, { width: 1100, height: 900 }, 48)
  expect(narrow).toBeLessThanOrEqual(wide)
})

it('clamps to the top-view limits', () => {
  expect(fitZoom([-77.0606, -11.9997, -77.0605, -11.9996], { width: 1280, height: 800 }, 0)).toBe(19.5)
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test src/map/bounds.test.ts`
Expected: FAIL, cannot resolve `./bounds`.

- [ ] **Step 3: Implement `src/data/campus.json` and `src/map/bounds.ts`**

```json
{
  "name": "SENATI · Sede Principal",
  "city": "San Martín de Porres, Lima",
  "center": [-77.0604, -11.999],
  "bounds": [-77.0635, -12.0018, -77.0575, -11.9965]
}
```

`fitZoom` uses MapLibre's Web Mercator constants: metres per pixel at zoom 0 and latitude φ is `156543.03392 * cos(φ)`. Take the box's larger padded dimension, convert to pixels at the target zoom, and solve for the zoom that fits the smaller of width/height. Clamp to `[15.5, 19.5]`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/map/bounds.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/data/campus.json src/map/bounds.ts src/map/bounds.test.ts
git commit -m "feat: campus bounds and fit zoom"
```

---

### Task 3: Category table and resolution

**Files:**
- Create: `src/categories.ts`
- Test: `src/categories.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type CategoryId = 'education' | 'food' | 'market' | 'shop' | 'park' | 'sport' | 'worship' | 'finance' | 'fuel' | 'art' | 'parking' | 'construction'`
  - `type MarkStyle = 'fill' | 'outline'`
  - `interface Category { id: CategoryId; label: string; color: string; style: MarkStyle; genericLabel?: string }`
  - `CATEGORIES: Category[]` in match priority order
  - `CATEGORY_BY_ID: Record<CategoryId, Category>`
  - `resolveCategory(tags: Record<string, string>): Category | null`

- [ ] **Step 1: Write the failing tests**

```ts
// src/categories.test.ts
import { CATEGORIES, CATEGORY_BY_ID, resolveCategory } from './categories'

it('has the twelve spec categories', () => {
  expect(CATEGORIES).toHaveLength(12)
  expect(Object.keys(CATEGORY_BY_ID)).toHaveLength(12)
})

it.each([
  [{ amenity: 'marketplace' }, 'market'],
  [{ shop: 'car_parts' }, 'shop'],
  [{ leisure: 'park' }, 'park'],
  [{ amenity: 'cafe' }, 'food'],
  [{ amenity: 'college' }, 'education'],
  [{ office: 'educational_institution' }, 'education'],
  [{ tourism: 'artwork' }, 'art'],
  [{ landuse: 'construction' }, 'construction'],
])('resolves %o to %s', (tags, id) => {
  expect(resolveCategory(tags)?.id).toBe(id)
})

it('drops filler landuse and unknown tags', () => {
  expect(resolveCategory({ landuse: 'grass' })).toBeNull()
  expect(resolveCategory({ amenity: 'recycling' })).toBeNull()
  expect(resolveCategory({})).toBeNull()
})

it('gives areas a generic label and buildings none', () => {
  expect(CATEGORY_BY_ID.park.genericLabel).toBe('Parque')
  expect(CATEGORY_BY_ID.parking.genericLabel).toBe('Estacionamiento')
  expect(CATEGORY_BY_ID.shop.genericLabel).toBeUndefined()
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test src/categories.test.ts`
Expected: FAIL, cannot resolve `./categories`.

- [ ] **Step 3: Implement `src/categories.ts`**

Table order is match priority: education, food, market, shop, park, sport, worship, finance, fuel, art, parking, construction. Each entry carries the palette hex from Global Constraints. `genericLabel` is set for `park`, `sport`, `parking`, `construction` only. `resolveCategory` checks the OSM key/value combinations in table order and returns the first match.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/categories.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Commit**

```bash
git add src/categories.ts src/categories.test.ts
git commit -m "feat: category table and tag resolution"
```

---

### Task 4: Overpass fetch script and committed place data

**Files:**
- Create: `scripts/fetch-places.ts`, `scripts/osmtogeojson.d.ts`
- Create: `scripts/fixtures/overpass-sample.json`
- Create: `src/data/places.geojson` (generated)
- Test: `scripts/fetch-places.test.ts`

**Interfaces:**
- Consumes: `resolveCategory`, `CATEGORY_BY_ID` from `src/categories.ts`.
- Produces:
  - `interface PlaceProps { id: string; name?: string; category: CategoryId | null; kind: string; geometryType: 'building' | 'area' | 'point'; levels?: number; heightM?: number; labelLng: number; labelLat: number }`
  - `deriveHeightM(tags: Record<string, string>): number`
  - `transformOverpass(osm: OverpassJson): FeatureCollection<Geometry, PlaceProps>`

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/fetch-places.test.ts
import { deriveHeightM, transformOverpass } from './fetch-places'
import sample from './fixtures/overpass-sample.json'

it('derives height from levels, then height, then default', () => {
  expect(deriveHeightM({ 'building:levels': '2' })).toBe(6.4)
  expect(deriveHeightM({ height: '12 m' })).toBe(12)
  expect(deriveHeightM({})).toBe(6)
  expect(deriveHeightM({ 'building:levels': '0' })).toBe(4)
  expect(deriveHeightM({ 'building:levels': '99' })).toBe(60)
})

it('transforms a sample response and drops filler and unknown tags', () => {
  const fc = transformOverpass(sample as never)
  expect(fc.features).toHaveLength(4)
  expect(fc.features.every(f => f.properties.category)).toBe(true)
  expect(fc.features.some(f => f.properties.kind === 'landuse=grass')).toBe(false)
})

it('formats ids as osm type and id, and types each geometry class', () => {
  const fc = transformOverpass(sample as never)
  expect(fc.features.map(f => f.properties.id).sort()).toEqual([
    'node/900', 'relation/700', 'way/100', 'way/200',
  ])
  expect(fc.features.find(f => f.properties.id === 'node/900')?.properties.geometryType).toBe('point')
  expect(fc.features.find(f => f.properties.id === 'relation/700')?.properties.geometryType).toBe('area')
  expect(fc.features.find(f => f.properties.id === 'way/100')?.properties.geometryType).toBe('building')
})

it('puts label points inside their polygons', () => {
  const fc = transformOverpass(sample as never)
  for (const f of fc.features.filter(f => f.properties.geometryType !== 'point')) {
    expect(insidePolygon([f.properties.labelLng, f.properties.labelLat], f.geometry)).toBe(true)
  }
})
```

Add a local `insidePolygon` helper in the test file using a ray-cast over the first ring.

The fixture holds: `way/100` building with `building:levels=2` and a name, `way/200` park polygon with no name, `relation/700` multipolygon park, `node/900` shop, one `landuse=grass` way, one `amenity=recycling` node.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test scripts/fetch-places.test.ts`
Expected: FAIL, cannot resolve `./fetch-places`.

- [ ] **Step 3: Implement `scripts/fetch-places.ts`**

Query Overpass with `[out:json][timeout:90]` over the campus bbox for `nwr["building"]`, `nwr["amenity"]`, `nwr["shop"]`, `nwr["leisure"]`, `nwr["tourism"]`, `nwr["landuse"]`, using `out geom`. Convert with `osmtogeojson`; it ships no types, so add `scripts/osmtogeojson.d.ts` declaring `convert(osm: unknown): FeatureCollection`. For each feature: resolve category. Drop features with no category **unless they are buildings** — uncategorised buildings are kept with `category: null` so the campus keeps its 3D mass and renders neutral. Classify geometry (`building` when a `building` tag exists, `area` for ways/relations without one, `point` for nodes), derive height for buildings, compute `polylabel` for polygons and the node coordinate for points, write `id` as `${type}/${id}`. Guard the CLI write with `if (process.argv[1]?.endsWith('fetch-places.ts'))` so importing the module in tests does no I/O. CLI mode writes `src/data/places.geojson` with 5-decimal coordinates and prints the feature count per category, bucketing `null` as `uncategorised`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test scripts/fetch-places.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Generate the real data and check it**

Run: `pnpm data`
Expected: prints one bucket per category plus `uncategorised` for neutral buildings, every category that exists in the box has features (including `construction`), and `src/data/places.geojson` is under 500 KB.

- [ ] **Step 6: Commit**

```bash
git add scripts src/data/places.geojson package.json pnpm-lock.yaml
git commit -m "feat: fetch and categorise campus place data"
```

---

## Block 2 — Map

### Task 5: Map initialisation and basemap sanitising

**Files:**
- Create: `src/map/style.ts`, `src/map/createMap.ts`, `src/map/MapCanvas.tsx`
- Modify: `src/App.tsx`
- Test: `src/map/style.test.ts`

**Interfaces:**
- Consumes: `CAMPUS`, `paddedBounds`, `fitZoom` from `src/map/bounds.ts`.
- Produces:
  - `sanitizeStyle(style: StyleSpecification): StyleSpecification` — removes layers whose id starts with `building` or `poi`, keeps `water`, `road`, `landuse` layers
  - `createMap(container: HTMLElement): Map`
  - `<MapCanvas />` mounting the map into a `data-testid="map"` div
  - `webglAvailable(): boolean`

- [ ] **Step 1: Write the failing test**

```ts
// src/map/style.test.ts
import { sanitizeStyle } from './style'

const style = {
  version: 8,
  sources: {},
  layers: [
    { id: 'building-3d', type: 'fill-extrusion', source: 'openmaptiles' },
    { id: 'building', type: 'fill', source: 'openmaptiles' },
    { id: 'poi-label', type: 'symbol', source: 'openmaptiles' },
    { id: 'water', type: 'fill', source: 'openmaptiles' },
    { id: 'road-primary', type: 'line', source: 'openmaptiles' },
  ],
} as never

it('removes basemap buildings and POI layers, keeps context', () => {
  const ids = sanitizeStyle(style).layers.map(l => l.id)
  expect(ids).toEqual(['water', 'road-primary'])
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/map/style.test.ts`
Expected: FAIL, cannot resolve `./style`.

- [ ] **Step 3: Implement style sanitising, map creation and the canvas**

`createMap` fetches `https://tiles.openfreemap.org/styles/liberty`, sanitises it, and constructs the map with `center: CAMPUS.center`, `zoom: fitZoom(CAMPUS.bounds, container.getBoundingClientRect(), 48)`, `maxBounds: paddedBounds(CAMPUS.bounds, 0.1)`, `minZoom: 15.5`, `maxZoom: 19.5`, `maxPitch: 60`, `renderWorldCopies: false`, and an `AttributionControl`. `webglAvailable` tries to get a `webgl2` context from a throwaway canvas. `MapCanvas` renders a full-bleed div and, if WebGL is missing or style fetching rejects, renders an inline `<div data-testid="map-error">` with the reason. Task 13 replaces that inline block with the shared `ErrorOverlay`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test src/map/style.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev`
Expected: a dark campus map, no basemap 3D buildings, no POI icons, attribution visible.

- [ ] **Step 6: Commit**

```bash
git add src/map src/App.tsx
git commit -m "feat: map bootstrap with sanitised OpenFreeMap style"
```

---

### Task 6: Place layers

**Files:**
- Create: `src/map/layers.ts`
- Modify: `src/map/createMap.ts`
- Test: `src/map/layers.test.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `CATEGORY_BY_ID` from `src/categories.ts`; `places.geojson`.
- Produces:
  - `PLACES_SOURCE_ID = 'places'`
  - `placesLayers(): LayerSpecification[]` returning ids `places-buildings`, `places-areas-fill`, `places-areas-outline`, `places-points`, `places-labels`
  - `categoryColorExpression(): ExpressionSpecification`

- [ ] **Step 1: Write the failing test**

```ts
// src/map/layers.test.ts
import { CATEGORIES } from '../categories'
import { categoryColorExpression, placesLayers } from './layers'

it('produces one layer per geometry family plus labels', () => {
  const ids = placesLayers().map(l => l.id)
  expect(ids.slice(0, 5)).toEqual([
    'places-buildings', 'places-areas-fill', 'places-areas-outline', 'places-points', 'places-labels',
  ])
})

it('maps every category colour into the expression', () => {
  const flat = JSON.stringify(categoryColorExpression())
  for (const c of CATEGORIES) expect(flat).toContain(c.color)
})

it('labels only named features, with a generic fallback for areas', () => {
  const labels = placesLayers().find(l => l.id === 'places-labels') as never as {
    layout: { 'text-field': unknown }
  }
  const text = JSON.stringify(labels.layout['text-field'])
  expect(text).toContain('name')
  expect(text).toContain('genericLabel')
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test src/map/layers.test.ts`
Expected: FAIL, cannot resolve `./layers`.

- [ ] **Step 3: Implement `src/map/layers.ts` and add the source**

Buildings: `fill-extrusion`, colour from `categoryColorExpression()`, height from `heightM`, opacity 0.92, outline categories get `#6b7a8f` at 0.35 opacity. The expression's final fallback is neutral slate `#2a303b`, which is also what `category: null` context buildings use — they must render as mass, not disappear. Areas: a tinted fill layer plus a 2 px outline layer, both filtered on `geometryType === 'area'`. Points: `circle` layer with `circle-pitch-alignment: 'viewport'`, radius 5–7 px by zoom, colour from the expression. Labels: `symbol` layer, `text-field` as `['coalesce', ['get', 'name'], ['get', 'genericLabel']]`, halo `#12151b` width 1.5, `text-size` interpolated 11→15 px from zoom 15.5→19.5.

`createMap` adds the source from the imported GeoJSON, then adds `placesLayers()` before the first symbol layer of the basemap so labels stay on top.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/map/layers.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev`
Expected: campus buildings extruded in category colours, parks and pitches outlined, shops visible as dots, named places labelled, no blank labels.

- [ ] **Step 6: Commit**

```bash
git add src/map
git commit -m "feat: category-coloured building, area and point layers"
```

---

### Task 7: Hover, selection and place description

**Files:**
- Create: `src/places/describePlace.ts`, `src/store.ts`
- Create: `src/ui/InfoCard.tsx`, `src/ui/Tooltip.tsx`
- Modify: `src/map/createMap.ts`
- Test: `src/places/describePlace.test.ts`, `src/store.test.ts`

**Interfaces:**
- Consumes: `PlaceProps`, `CATEGORY_BY_ID`.
- Produces:
  - `interface PlaceSummary { id: string; title: string; categoryLabel: string; meta: string[] }`
  - `describePlace(p: PlaceProps): PlaceSummary`
  - `useAppStore` with `{ mode, locked, hoveredId, selectedId, setMode, setLocked, setHovered, select }`
  - `<InfoCard />`, `<Tooltip />`

- [ ] **Step 1: Write the failing tests**

```ts
// src/places/describePlace.test.ts
import { describePlace } from './describePlace'

const base = { id: 'way/1', category: 'park', kind: 'leisure=park', geometryType: 'area', labelLng: 0, labelLat: 0 } as const

it('uses the name when present', () => {
  expect(describePlace({ ...base, name: 'Parque Central' }).title).toBe('Parque Central')
})

it('falls back to the generic label for unnamed areas', () => {
  expect(describePlace({ ...base }).title).toBe('Parque')
})

it('never returns a blank title for an unnamed building', () => {
  const p = { ...base, category: 'shop', geometryType: 'building' } as const
  expect(describePlace({ ...p }).title).toBe('Unnamed shop')
})

it('labels neutral context buildings with a null category', () => {
  const p = { ...base, category: null, geometryType: 'building' } as const
  expect(describePlace({ ...p })).toMatchObject({ title: 'Unnamed building', meta: ['Building'] })
})

it('reports levels and height when known', () => {
  const p = { ...base, category: 'education', geometryType: 'building', levels: 2, heightM: 6.4 } as const
  expect(describePlace({ ...p }).meta).toEqual(['Education', '2 levels', '6.4 m'])
})
```

```ts
// src/store.test.ts
import { useAppStore } from './store'

beforeEach(() => useAppStore.setState({ mode: 'top', locked: false, hoveredId: null, selectedId: null }))

it('locks the pointer when entering free view and unlocks on escape', () => {
  useAppStore.getState().setMode('free')
  expect(useAppStore.getState().locked).toBe(true)
  useAppStore.getState().setLocked(false)
  expect(useAppStore.getState().mode).toBe('free')
  expect(useAppStore.getState().locked).toBe(false)
})

it('clears selection when the mode changes', () => {
  useAppStore.getState().select('way/1')
  useAppStore.getState().setMode('free')
  expect(useAppStore.getState().selectedId).toBeNull()
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test src/places src/store.test.ts`
Expected: FAIL, modules missing.

- [ ] **Step 3: Implement the store, description helper and overlays**

`describePlace` builds the title from `name`, then the category's `genericLabel`, then `Unnamed ${category}`. For `category: null` context buildings the title is `name` or `Unnamed building`, and the meta starts with `Building`. Meta otherwise starts with the category label, then `N levels` when known, then `H m` with one decimal. The map listens to `mousemove` for hover (only while unlocked or in top view), sets `hoveredId`, and positions the tooltip in screen space. `click` selects and opens the info card. Clicking empty map clears the selection.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/places src/store.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev`
Expected: hover shows name and category, click opens the card with levels and height, the three unnamed parks show "Parque".

- [ ] **Step 6: Commit**

```bash
git add src/places src/store.ts src/ui src/map
git commit -m "feat: hover, selection and place info card"
```

---

## Block 3 — Camera

### Task 8: Player state and camera maths

**Files:**
- Create: `src/camera/player.ts`
- Test: `src/camera/player.test.ts`

**Interfaces:**
- Consumes: `CAMPUS`.
- Produces:
  - `interface Player { x: number; y: number; heading: number; eyeM: number; pitchDeg: number }`
  - `interface InputState { forward: boolean; back: boolean; left: boolean; right: boolean; up: boolean; down: boolean; sprint: boolean }`
  - `PLAYER_LIMITS = { eyeMin: 2, eyeMax: 80, pitchMin: -60, pitchMax: 5, walk: 8, sprint: 20 }`
  - `stepPlayer(p: Player, input: InputState, dt: number): Player`
  - `metresToLngLat(origin: [number, number], x: number, y: number): [number, number]`
  - `eyeAndAhead(p: Player, lookAheadM?: number): { eye: [number, number]; ahead: [number, number]; aheadAltitudeM: number }`
  - `turn(p: Player, deltaYawDeg: number, deltaPitchDeg: number): Player`

- [ ] **Step 1: Write the failing tests**

```ts
// src/camera/player.test.ts
import { PLAYER_LIMITS, eyeAndAhead, metresToLngLat, stepPlayer, turn } from './player'

const still = { x: 0, y: 0, heading: 0, eyeM: 25, pitchDeg: 0 }
const noInput = { forward: false, back: false, left: false, right: false, up: false, down: false, sprint: false }

it('moves forward along the heading at walk speed', () => {
  const p = stepPlayer(still, { ...noInput, forward: true }, 1)
  expect(p.x).toBeCloseTo(PLAYER_LIMITS.walk, 5)
  expect(p.y).toBeCloseTo(0, 5)
})

it('normalises diagonal movement', () => {
  const p = stepPlayer(still, { ...noInput, forward: true, right: true }, 1)
  expect(Math.hypot(p.x, p.y)).toBeCloseTo(PLAYER_LIMITS.walk, 5)
})

it('clamps eye height and pitch', () => {
  expect(stepPlayer(still, { ...noInput, up: true }, 60).eyeM).toBe(PLAYER_LIMITS.eyeMax)
  expect(stepPlayer(still, { ...noInput, down: true }, 60).eyeM).toBe(PLAYER_LIMITS.eyeMin)
  expect(turn(still, 0, 90).pitchDeg).toBe(PLAYER_LIMITS.pitchMax)
  expect(turn(still, 0, -90).pitchDeg).toBe(PLAYER_LIMITS.pitchMin)
})

it('round-trips metres through lng/lat', () => {
  const origin: [number, number] = [-77.0604, -11.999]
  const [lng, lat] = metresToLngLat(origin, 100, 50)
  expect(lng).toBeGreaterThan(origin[0])
  expect(lat).toBeGreaterThan(origin[1])
})

it('puts the look-ahead point in front of the camera', () => {
  const { eye, ahead } = eyeAndAhead({ ...still, heading: 0 }, 20)
  expect(ahead[0]).toBeGreaterThan(eye[0])
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test src/camera/player.test.ts`
Expected: FAIL, cannot resolve `./player`.

- [ ] **Step 3: Implement `src/camera/player.ts`**

Heading 0 points east; movement is `(cos, sin)` in metres, converted with the metres-per-degree factors at the campus latitude (`111320` north–south, `111320 * cos(lat)` east–west). Sprint multiplies by 2.5. `eyeAndAhead` raises the ahead point by `tan(pitchDeg)` so the look direction matches the stored pitch. Clamp eye to `[2, 80]` and pitch to `[-60, 5]`.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/camera/player.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/camera
git commit -m "feat: first-person player state and camera maths"
```

---

### Task 9: Top view

**Files:**
- Create: `src/camera/useTopView.ts`
- Modify: `src/map/createMap.ts`, `src/map/MapCanvas.tsx`
- Test: `src/map/options.test.ts`

**Interfaces:**
- Consumes: `fitZoom`, `paddedBounds`, `CAMPUS`.
- Produces:
  - `mapOptions(viewport: { width: number; height: number }): MapOptions`
  - `fitCampus(map: Map): void` — jumps to the fitted top view
  - `useTopView(map: Map | null): void`

- [ ] **Step 1: Write the failing test**

```ts
// src/map/options.test.ts
import { mapOptions } from './options'

it('applies the top-view guardrails', () => {
  const o = mapOptions({ width: 1280, height: 800 })
  expect(o.minZoom).toBe(15.5)
  expect(o.maxZoom).toBe(19.5)
  expect(o.maxPitch).toBe(60)
  expect(o.renderWorldCopies).toBe(false)
  const [w, s, e, n] = o.maxBounds as [number, number, number, number]
  expect(w).toBeCloseTo(-77.0641, 6)
  expect(s).toBeCloseTo(-12.00233, 6)
  expect(e).toBeCloseTo(-77.0569, 6)
  expect(n).toBeCloseTo(-11.99597, 6)
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/map/options.test.ts`
Expected: FAIL, cannot resolve `./options`.

- [ ] **Step 3: Implement `mapOptions` and top view behaviour**

Move the option literals out of `createMap` into `mapOptions`. `useTopView` resets `pitch: 0`, `bearing: 0` and calls `fitCampus` whenever the mode is `top` and the map is idle. `MapCanvas` re-fits on `ResizeObserver` when the mode is `top`, and on window resize at any mode it only calls `map.resize()`.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test src/map/options.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev`
Expected: whole campus visible at 1280×800, 1920×1080 and a narrow 1100×900 window with no scroll; drag pans, wheel zooms, right-drag rotates and tilts to 60°.

- [ ] **Step 6: Commit**

```bash
git add src/map src/camera
git commit -m "feat: top view with campus fit and guardrails"
```

---

### Task 10: Free view controller

**Files:**
- Create: `src/camera/useFreeView.ts`
- Modify: `src/map/MapCanvas.tsx`
- Test: `src/camera/input.test.ts`

**Interfaces:**
- Consumes: `Player`, `stepPlayer`, `turn`, `eyeAndAhead`, `PLAYER_LIMITS`.
- Produces:
  - `interface KeyState { [code: string]: boolean }`
  - `inputFromKeys(keys: KeyState): InputState`
  - `sprintFromKeys(keys: KeyState): boolean`
  - `useFreeView(map: Map | null, canvas: HTMLCanvasElement | null): void`

- [ ] **Step 1: Write the failing test**

```ts
// src/camera/input.test.ts
import { inputFromKeys } from './input'

it('maps WASD and QE to movement intent', () => {
  expect(inputFromKeys({ KeyW: true, KeyD: true })).toMatchObject({ forward: true, right: true, back: false })
  expect(inputFromKeys({ KeyQ: true })).toMatchObject({ down: true })
  expect(inputFromKeys({ KeyE: true })).toMatchObject({ up: true })
})

it('ignores unrelated keys', () => {
  expect(inputFromKeys({ KeyZ: true })).toEqual({
    forward: false, back: false, left: false, right: false, up: false, down: false, sprint: false,
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/camera/input.test.ts`
Expected: FAIL, cannot resolve `./input`.

- [ ] **Step 3: Implement the controller**

`useFreeView` owns a `requestAnimationFrame` loop while `mode === 'free' && locked`. It tracks a `Set` of pressed codes on window `keydown`/`keyup`, ignores repeats, and maps them through `inputFromKeys`. Each frame: `stepPlayer` with `dt` clamped to 50 ms, then `map.jumpTo(map.calculateCameraOptionsFromTo(eye, p.eyeM, ahead, aheadAltitudeM))`. Mouse movement adjusts `heading` and `pitchDeg` by 0.12°/px. `pointerlockchange` writes `locked` into the store. While free view is active, disable the drag/scroll handlers individually — `dragPan`, `dragRotate`, `scrollZoom`, `doubleClickZoom`, `touchZoomRotate` — and re-enable them on exit.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test src/camera/input.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify by hand**

Run: `pnpm dev`, toggle Free.
Expected: camera at the drone vantage, WASD moves smoothly, Q/E changes height, mouse looks, horizon stays stable, no jitter at 60 fps.

- [ ] **Step 6: Commit**

```bash
git add src/camera src/map
git commit -m "feat: WASD first-person camera controller"
```

---

### Task 11: Mode switching, transitions and pointer-lock fallback

**Files:**
- Create: `src/camera/useModeTransition.ts`
- Create: `src/ui/ModeSwitch.tsx`
- Modify: `src/store.ts`, `src/map/MapCanvas.tsx`
- Test: `src/camera/transition.test.ts`

**Interfaces:**
- Consumes: `useAppStore`, `fitCampus`, `Player`.
- Produces:
  - `FREE_VANTAGE: { lng: number; lat: number; eyeM: 25; mapPitch: 55; headingDeg: number }`
  - `transitionPlan(from: 'top' | 'free', to: 'top' | 'free'): CameraOptions | null`
  - `requestPointerLockSafe(el: HTMLElement): Promise<boolean>`
  - `<ModeSwitch />`

- [ ] **Step 1: Write the failing tests**

```ts
// src/camera/transition.test.ts
import { FREE_VANTAGE, transitionPlan } from './transition'

it('enters free view at the drone vantage, not at eye level', () => {
  const plan = transitionPlan('top', 'free')
  expect(plan).toMatchObject({ pitch: 55, zoom: expect.any(Number) })
  expect(FREE_VANTAGE.eyeM).toBe(25)
})

it('returns to a flat north-up view', () => {
  expect(transitionPlan('free', 'top')).toMatchObject({ pitch: 0, bearing: 0 })
})

it('has no plan when the mode does not change', () => {
  expect(transitionPlan('top', 'top')).toBeNull()
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `pnpm test src/camera/transition.test.ts`
Expected: FAIL, cannot resolve `./transition`.

- [ ] **Step 3: Implement transitions, the switch and the lock fallback**

Top → free: `map.easeTo({ ...plan, duration: 1200 })`, set `transitioning` in the store, then on `moveend` place the player at `FREE_VANTAGE` and call `requestPointerLockSafe`. Free → top: `easeTo` back to the fitted view, clear the player. If `requestPointerLock` rejects or the `pointerlockerror` event fires, set `locked: false` and switch the canvas to drag-look mode (pointer down + move rotates); the controls card says "Drag to look". `Esc` unlocks. `ModeSwitch` is a two-button segmented control with `aria-pressed`, keyboard operable, top-right.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/camera/transition.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify by hand**

Run: `pnpm dev`
Expected: toggling animates in both directions; `Esc` frees the cursor and freezes the camera; clicking the map re-locks; denying pointer lock in devtools still leaves a usable drag-look camera.

- [ ] **Step 6: Commit**

```bash
git add src/camera src/ui src/store.ts src/map
git commit -m "feat: mode transitions, pointer lock and drag-look fallback"
```

---

## Block 4 — Landing UI

### Task 12: Title block, theme and controls card

**Files:**
- Create: `src/ui/TitleBlock.tsx`, `src/ui/ControlsCard.tsx`, `src/ui/copy.ts`
- Create: `src/theme.ts`
- Modify: `src/App.tsx`, `src/index.css`
- Test: `src/ui/copy.test.ts`

**Interfaces:**
- Consumes: `CAMPUS`, `useAppStore`.
- Produces:
  - `THEME` with `bg`, `panel`, `text`, `muted`, `accent`
  - `controlsFor(mode: 'top' | 'free', locked: boolean): string[]`
  - `<TitleBlock />`, `<ControlsCard />`

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/copy.test.ts
import { controlsFor } from './copy'

it('describes top view controls', () => {
  expect(controlsFor('top', false)).toEqual(['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate'])
})

it('describes free view controls, and the drag fallback when unlocked', () => {
  expect(controlsFor('free', true)).toEqual(['WASD to move', 'Mouse to look', 'Q / E for height', 'Esc to release'])
  expect(controlsFor('free', false)).toContain('Drag to look')
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/ui/copy.test.ts`
Expected: FAIL, cannot resolve `./copy`.

- [ ] **Step 3: Implement the copy helper and the overlays**

Title block top-left: `CAMPUS.name` as an `h1`, `CAMPUS.city` below, both non-interactive and `pointer-events-none`. Controls card bottom-right with a translucent panel (`bg-[#12151b]/80`, 1 px border `#2a303b`, backdrop blur), one row per hint. Theme tokens live in `src/theme.ts` and are consumed by inline styles where Tailwind arbitrary values would be unreadable. Load the display font with `@fontsource-variable/inter` (add dependency) so nothing is fetched at runtime.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test src/ui/copy.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify by hand**

Run: `pnpm dev`
Expected: title and controls read clearly over the map at 1280×800, 1440×900 and 1920×1080; controls update when switching modes.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/theme.ts src/App.tsx src/index.css package.json
git commit -m "feat: landing title, theme and contextual controls"
```

---

### Task 13: Loading, error and attribution states

**Files:**
- Create: `src/ui/LoadingOverlay.tsx`, `src/ui/ErrorOverlay.tsx`
- Modify: `src/map/MapCanvas.tsx`
- Test: `src/ui/states.test.ts`

**Interfaces:**
- Consumes: `useAppStore`.
- Produces:
  - `useAppStore` gains `mapStatus: 'loading' | 'ready' | 'error'` and `setMapStatus`
  - `<LoadingOverlay />`, `<ErrorOverlay onRetry={...} />`

- [ ] **Step 1: Write the failing test**

```ts
// src/ui/states.test.ts
import { useAppStore } from '../store'

it('starts loading and can move to error', () => {
  useAppStore.setState({ mapStatus: 'loading' })
  useAppStore.getState().setMapStatus('error')
  expect(useAppStore.getState().mapStatus).toBe('error')
})

it('goes ready only once the map is idle', () => {
  useAppStore.setState({ mapStatus: 'loading' })
  useAppStore.getState().setMapStatus('ready')
  expect(useAppStore.getState().mapStatus).toBe('ready')
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/ui/states.test.ts`
Expected: FAIL, `setMapStatus` is not a function.

- [ ] **Step 3: Implement the states**

`createMap` sets `ready` on the first `idle`, and `error` if the style fetch rejects, the WebGL probe fails, or the map emits an `error` whose `sourceId` is undefined and whose status is 404/500 for tiles. `LoadingOverlay` fades out over 300 ms when ready. `ErrorOverlay` shows "Map unavailable", a one-line reason and a Retry button that reloads the map. Attribution stays visible in the ready state and is included in the error overlay text.

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `pnpm test src/ui/states.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify by hand**

Run: `pnpm dev` with the network throttled and again with `tiles.openfreemap.org` blocked in devtools.
Expected: loading overlay until idle; blocking tiles shows the error overlay with a working Retry; no blank page.

- [ ] **Step 6: Commit**

```bash
git add src/ui src/map src/store.ts
git commit -m "feat: loading, error and attribution states"
```

---

### Task 14: Hover highlight, info card polish and reduced motion

**Files:**
- Modify: `src/map/layers.ts`, `src/map/createMap.ts`, `src/ui/InfoCard.tsx`, `src/index.css`
- Test: `src/map/layers.test.ts` (extend)

**Interfaces:**
- Consumes: `useAppStore`, `describePlace`.
- Produces: `HOVER_SOURCE_ID = 'places-hover'` and a hover layer pair; no new public API.

- [ ] **Step 1: Write the failing test**

```ts
// extend src/map/layers.test.ts
it('adds a hover highlight above the place layers', () => {
  const ids = placesLayers().map(l => l.id)
  expect(ids).toContain('places-hover-fill')
  expect(ids).toContain('places-hover-line')
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/map/layers.test.ts`
Expected: FAIL, hover ids missing.

- [ ] **Step 3: Implement the highlight and polish**

On hover, set a GeoJSON source with the hovered feature and a 1.5 px bright line plus a light fill above the normal layers. Info card: category chip in the category colour, title, meta rows, close button, `role="dialog"` with `aria-label`. Under `prefers-reduced-motion: reduce`, transitions use `duration: 0` and the loading fade is instant. Panels use `backdrop-blur-sm` only when `prefers-reduced-transparency` is not set.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test`
Expected: PASS, full suite.

- [ ] **Step 5: Verify by hand**

Run: `pnpm dev` with reduced motion enabled in the OS.
Expected: hovering brightens the feature, the card reads cleanly, mode switches are instant rather than animated.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: hover highlight, info card polish, reduced motion"
```

---

## Block 5 — QA and deploy

### Task 15: Accessibility and keyboard paths

**Files:**
- Modify: `src/ui/ModeSwitch.tsx`, `src/ui/InfoCard.tsx`, `src/App.tsx`
- Test: `src/ui/a11y.test.tsx`

**Interfaces:**
- Consumes: `useAppStore`.
- Produces: no new public API.

- [ ] **Step 1: Write the failing test**

```tsx
// src/ui/a11y.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ModeSwitch } from './ModeSwitch'

it('is operable by keyboard and reports its state', async () => {
  render(<ModeSwitch />)
  const free = screen.getByRole('button', { name: /free/i })
  await userEvent.tab()
  await userEvent.tab()
  expect(free).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(free).toHaveAttribute('aria-pressed', 'true')
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm test src/ui/a11y.test.tsx`
Expected: FAIL, focus or `aria-pressed` missing.

- [ ] **Step 3: Implement the accessibility pass**

Visible `:focus-visible` rings in the accent colour on every interactive element. `ModeSwitch` is a `role="group"` with `aria-label="Camera mode"` and `aria-pressed` per button. The info card traps nothing but closes on `Esc` and returns focus to the map canvas. The map canvas has `tabIndex={0}` and `aria-label` describing the campus. A visually hidden live region announces "Free view" / "Top view" on change.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `pnpm test src/ui/a11y.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/App.tsx
git commit -m "feat: keyboard and screen-reader paths"
```

---

### Task 16: README, deploy and final QA

**Files:**
- Create: `README.md`
- Modify: `package.json` (add `typecheck` script)
- Test: none; verification is the build and the manual checklist.

**Interfaces:**
- Consumes: everything.
- Produces: deployable `dist`, documented data refresh and category editing.

- [ ] **Step 1: Write the README**

Sections: what this is, the campus and plus code, stack, `pnpm install` / `pnpm dev` / `pnpm build` / `pnpm test`, `pnpm data` with the Overpass query and the 90 s timeout note, how to edit `src/categories.ts` (colour, style, adding a category), attribution (© OpenStreetMap contributors, OpenFreeMap), and the manual QA checklist from the spec.

- [ ] **Step 2: Add the typecheck script and run the full gate**

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: no TypeScript errors, all tests pass, `dist/` produced.

- [ ] **Step 3: Run the manual checklist**

- Top view fits at 1280×800, 1440×900 and 1920×1080 with no page scroll.
- Right-drag rotates and tilts, and stops at 60°.
- Free view enters at the drone vantage, WASD/QE/mouse work, `Esc` frees the cursor, clicking re-locks.
- Hover and click on a named place, an unnamed park, and an unnamed shop all read correctly.
- Every category colour is distinguishable on the dark basemap.
- Blocking tiles shows the error overlay and Retry recovers.
- Reduced motion removes the transitions.

- [ ] **Step 4: Deploy to Vercel**

```bash
pnpm dlx vercel --prod
```

Framework preset: Vite. Build `pnpm build`, output `dist`. No environment variables. Confirm the production URL loads the map and the attribution.

- [ ] **Step 5: Commit and tag**

```bash
git add README.md package.json
git commit -m "docs: README, QA checklist and deploy notes"
git tag v1.0.0
```

---

## Self-review notes

- **Spec coverage:** stack (T1), layout (T1, T12), data pipeline (T4), categories (T3), rendering (T6), labels (T6), basemap (T5), camera top (T9), camera free (T8, T10), transitions (T11), UI (T12–T14), guardrails (T2, T9), performance (T4, T6), testing (all), deployment (T16). Every spec section maps to at least one task.
- **Review Focus tests:** unnamed areas → T7; WebGL missing → T5 + T13; pointer lock refused → T11; tile failure → T13; resize → T9.
- **Type consistency:** `PlaceProps` (T4) is consumed by `describePlace` (T7); `CategoryId` (T3) flows through T4, T6 and T7; `Player` and `InputState` (T8) are consumed by T10 and T11; `mapStatus` is added in T13 and used by T5's error path.
- **Deliberately open:** exact hex contrast tuning, free-view entry heading, collision, hover implementation detail. These are the spec's builder decisions.
