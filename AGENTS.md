# AGENTS.md

Project guidance for AI agents and new contributors. Read this before touching code.

## What this is

A single-screen 3D landing page for the **SENATI Sede Principal** campus in San Martín de
Porres, Lima (plus code `2W2Q+89`). The map fills the viewport: no page scroll, two camera
modes, and places coloured by category from OpenStreetMap data.

**Current state:** the repo holds the design doc and the implementation plan. The app itself is
built by following `PLAN.md` task by task.

## Read first

- `docs/superpowers/specs/2026-11-21-campus-map-design.md` — the design source of truth.
- `PLAN.md` — 16 tasks in 5 blocks, with exact files, interfaces and tests.

If a change contradicts the spec, stop and raise it rather than silently diverging.

## Stack

Vite 8 · React 19 · TypeScript 7 · Tailwind CSS 4 · MapLibre GL JS 6 · Zustand 5 · Vitest 5.
Deployed as a static site on Vercel.

## Commands

```bash
pnpm install
pnpm dev          # local map
pnpm test         # Vitest
pnpm typecheck    # tsc --noEmit
pnpm build        # production bundle in dist/
pnpm data         # refresh src/data/places.geojson from Overpass (needs network)
```

`pnpm data` is the only command that touches the network beyond map tiles. Run it only when the
campus data or the category table changes, and commit the regenerated GeoJSON.

## Hard rules

- **Desktop only.** No mobile or touch layout work.
- **The page never scrolls.** Root element is `h-dvh overflow-hidden`.
- **Static hosting only.** No API keys, no environment variables, no server functions.
- **No runtime Overpass calls.** `src/data/places.geojson` is committed.
- **Closed category table.** Unknown OSM tags are dropped at fetch time, never rendered.
- **Camera limits.** Top view: zoom 15.5–19.5, pitch 0–60°. Free view: eye 2–80 m, pitch ≤ 95°.
- **Bounded map.** `maxBounds` is the campus box padded 10%; the camera cannot leave it.
- **Fixed palette.** sky `#5aa9e6`, coral `#ef6f6c`, amber `#f2b134`, violet `#9b7ede`,
  lime `#8bc34a`, teal `#2ec4b6`, pink `#e56b9f`, bone `#e8e2d6`, orange `#f08a3c`,
  slate `#6b7a8f`.
- **No user text input.** All labels come from committed data and render as React text.

## Architecture

| Path | Responsibility |
| --- | --- |
| `src/categories.ts` | Tag → category table, colours, fill/outline style. Single source of truth. |
| `src/data/` | Committed `campus.json` and `places.geojson`. |
| `scripts/fetch-places.ts` | One-off Overpass pull and transform. Pure `transformOverpass` is tested. |
| `src/map/` | Map creation, style sanitising, layers, map options. |
| `src/camera/` | Player state, input mapping, top view, free view, mode transitions. |
| `src/places/` | Place description for tooltip and info card. |
| `src/ui/` | Landing overlays. |
| `src/store.ts` | Zustand app store: mode, lock, hover, selection, map status. |

Pure logic lives apart from MapLibre calls so it can be unit tested in jsdom.

## Gotchas

- **MapLibre 6 first-person API.** Free view uses `map.calculateCameraOptionsFromTo(...)` with
  `centerClampedToGround: false`, as in MapLibre's official first-person example. Verify the
  signature after install; fall back to `FreeCameraOptions` if it changed.
- **WebGL cannot run in jsdom.** Test the maths and the reducers; verify rendering and camera
  feel by hand in a browser.
- **Strip the basemap's own buildings and POIs.** OpenFreeMap Liberty ships `building*` and
  `poi*` layers that would double up with ours.
- **One camera owner at a time.** Free view writes the camera every animation frame, so
  `flyTo`/`easeTo` must not run concurrently.
- **Pointer lock can be refused.** Free view falls back to drag-to-look when
  `requestPointerLock` rejects.
- **Heights are derived, not surveyed.** `building:levels × 3.2`, clamped 4–60 m. Do not claim
  precision.
- **Unnamed areas need a label.** Parks, pitches, parking and construction fall back to a
  generic Spanish label; unnamed buildings and points get colour but no label.

## Conventions

- Small, focused modules. One responsibility per file.
- Tailwind for layout; shared colour tokens in `src/theme.ts`.
- Conventional Commits.
- Before claiming a task is done: `pnpm typecheck && pnpm test && pnpm build`, plus the manual
  browser check listed in that task.
