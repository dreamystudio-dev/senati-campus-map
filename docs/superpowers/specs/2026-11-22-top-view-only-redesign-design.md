# Top-view-only redesign — objectives

Date: 2026-11-22
Status: draft for approval — no implementation yet

## Why

The first-person Free view is not the interaction wanted for this landing page.
The map should have one default, always-available view: the 3D campus overview.
Panning already works through MapLibre's normal left-drag, so no replacement
gesture is needed. Three behaviours of the current overview should change:
rotation direction, pan limits, and how far out the user can zoom.

## Goals

- Remove Free view completely, including its mode switch, first-person camera,
  pointer-lock handling and supporting state.
- Leave Top View as the only mode, with no mode UI or unavailable choices.
- Invert the direction of rotation so dragging turns the map the intuitive way.
- Let the user pan freely instead of clamping the camera to the campus box.
- Allow a substantially wider zoom-out than the current 15.5 minimum.

## Non-goals

- No middle-mouse/wheel-button gesture: MapLibre's left-drag pan is sufficient.
- No mobile or touch redesign; the page stays desktop-only.
- No new overlays, legend, edit mode, user input or runtime network calls.
- No change to the committed place data or category colours.

## Constraints that still apply

- Single screen: `h-dvh overflow-hidden`, never scrolls.
- Static Vercel deployment, no keys, env vars, server or runtime Overpass.
- One camera owner: no first-person loop, no competing `easeTo`/`flyTo`.
- Hover, tooltip, info card and self-hosted font remain.
- This redesign supersedes the conflicting hard rules in `AGENTS.md` (two camera
  modes, padded `maxBounds`, 15.5–19.5 top zoom). O7 updates that file so the
  repository guidance matches the single-mode camera.

## Approaches considered

| Approach | Trade-off | Verdict |
| --- | --- | --- |
| Delete all mode/Free-view modules and tune MapLibre's built-in top view | Touches many small files and their tests, but leaves one clear camera owner and no dead state | **Chosen** |
| Keep the two-state switch and simply disable the Free button | Small diff, but leaves unreachable camera code, tests and state that can drift | Rejected |
| Add a custom middle-button pan handler | Duplicates a gesture MapLibre already provides and adds browser autoscroll work | Rejected |

## Objectives

### O1 — Remove Free mode from state and UI

- Delete `mode`, `locked`, `lockRefused`, `transitioning` and their setters from
  `src/store.ts`; keep selection, hover and map status.
- Delete `src/ui/ModeSwitch.tsx` and its use in `src/App.tsx`, including the
  screen-reader live region that announces mode changes.
- Reduce `src/ui/copy.ts` and `ControlsCard` to top-view-only hints.
- Acceptance: no button, keyboard path or store field can enter a second mode.

### O2 — Remove the first-person camera machinery

- Delete `src/camera/useFreeView.ts`, `useModeTransition.ts`, `transition.ts`,
  `player.ts`, `input.ts` and their tests.
- Remove the `playerRef` prop and camera hooks from `src/map/MapCanvas.tsx`;
  keep the initial/resize campus fit (`fitCampus`).
- Remove pointer-lock branches from hover/click handling in
  `src/map/createMap.ts` so hover and selection always work.
- Acceptance: no `requestPointerLock`, WASD, eye-height or free-camera code
  remains; typecheck and the reduced suite pass.

### O3 — Make the overview the only camera configuration

- In `src/map/options.ts`, drop `FREE_VIEW_LIMITS`, `applyCameraLimits` and
  per-mode branching. Keep one static limit object used by `mapOptions`.
- Keep `maxZoom`, `maxPitch` and `centerClampedToGround` at their current top
  values unless a later objective says otherwise.
- Acceptance: camera limits are set once at map creation and never switch.

### O4 — Invert rotation

- MapLibre's built-in drag rotation (right-drag, or left-drag with Ctrl) turns
  the map in the unwanted direction and has no invert option. Disable
  `map.dragRotate` and install a small custom canvas handler that applies the
  negated bearing delta, preserving tilt behaviour and click tolerance.
- Cover both right-drag and Ctrl-drag.
- Acceptance: dragging in a given direction turns the map the opposite way to
  today, with no double rotation and no context-menu regression.

### O5 — Unrestrict panning

- Remove `maxBounds` from `mapOptions` in `src/map/options.ts`; stop using
  `paddedBounds` for the camera (keep or delete the helper if it has no other
  caller).
- Decide and document whether `renderWorldCopies` should become `true` so that
  panning past the campus does not reveal blank space. Default proposal: keep
  it `true` for continuous panning.
- Acceptance: the camera can be dragged well beyond the campus box in every
  direction without snapping back.

### O6 — Widen zoom-out

- Lower the static `minZoom` in `src/map/options.ts`. Proposal: `12`, enough to
  show the surrounding district for orientation; confirm visually and tune once.
- Lower the hard-coded clamp in `fitZoom` (`src/map/bounds.ts`) to the same
  minimum so the fitted initial view and the configured limits agree.
- Acceptance: the user can scroll out past the campus to neighbourhood scale,
  and `fitZoom` still returns a sensible initial zoom.

### O7 — Update docs and verification

- Mark the 2026-11-21 design doc and `PLAN.md` Block 3/5 camera and mode tasks
  as superseded by this redesign rather than silently rewriting history.
- Update `AGENTS.md`: remove the two-camera-mode, padded-`maxBounds` and
  15.5–19.5 top-zoom hard rules; refresh the current-state and architecture
  notes so later agents do not reintroduce Free view or the old limits.
- Update `README.md`: remove mode-switch, WASD, pointer-lock and Esc-to-relock
  checklist items; add inverted rotation, unrestricted pan and wider zoom-out;
  state that Top View is the only mode.
- Re-run the full gate (`typecheck`, `test`, `build`) and a real Chrome check:
  rotation direction, panning past bounds, zoom-out limit, hover/click,
  no scroll, no console errors.

## Suggested order

O1 → O2 → O3 → O5 → O6 → O4 → O7. Remove the mode machinery first so the
camera changes have one owner; verify interaction changes in the browser last.

## Open decisions (builder may settle unless overridden)

- Exact minimum zoom (`12` proposed) and whether `maxZoom` stays at `19.5`.
- Whether `renderWorldCopies` becomes `true` (proposed) or the map keeps one
  world copy.
- Whether tilt/right-drag pitch direction should also be inverted; the request
  named rotation only, so the proposal is to leave tilt unchanged.
