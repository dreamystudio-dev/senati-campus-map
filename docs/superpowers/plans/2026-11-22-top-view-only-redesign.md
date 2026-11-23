# Top-view-only redesign Implementation Plan

> **Completed:** all five tasks were implemented and verified on `main` (commits `f785542..6bc1c36`, plus the rotation review fix). Checkboxes below are the original execution record.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the first-person Free mode entirely and leave one always-on 3D campus overview with inverted rotation, unrestricted panning and a much lower zoom floor.

**Architecture:** Delete the mode state machine and every first-person/pointer-lock module; MapLibre's own camera becomes the sole owner. Static limits are set once in `mapOptions` (no `maxBounds`, `renderWorldCopies: true`, `minZoom: 12`). MapLibre's native drag-rotate is replaced by a small canvas handler that negates the bearing delta while retaining the pitch delta, registered for the lifetime of the map.

**Tech Stack:** Vite 6 · React 19 · TypeScript 5.7 · Tailwind 4 · MapLibre GL JS 5 · Zustand 5 · Vitest 3 + jsdom.

**Spec:** `docs/superpowers/specs/2026-11-22-top-view-only-redesign-design.md`

## Global Constraints

- Desktop only. No mobile or touch layout work.
- The page never scrolls. Root element is `h-dvh overflow-hidden`.
- Static hosting only. No API keys, no environment variables, no server functions, no runtime Overpass calls.
- Closed category table; `src/data/places.geojson` stays committed and unchanged.
- Fixed palette: sky `#5aa9e6`, coral `#ef6f6c`, amber `#f2b134`, violet `#9b7ede`, lime `#8bc34a`, teal `#2ec4b6`, pink `#e56b9f`, bone `#e8e2d6`, orange `#f08a3c`, slate `#6b7a8f`.
- Single camera owner: no pointer lock, WASD, eye-height state, `flyTo`/`easeTo` transitions or per-mode limits.
- Keep the initial/resize `fitCampus`, hover, tooltip, info card, self-hosted Inter font and OSM/OpenFreeMap attribution.
- Static camera caps: `minZoom: 12`, `maxZoom: 19.5`, `maxPitch: 60`, `centerClampedToGround: true`.
- Conventional Commits. Every task ends green: `pnpm typecheck && pnpm test && pnpm build`.

## Review Focus

- **Right-drag and Ctrl-drag direction** — rotating must turn the opposite way to today, exactly once per drag. Test: `rotationDelta` unit test plus `installInvertedRotation` fake-map test in Task 4, and a real right-drag/Ctrl-drag Chrome check there.
- **Pitch while rotating** — tilting must still work and stay inside 0–60° after the native rotate handler is disabled. Test: `rotationDelta` pitch assertion and clamped `jumpTo` assertion in Task 4, plus the Chrome drag check.
- **Panning beyond the campus** — no snap-back and no blank void now that `maxBounds` is gone. Test: `mapOptions` assertion (`maxBounds` undefined, `renderWorldCopies` true) in Task 3, plus a Chrome drag-past-bounds check there.
- **Zoom-out floor** — wheel-out stops at neighbourhood scale (12), never at the old 15.5, and `fitZoom` agrees. Test: `options.test.ts` and `bounds.test.ts` lower-clamp assertions in Task 3, plus a Chrome wheel check.
- **Hover/selection and resize after the removals** — dropping the pointer-lock guards and the mode-subscribed fit hook must not break interaction or the fitted view. Test: `App.test.tsx` / `a11y.test.tsx` in Tasks 1–2 plus Chrome hover/click and three-viewport resize checks in Task 5.

---

### Task 1: Delete the Free-mode camera and switch UI

**Files:**
- Modify: `src/App.tsx`, `src/map/MapCanvas.tsx`, `src/map/createMap.ts`, `src/App.test.tsx`, `src/ui/a11y.test.tsx`
- Delete: `src/ui/ModeSwitch.tsx`, `src/camera/player.ts`, `src/camera/player.test.ts`, `src/camera/input.ts`, `src/camera/input.test.ts`, `src/camera/transition.ts`, `src/camera/transition.test.ts`, `src/camera/useFreeView.ts`, `src/camera/useFreeView.test.tsx`, `src/camera/useModeTransition.ts`, `src/camera/useModeTransition.test.tsx`

**Interfaces:**
- Consumes: `useAppStore` unchanged from the current code, `fitCampus` from `src/map/options.ts`.
- Produces: `<MapCanvas />` with no props; `App` renders no mode group and no Free button. `src/camera/useTopView.ts` still exists for now and still fits on map load.

- [ ] **Step 1: Write the failing App assertion**

```tsx
// src/App.test.tsx
expect(screen.queryByRole('group', { name: /camera mode/i })).not.toBeInTheDocument()
expect(screen.queryByRole('button', { name: /^free$/i })).not.toBeInTheDocument()
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm test src/App.test.tsx`
Expected: FAIL — the `Camera mode` group and `Free` button are present.

- [ ] **Step 3: Remove the Free-mode UI and camera wiring**

In `src/App.tsx`: drop the `useRef`/`useState` imports, `map` state, `playerRef`, `useModeTransition`, `FREE_VANTAGE`, `ModeSwitch`, the screen-reader live region, and the `playerRef`/`onMapLoaded` props. Final tree is `MapCanvas`, `TitleBlock`, `ControlsCard`, `Tooltip`, `InfoCard` inside the shell div.

In `src/map/MapCanvas.tsx`: remove `useFreeView`, `type PlayerRef`, `onMapLoaded`, `onMapLoadedRef` and the `playerRef` prop; keep `useTopView(mapInstance)`, the imperative `getMap` handle, retry, resize handling and the focus-ring canvas.

In `src/map/createMap.ts`: remove the `requestPointerLockSafe` import, both `if (state.mode === 'free' && state.locked) return` guards, and the click handler's empty-canvas re-lock block (lines 163–170). Hover and selection then always run.

In `src/ui/a11y.test.tsx`: delete the `ModeSwitch` keyboard test and the now-unused `userEvent` import; keep the store `beforeEach` and the two InfoCard tests unchanged for now.

Delete the files listed above.

- [ ] **Step 4: Run the gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all pass. `src/ui/copy.ts`, `ControlsCard`, `Tooltip`, `store.ts`, `options.ts` and `useTopView.ts` still reference mode fields, which still exist.

- [ ] **Step 5: Commit**

```bash
git add -A src && git commit -m "refactor: remove first-person camera and mode switch"
```

---

### Task 2: Strip mode state from the store and overlays

**Files:**
- Modify: `src/store.ts`, `src/ui/copy.ts`, `src/ui/copy.test.ts`, `src/ui/ControlsCard.tsx`, `src/ui/Tooltip.tsx`, `src/ui/a11y.test.tsx`, `src/ui/theme.test.tsx`, `src/store.test.ts`, `src/map/MapCanvas.tsx`, `src/map/options.ts`, `src/map/options.test.ts`
- Delete: `src/camera/useTopView.ts`

**Interfaces:**
- Consumes: nothing from Task 1 beyond the current `MapCanvas`.
- Produces: `useAppStore` with exactly `mapStatus`, `mapError`, `hoveredId`, `selectedId`, `hoverPosition`, `setMapStatus`, `setHovered`, `select`. `controlsFor(): string[]` returns `['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate and tilt']`. `mapOptions` no longer exports `applyCameraLimits`; `fitCampus` is called directly from `MapCanvas`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/ui/copy.test.ts — replace the file
import { controlsFor } from './copy'

it('describes the only camera mode', () => {
  expect(controlsFor()).toEqual(['Drag to pan', 'Scroll to zoom', 'Right-drag to rotate and tilt'])
})
```

```ts
// src/store.test.ts — replace the file
beforeEach(() => useAppStore.setState({
  mapStatus: 'loading', mapError: null,
  hoveredId: null, hoverPosition: null, selectedId: null,
}))

it('selects and clears a place', () => {
  useAppStore.getState().select('way/1')
  expect(useAppStore.getState().selectedId).toBe('way/1')
  useAppStore.getState().select(null)
  expect(useAppStore.getState().selectedId).toBeNull()
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

In `src/ui/a11y.test.tsx` and `src/ui/theme.test.tsx`, delete `mode`, `locked`, `lockRefused` and `transitioning` from the `setState` calls.

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `pnpm test src/ui/copy.test.ts src/store.test.ts`
Expected: FAIL — `controlsFor` still takes mode/lock arguments and the store still has mode actions.

- [ ] **Step 3: Implement the single-mode store and overlays**

`src/store.ts`: delete `CameraMode`, `mode`, `locked`, `lockRefused`, `transitioning`, all four setters, and their initial values.

`src/ui/copy.ts`: no imports; export `controlsFor(): string[]` returning the three pinned strings.

`src/ui/ControlsCard.tsx`: remove all store subscriptions; render the fixed header `Controls · Campus map` and `controlsFor()`; keep the panel styles and `THEME` usage.

`src/ui/Tooltip.tsx`: remove `mode`/`locked` subscriptions and reduce the guard to `if (!hoveredId || !hoverPosition) return null`.

`src/map/options.ts`: remove the `CameraMode` import, `FREE_VIEW_LIMITS`, `CameraLimitTarget` and `applyCameraLimits`. Keep `TOP_VIEW_LIMITS`, `mapOptions` and `fitCampus` exactly as they are for now.

`src/map/options.test.ts`: delete `recordingMap` and the two `applyCameraLimits` tests; keep the first test unchanged for now.

`src/map/MapCanvas.tsx`: remove `useTopView`; in the `createMap(...).then(map => ...)` callback, after `setMapInstance(map)`, fit once — `if (map.isStyleLoaded()) fitCampus(map); else map.once('load', () => fitCampus(map))`. Keep the resize-observer `fitCampus` call. Delete `src/camera/useTopView.ts`.

- [ ] **Step 4: Run the gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all pass. The 25 tests in the five deleted camera test files are gone; Task 2 adds the replacement store/copy tests.

- [ ] **Step 5: Commit**

```bash
git add -A src && git commit -m "refactor: make the campus overview the only camera mode"
```

---

### Task 3: Unrestrict panning and widen zoom-out

**Files:**
- Modify: `src/map/options.ts`, `src/map/options.test.ts`, `src/map/bounds.ts`, `src/map/bounds.test.ts`

**Interfaces:**
- Consumes: `CAMPUS` and `fitZoom` from `src/map/bounds.ts`.
- Produces: `mapOptions` with `minZoom: 12`, no `maxBounds`, `renderWorldCopies: true`; `fitZoom` clamped to `[12, 19.5]`; `paddedBounds` no longer exported.

- [ ] **Step 1: Write the failing tests**

```ts
// src/map/options.test.ts — replace the existing test
it('uses one static, unrestricted overview configuration', () => {
  const o = mapOptions({ width: 1280, height: 800 })
  expect(o.minZoom).toBe(12)
  expect(o.maxZoom).toBe(19.5)
  expect(o.maxPitch).toBe(60)
  expect(o.centerClampedToGround).toBe(true)
  expect(o.renderWorldCopies).toBe(true)
  expect(o.maxBounds).toBeUndefined()
  expect(o.zoom).toBeGreaterThan(12)
})
```

```ts
// src/map/bounds.test.ts — replace the paddedBounds test with a lower clamp test
it('clamps to the widened zoom range', () => {
  expect(fitZoom([-77.0606, -11.9997, -77.0605, -11.9996], { width: 1280, height: 800 }, 0)).toBe(19.5)
  expect(fitZoom([-79, -14, -75, -10], { width: 1280, height: 800 }, 0)).toBe(12)
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `pnpm test src/map/options.test.ts src/map/bounds.test.ts`
Expected: FAIL on `minZoom` (15.5), `renderWorldCopies` (false), `maxBounds` defined, and the lower clamp.

- [ ] **Step 3: Implement the static limits**

`src/map/options.ts`: set `TOP_VIEW_LIMITS.minZoom` to `12`; delete `paddedBounds` from the import and the `maxBounds` option; set `renderWorldCopies: true`.

`src/map/bounds.ts`: delete `paddedBounds` and change the return clamp to `Math.min(19.5, Math.max(12, Number(zoom.toFixed(4))))`.

`src/map/bounds.test.ts`: drop the `paddedBounds` import and test; keep the two fit tests and the new clamp test.

- [ ] **Step 4: Run the gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all pass.

- [ ] **Step 5: Chrome check**

With the dev server on `http://localhost:5199/`, drag the map well past the campus box in every direction and scroll out to the floor. Expect no snap-back, no blank void at the edges, and zoom-out stopping at neighbourhood scale. Record the result in the commit message.

- [ ] **Step 6: Commit**

```bash
git add src/map && git commit -m "fix(map): unbound panning and widen zoom-out to 12"
```

---

### Task 4: Invert drag rotation while retaining tilt

**Files:**
- Create: `src/camera/invertRotation.ts`, `src/camera/invertRotation.test.ts`
- Modify: `src/map/createMap.ts`

**Interfaces:**
- Consumes: a MapLibre `Map` (needs `dragRotate.disable()`, `getCanvas()`, `getBearing()`, `getPitch()`, `jumpTo()`).
- Produces: `rotationDelta(last: { x: number; y: number }, current: { x: number; y: number }): { bearingDelta: number; pitchDelta: number }` and `installInvertedRotation(map: Map): () => void`. The constants are `0.8` degrees/px for bearing and `-0.5` degrees/px for pitch, matching MapLibre 5's defaults except for the bearing sign.

- [ ] **Step 1: Write the failing tests**

```ts
// src/camera/invertRotation.test.ts
import { installInvertedRotation, rotationDelta } from './invertRotation'

it('negates horizontal bearing delta and keeps the pitch delta', () => {
  expect(rotationDelta({ x: 100, y: 100 }, { x: 150, y: 80 })).toEqual({
    bearingDelta: -40,
    pitchDelta: 10,
  })
})

function setup() {
  const canvas = document.createElement('canvas')
  document.body.appendChild(canvas)
  const jumpTo = vi.fn()
  let bearing = 0
  let pitch = 0
  const map = {
    dragRotate: { disable: vi.fn() },
    getCanvas: () => canvas,
    getBearing: () => bearing,
    getPitch: () => pitch,
    jumpTo: (o: { bearing?: number; pitch?: number }) => {
      jumpTo(o)
      if (o.bearing !== undefined) bearing = o.bearing
      if (o.pitch !== undefined) pitch = o.pitch
    },
  }
  const uninstall = installInvertedRotation(map as never)
  const drag = (from: { x: number; y: number }, to: { x: number; y: number }, init: MouseEventInit = {}) => {
    canvas.dispatchEvent(new MouseEvent('mousedown', { button: 2, clientX: from.x, clientY: from.y, bubbles: true, ...init }))
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: to.x, clientY: to.y, bubbles: true }))
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
  }
  return { canvas, map, jumpTo, uninstall, drag }
}

it('takes over right-drag and ctrl+left-drag from MapLibre', () => {
  const { map, jumpTo, drag } = setup()
  expect(map.dragRotate.disable).toHaveBeenCalledOnce()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 })
  expect(jumpTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: -40, pitch: 5 }))
  jumpTo.mockClear()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 }, { button: 0, ctrlKey: true })
  expect(jumpTo).toHaveBeenCalledWith(expect.objectContaining({ bearing: -80, pitch: 10 }))
})

it('ignores plain left-drag, suppresses the context menu and cleans up', () => {
  const { canvas, jumpTo, uninstall, drag } = setup()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 }, { button: 0 })
  expect(jumpTo).not.toHaveBeenCalled()
  expect(canvas.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))).toBe(false)
  uninstall()
  drag({ x: 100, y: 100 }, { x: 150, y: 90 })
  expect(jumpTo).not.toHaveBeenCalled()
})
```

Note: the second drag in the `ctrl+left` test expects accumulated pitch because the fake map keeps state; the handler clamps pitch to `[0, 60]` and bearing through `map.getBearing() + bearingDelta`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm test src/camera/invertRotation.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the handler**

`src/camera/invertRotation.ts`: `rotationDelta` returns `{ bearingDelta: -(current.x - last.x) * 0.8, pitchDelta: -(current.y - last.y) * 0.5 }`. `installInvertedRotation` calls `map.dragRotate.disable()`, adds `mousedown` on `map.getCanvas()` and `mousemove`/`mouseup` on `window`; it activates only for `button === 2` or (`button === 0 && ctrlKey`), tracks the last point, calls `map.jumpTo({ bearing: map.getBearing() + delta.bearingDelta, pitch: Math.max(0, Math.min(60, map.getPitch() + delta.pitchDelta)) })` on each move, and prevents the canvas `contextmenu`. Return a cleanup that removes all listeners.

`src/map/createMap.ts`: import `installInvertedRotation` and, immediately after `new Map({...})`, register `map.once('remove', installInvertedRotation(map))`.

- [ ] **Step 4: Run the gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all pass.

- [ ] **Step 5: Chrome check**

In the running page, drag right with the right button and with Ctrl+left, then drag up/down. Expect the map to spin the opposite way to the previous build, tilt to respond and stop at 60°, no browser context menu, hover/tooltip/selection to still work, and no console errors.

- [ ] **Step 6: Commit**

```bash
git add src/camera src/map/createMap.ts && git commit -m "fix(camera): invert rotation without losing tilt"
```

---

### Task 5: Update the docs and run the final gate

**Files:**
- Modify: `AGENTS.md`, `README.md`, `PLAN.md`, `docs/superpowers/specs/2026-11-21-campus-map-design.md`

**Interfaces:**
- Consumes: the finished single-mode app.
- Produces: documentation that no longer promises modes, pointer lock, bounded pan or 15.5 zoom.

- [ ] **Step 1: Mark the old camera spec and plan as superseded**

At the top of `docs/superpowers/specs/2026-11-21-campus-map-design.md` and `PLAN.md`, add a short block pointing to `docs/superpowers/specs/2026-11-22-top-view-only-redesign-design.md` and naming the superseded sections: camera modes, Free view, `maxBounds`, 15.5–19.5 zoom and the associated a11y/QA items. Do not rewrite the historical bodies.

- [ ] **Step 2: Update `AGENTS.md`**

Change the intro from "two camera modes" to one 3D overview; set Current state to "all blocks implemented, single-mode redesign applied". Add the new design doc to Read first. Replace the camera-limit and bounded-map hard rules with: overview only, zoom 12–19.5, pitch 0–60°, unrestricted pan, inverted drag rotation. Update the Architecture rows for `src/camera/` (drag-rotation handler only) and `src/store.ts` (hover, selection, map status). Remove the first-person, pointer-lock, one-camera-owner-while-free and padded-bounds gotchas.

- [ ] **Step 3: Update `README.md`**

Rewrite the intro to one overview mode. In the QA checklist: replace the camera-limit and Free View sections with checks for inverted rotation, 0–60° tilt, free pan, zoom floor 12, and no snap-back; change Resize to one view; remove live-region and reduced-motion transition claims (there are no transitions now); change keyboard focus to the map canvas and info card; keep the point-hover, point-highlight, category-colour, Esc-to-close and reduced-transparency checks. Change the Vercel confirmation line from "both camera modes" to "the 3D campus overview".

- [ ] **Step 4: Run the full gate**

Run: `pnpm typecheck && pnpm test && pnpm build`
Expected: all pass; the MapLibre >500 kB chunk warning is non-blocking.

- [ ] **Step 5: Final Chrome check**

With the dev server running: at 1280×800, 1440×900 and 1920×1080 confirm no scrollbars, campus fitted on load and after resize, hover tooltip and click info card, inverted rotation, free pan, zoom floor, no console errors, and attribution visible. Also confirm `prefers-reduced-motion: reduce` changes nothing visually now that no camera transitions exist.

- [ ] **Step 6: Commit**

```bash
git add AGENTS.md README.md PLAN.md docs && git commit -m "docs: align guidance with the single-mode overview"
```
