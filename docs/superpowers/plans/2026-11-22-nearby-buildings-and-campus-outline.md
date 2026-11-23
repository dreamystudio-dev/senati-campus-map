# Nearby Buildings and Quiet Campus Outline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real nearby buildings to the current map frame and make the large SENATI education polygon a faint outline instead of a dominant blue fill, without changing the camera.

**Architecture:** The category table controls whether an area gets the 30% fill layer or the 12% tint plus 2.5 px outline layers; changing `education` to `outline` demotes the campus polygon without a per-feature special case. The fetch script's Overpass bbox is widened build-time and the result is committed as `src/data/places.geojson`; map options and campus bounds stay untouched.

**Tech Stack:** Vite 6 · React 19 · TypeScript 5.7 · MapLibre GL JS 5 · Vitest 3 · Node `fs` · Overpass API.

**Spec:** `docs/superpowers/specs/2026-11-22-nearby-buildings-and-campus-outline-design.md`

## Global Constraints

- Desktop only; the page never scrolls.
- Static Vercel hosting: no API keys, server functions, env vars or runtime Overpass calls.
- Current fetch box: `-12.0018,-77.0635,-11.9965,-77.0575`.
- New fetch box: `-12.00361,-77.06533,-11.99469,-77.05567` (approximately 200 m beyond each edge; builder may adjust by up to 50 m per side based on the live response).
- Keep `campus.json` center, bounds, `mapOptions()` and `fitCampus()` unchanged.
- No fabricated footprints and no conversion of the 16 POI dots into fake buildings; those dots stay as dots.
- Education areas use the existing `outline` mark style: 12% tint and 2.5 px border, never the 30% solid fill.
- Fixed palette, closed 12-category table, no legend, no edit mode and no user text input.
- Categorised buildings stay flat category-coloured borders; `category: null` buildings stay neutral dark borders with no label, tooltip, info card or pointer cursor.
- Generated copy stays English; OSM proper names stay unchanged.
- `pnpm data` is build-time only; the refreshed GeoJSON must be committed.
- `.codegraph/` is untracked local state and must never be committed.

## Review Focus

- A very large category area must not paint the campus as a solid block — pinned by the education `outline` style test in Task 1 Step 1.
- The fetch box must actually extend beyond the campus frame — pinned by the `PLACES_BBOX` test in Task 2 Step 1.
- The committed dataset must contain materially more real buildings than the campus-only fetch — pinned by the building-count test in Task 2 Step 1.
- The camera frame must not drift while the data grows — checked in Chrome in Task 2 Step 8 against the unchanged campus bounds.
- Existing hover, context-building and no-scroll rules must survive the style/data change — checked by the full gate in Task 2 Step 7 and Chrome in Task 2 Step 8.

---

## File Structure

- `src/categories.ts` — category table; change `education.style` from `fill` to `outline`.
- `src/categories.test.ts` — focused assertion for the education style decision.
- `scripts/fetch-places.ts` — build-time Overpass fetch; export the bbox constant and use it in the query.
- `scripts/fetch-places.test.ts` — bbox and committed-data assertions.
- `src/data/places.geojson` — refreshed build-time data, committed.
- `docs/superpowers/specs/2026-11-22-nearby-buildings-and-campus-outline-design.md` — approved design, already committed.

### Task 1: Demote education areas to a faint outline

**Files:**
- Modify: `src/categories.ts`
- Test: `src/categories.test.ts`

**Interfaces:**
- Consumes: `CATEGORY_BY_ID` from `src/categories.ts`.
- Produces: `CATEGORY_BY_ID.education.style === 'outline'`. `src/map/layers.ts` derives `FILL_IDS` and `OUTLINE_IDS` from this table, so no layer code changes.

- [ ] **Step 1: Write the failing test.** In `src/categories.test.ts`, add:

```ts
it('draws education areas as a faint outline, not a solid fill', () => {
  expect(CATEGORY_BY_ID.education.style).toBe('outline')
})
```

- [ ] **Step 2: Run the focused test and confirm RED.**

Run: `pnpm test src/categories.test.ts`

Expected: FAIL with `expected 'fill' to be 'outline'`.

- [ ] **Step 3: Implement the minimal style change.** In `src/categories.ts`, change the `education` category's `style` from `'fill'` to `'outline'`. Keep its id, label, colour and `matches` unchanged.

- [ ] **Step 4: Run the focused test and confirm GREEN.**

Run: `pnpm test src/categories.test.ts`

Expected: PASS, all category tests green.

- [ ] **Step 5: Run the full test suite.**

Run: `pnpm test`

Expected: PASS. The layer tests should now classify education areas with the outline/tint layers automatically; if any test hard-codes education as a fill, update that expectation to `outline`.

- [ ] **Step 6: Commit.**

```bash
git add src/categories.ts src/categories.test.ts
git commit -m "style(map): draw education areas as faint outlines"
```

### Task 2: Widen the fetch box and commit nearby real buildings

**Files:**
- Modify: `scripts/fetch-places.ts`
- Modify: `src/data/places.geojson`
- Test: `scripts/fetch-places.test.ts`

**Interfaces:**
- Consumes: the unchanged `transformOverpass()` transform and `src/data/campus.json`.
- Produces: exported `PLACES_BBOX: string` used by `runFetch()`, and a refreshed committed `places.geojson` with more than 120 building features.

- [ ] **Step 1: Write the failing tests.** In `scripts/fetch-places.test.ts`, add `readFileSync` from `node:fs` to the imports, add `PLACES_BBOX` to the `./fetch-places` import, and add:

```ts
it('fetches a wider box than the campus frame', () => {
  const [south, west, north, east] = PLACES_BBOX.split(',').map(Number)
  expect(south).toBeLessThan(-12.003)
  expect(west).toBeLessThan(-77.065)
  expect(north).toBeGreaterThan(-11.995)
  expect(east).toBeGreaterThan(-77.056)
})

it('commits more real buildings than the original campus-only fetch', () => {
  const data = JSON.parse(readFileSync('src/data/places.geojson', 'utf8')) as {
    features: Array<{ properties: { geometryType?: string } }>
  }
  const buildings = data.features.filter((f) => f.properties.geometryType === 'building')
  expect(buildings.length).toBeGreaterThan(120)
})
```

- [ ] **Step 2: Run the focused tests and confirm RED.**

Run: `pnpm test scripts/fetch-places.test.ts`

Expected: FAIL because `PLACES_BBOX` is not exported yet and the committed dataset still has only 98 buildings.

- [ ] **Step 3: Export and use the new bbox.** In `scripts/fetch-places.ts`, add near the top:

```ts
export const PLACES_BBOX = '-12.00361,-77.06533,-11.99469,-77.05567'
```

Replace the local `const bbox = '...'` in `runFetch()` with `const bbox = PLACES_BBOX`. Leave the query shape, endpoints, timeout and transform unchanged.

- [ ] **Step 4: Run the focused tests again.**

Run: `pnpm test scripts/fetch-places.test.ts`

Expected: the bbox test passes; the building-count test still FAILS until the data is refreshed.

- [ ] **Step 5: Refresh the committed GeoJSON.**

Run: `pnpm data`

Expected: the script fetches the wider box and writes `src/data/places.geojson`. If all live endpoints fail, save a raw Overpass JSON response to `/tmp/opencode/overpass-nearby.json` and run `pnpm data --from-file /tmp/opencode/overpass-nearby.json` instead. Do not hand-edit the GeoJSON.

Then run: `pnpm test scripts/fetch-places.test.ts`

Expected: PASS, with more than 120 building features committed.

- [ ] **Step 6: Run the focused style test too.**

Run: `pnpm test src/categories.test.ts scripts/fetch-places.test.ts`

Expected: PASS.

- [ ] **Step 7: Run the full gate.**

Run: `pnpm typecheck && pnpm test && pnpm build`

Expected: PASS. The existing MapLibre >500 kB bundle warning is non-blocking.

- [ ] **Step 8: Final Chrome check.** With the dev server running, check 1280×800, 1440×900 and 1920×1080 in Chrome:

- No page scrollbars and no controls card.
- The campus polygon is in `places-areas-outline-tint`/`places-areas-outline`, not `places-areas-fill`; its paint is 0.12 tint and 2.5 px outline.
- Nearby building borders are visible around the frame edges.
- Categorised building hover still fills at 0.35 opacity with the category colour; context buildings still show no tooltip, card or pointer cursor.
- No page or console errors.

- [ ] **Step 9: Commit.**

```bash
git add scripts/fetch-places.ts scripts/fetch-places.test.ts src/data/places.geojson
git commit -m "feat(data): include nearby buildings around campus"
```
