# Flat Outlines and English Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the campus overview quieter: calmer rotation, no controls card, flat building outlines with category-coloured hover fills, non-interactive context buildings, and English generated copy.

**Architecture:** Keep the single MapLibre overview and its committed GeoJSON. Replace the three building extrusion layers with two flat `line` layers (categorised and neutral context), recolour the shared hover source by category, exclude the context layer from interaction queries, delete the controls card and its copy, and scale the inverted rotation handler by 0.5. No new dependencies, data pipeline changes beyond four label strings, or server-side pieces.

**Tech Stack:** Vite 6 · React 19 · TypeScript 5.7 · Tailwind CSS 4 · MapLibre GL JS 5 · Zustand 5 · Vitest 3.

**Spec:** `docs/superpowers/specs/2026-11-22-flat-outlines-and-english-design.md`

## Global Constraints

- Desktop only; the page never scrolls; root stays `h-dvh overflow-hidden`.
- Static Vercel deployment; no API keys, environment variables, server functions or runtime Overpass calls.
- `src/data/places.geojson` stays committed; only the four `genericLabel` string values change.
- Fixed palette from `src/categories.ts`; no legend, edit mode, new categories or text input.
- Rotation continues to mirror MapLibre's native math and negate bearing; only its gain changes.
- Proper names from OpenStreetMap are never translated.

## Review Focus

- A neutral context building must never produce a tooltip, info card or pointer cursor — Task 4 pins the interaction layer list in a test and Chrome checks hover on a dark footprint.
- Buildings at rest must have no solid or translucent fill of any kind — Task 3 asserts no `fill-extrusion` layer exists and the two building layers are `line` layers.
- Hover fill must use the hovered feature's border colour, not white — Task 3 asserts the hover layers' colour expressions contain every category colour and 0.35 opacity.
- Rotation sensitivity must drop in both the linear and angular branches, not just one — Task 1 tests a 50 px horizontal drag, a far-from-centre angular drag and a Chrome bearing read.
- English generation must include the committed data, not only the source table — Task 5 checks `categories.ts` and `places.geojson` label values.

---

### Task 1: Halve rotation sensitivity

**Files:**
- Modify: `src/camera/invertRotation.ts`, `src/camera/invertRotation.test.ts`

**Interfaces:**
- Consumes: `rotationDelta(last, current, center)` and the current 8 unit tests.
- Produces: same signatures, with bearing deltas at 0.5× the previous magnitude and pitch unchanged.

- [ ] **Step 1: Write the failing tests.** In `invertRotation.test.ts`, change the expected bearing values:
  - 50 px below centre (`{x:500,y:350}` → `{x:550,y:350}`): `bearingDelta: -20`, `pitchDelta: 0`.
  - 50 px above centre (`{x:500,y:250}` → `{x:550,y:250}`): `bearingDelta: 20`.
  - Far-from-centre angular case (`{x:500,y:500}` → `{x:700,y:500}`): `bearingDelta` close to `-22.5`.
  - Integration right-drag above centre: `bearing: 20`; ctrl-drag below centre after `setBearing(0)`: `bearing: -20`.
  - Click-tolerance case 20 px below centre: `bearing: -8`.
- [ ] **Step 2: Run `pnpm test src/camera/invertRotation.test.ts` and confirm the five bearing assertions fail.**
- [ ] **Step 3: In `invertRotation.ts`, add `const ROTATION_SENSITIVITY = 0.5` and multiply the returned `bearingDelta` by it in `rotationDelta`.** Leave `nativeBearingDelta`, the pitch gain, thresholds and listeners untouched.
- [ ] **Step 4: Run `pnpm test src/camera/invertRotation.test.ts` and confirm all 8 tests pass.**
- [ ] **Step 5: Commit:** `git add src/camera && git commit -m "fix(camera): halve rotation sensitivity"`

### Task 2: Delete the controls card

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`
- Delete: `src/ui/ControlsCard.tsx`, `src/ui/theme.test.tsx`, `src/ui/copy.ts`, `src/ui/copy.test.ts`

**Interfaces:**
- Consumes: `App` currently renders `<ControlsCard />`; `App.test` already asserts shell classes.
- Produces: `App` renders only `MapCanvas`, `TitleBlock`, `Tooltip`, `InfoCard` inside the shell; no `controlsFor` export remains.

- [ ] **Step 1: Write the failing test.** Add to `src/App.test.tsx`: `expect(screen.queryByTestId('controls-card')).not.toBeInTheDocument()`.
- [ ] **Step 2: Run `pnpm test src/App.test.tsx` and confirm it fails while the card is rendered.**
- [ ] **Step 3: Remove the import and render of `ControlsCard` from `App.tsx`, then delete the four listed files.**
- [ ] **Step 4: Run `pnpm test src/App.test.tsx` and confirm it passes.**
- [ ] **Step 5: Commit:** `git add -A src && git commit -m "refactor: remove the controls panel"`

### Task 3: Flat building borders and category-coloured hover

**Files:**
- Modify: `src/map/layers.ts`, `src/map/layers.test.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `categoryColorExpression()`, `PLACES_SOURCE_ID`, `HOVER_SOURCE_ID`.
- Produces: layer IDs `places-buildings` (line, categorised buildings), `places-buildings-context` (line, `category: null`, neutral `#2a303b`), unchanged area/point/label IDs, and recoloured `places-hover-fill`, `places-hover-line`, `places-hover-point`. `buildingColorExpression`, `shadeByHeight` and `shade` are no longer exported.

- [ ] **Step 1: Write the failing tests.** Replace `LAYER_IDS` in `layers.test.ts` with the new ordered list: `places-buildings`, `places-buildings-context`, `places-areas-fill`, `places-areas-outline-tint`, `places-areas-outline`, `places-points`, `places-hover-fill`, `places-hover-line`, `places-hover-point`, `places-labels`. Replace the height-shading test with:
  ```ts
  it('renders every building as a flat border, never a filled volume', () => {
    const layers = placesLayers()
    expect(layers.some((l) => l.type === 'fill-extrusion')).toBe(false)
    for (const id of ['places-buildings', 'places-buildings-context']) {
      expect(layers.find((l) => l.id === id)?.type).toBe('line')
    }
  })
  ```
  Add:
  ```ts
  it('colours hover fills and outlines with the category palette', () => {
    const flat = JSON.stringify(placesLayers().filter((l) => l.id.startsWith('places-hover')))
    for (const c of CATEGORIES) expect(flat).toContain(c.color)
    expect(flat).toContain('0.35')
    expect(flat).not.toContain('#ffffff')
  })
  ```
  And assert the context layer's `line-color` is `#2a303b` and its filter includes `building`.
- [ ] **Step 2: Run `pnpm test src/map/layers.test.ts` and confirm the new tests fail.**
- [ ] **Step 3: Rewrite `placesLayers()` in `src/map/layers.ts`.** Use one `line` layer filtered to `geometryType: 'building'` plus `['has','category']` with `colorExpr`, width 3, opacity 0.9; one `line` layer filtered to `geometryType: 'building'` plus `['!',['has','category']]` with `#2a303b`, width 2, opacity 0.6; keep area/point/label layers as-is; set hover fill/line/point colours to `colorExpr` with fill opacity 0.35 and remove the white highlight constants. Delete `buildingColorExpression` and its private helpers.
- [ ] **Step 4: Run `pnpm test src/map/layers.test.ts` and confirm all tests pass.**
- [ ] **Step 5: Commit:** `git add src/map && git commit -m "feat(map): draw buildings as flat category borders"`

### Task 4: Make context buildings non-interactive

**Files:**
- Modify: `src/map/layers.ts`, `src/map/createMap.ts`, `src/places/describePlace.ts`, `src/places/describePlace.test.ts`

**Interfaces:**
- Consumes: Task 3's layer IDs and `HOVER_SOURCE_ID`.
- Produces: exported `INTERACTIVE_LAYER_IDS: string[]` from `src/map/layers.ts`, used by `createMap`; `describePlace` no longer emits `Unnamed building` or `Building`.

- [ ] **Step 1: Write the failing tests.** In `layers.test.ts` add `INTERACTIVE_LAYER_IDS` to the import and:
  ```ts
  it('never treats neutral context buildings as interactive', () => {
    expect(INTERACTIVE_LAYER_IDS).toContain('places-buildings')
    expect(INTERACTIVE_LAYER_IDS).not.toContain('places-buildings-context')
    expect(INTERACTIVE_LAYER_IDS).not.toContain('places-hover-fill')
  })
  ```
  In `describePlace.test.ts`, replace the null-category test with:
  ```ts
  it('does not invent a type for a category-less feature', () => {
    const p = { ...base, category: null, geometryType: 'building' } as const
    const summary = describePlace({ ...p })
    expect(JSON.stringify(summary)).not.toContain('Unnamed building')
    expect(JSON.stringify(summary)).not.toContain('Building')
  })
  ```
- [ ] **Step 2: Run `pnpm test src/map/layers.test.ts src/places/describePlace.test.ts` and confirm both new tests fail.**
- [ ] **Step 3: Export `INTERACTIVE_LAYER_IDS` from `src/map/layers.ts`** as `['places-buildings', 'places-areas-fill', 'places-areas-outline-tint', 'places-points']`. In `createMap.ts`, import it and replace the local `interactiveLayerIds` array. In `describePlace.ts`, set `categoryLabel` to `cat?.label ?? ''`, build `meta` from that value only when it is non-empty, and let the title fall back to `p.name ?? ''` with no `Unnamed building` branch.
- [ ] **Step 4: Run `pnpm test src/map/layers.test.ts src/places/describePlace.test.ts` and confirm all tests pass.**
- [ ] **Step 5: Commit:** `git add src/map src/places && git commit -m "fix(map): keep context buildings out of interaction"`

### Task 5: English generated copy, docs and final gate

**Files:**
- Modify: `src/categories.ts`, `src/categories.test.ts`, `src/data/places.geojson`, `AGENTS.md`, `README.md`
- Create/modify: the design doc's status line if approval changed it.

**Interfaces:**
- Consumes: the finished single-mode app from Tasks 1–4.
- Produces: only English generated labels in source and committed data; docs describing the new visuals.

- [ ] **Step 1: Write the failing tests.** In `categories.test.ts`, change the generic-label test to expect `Park`, `Pitch`, `Parking`, `Construction`; add a test that reads `src/data/places.geojson` via `readFileSync` and asserts its `genericLabel` values are a subset of `['Park','Pitch','Parking','Construction']`.
- [ ] **Step 2: Run `pnpm test src/categories.test.ts` and confirm the new expectations fail.**
- [ ] **Step 3: Change the four `genericLabel` values in `src/categories.ts` and the four matching values in `src/data/places.geojson` (4 features, 5 features, 2 features and 2 features respectively) to English.**
- [ ] **Step 4: In `AGENTS.md`, update the hard rules and gotchas for flat borders, non-interactive context buildings, category hover fills, halved bearing and no controls card; add the new design to "Read first". In `README.md`, update the intro and QA checklist the same way, replacing all Spanish label examples.**
- [ ] **Step 5: Run the full gate:** `pnpm typecheck && pnpm test && pnpm build`. Expected: all pass; the MapLibre >500 kB chunk warning is non-blocking.
- [ ] **Step 6: Final Chrome check** at 1280×800, 1440×900 and 1920×1080: no scrollbars, no controls card, category buildings show coloured flat outlines and neutral buildings show dark outlines, hovering a category building fills it with its border colour, hovering a neutral building shows no tooltip/cursor change, unnamed areas show English labels, rotation is visibly calmer with no console errors, and a click still opens the info card.
- [ ] **Step 7: Commit:** `git add AGENTS.md README.md src docs && git commit -m "docs: align guidance with the flat English overview"`
