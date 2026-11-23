# AGENTS.md

Project guidance for AI agents and new contributors. Read this before touching code.

## What this is

A single-screen 3D landing page for the **SENATI Sede Principal** campus in San Martín de
Porres, Lima (plus code `2W2Q+89`). The map fills the viewport: no page scroll, one always-on 3D
campus overview, and places coloured by category from OpenStreetMap data.

**Current state:** all blocks implemented, single-mode redesign applied.

## Read first

- `docs/superpowers/specs/2026-11-22-top-view-only-redesign-design.md` — the design source of truth for the single-mode overview.
- `docs/superpowers/specs/2026-11-21-campus-map-design.md` — historical design; its camera/mode sections are superseded.
- `PLAN.md` — historical implementation plan; its camera/mode sections are superseded.

If a change contradicts the spec, stop and raise it rather than silently diverging.

## Stack

Vite 6 · React 19 · TypeScript 5.7 · Tailwind CSS 4 · MapLibre GL JS 5 · Zustand 5 · Vitest 3.
Deployed as a static site on Vercel.

These are the versions actually installed. The design doc names newer majors; do not upgrade a
major just to match it — the camera API used here exists in MapLibre 5 and 6 alike.

## Commands

```bash
pnpm install
pnpm dev          # local map
pnpm test         # Vitest
pnpm typecheck    # tsc --noEmit
pnpm build        # production bundle in dist/
pnpm data         # refresh src/data/places.geojson from Overpass (needs network)
pnpm data --from-file overpass.json   # transform a saved Overpass response offline
```

`pnpm data` is the only command that touches the network beyond map tiles. Run it only when the
campus data or the category table changes, and commit the regenerated GeoJSON.

## Hard rules

- **Desktop only.** No mobile or touch layout work.
- **The page never scrolls.** Root element is `h-dvh overflow-hidden`.
- **Static hosting only.** No API keys, no environment variables, no server functions.
- **No runtime Overpass calls.** `src/data/places.geojson` is committed.
- **Closed category table.** Unknown OSM tags are dropped at fetch time, never rendered.
  Uncategorised buildings are the one exception: they are kept with `category: null` and render
  neutral, so the campus keeps its 3D mass.
- **One camera: the overview.** No mode switch, no first-person view, no pointer lock.
- **Camera limits.** Zoom 12–19.5, pitch 0–60°. Pan is unrestricted; `maxBounds` is not set.
- **Inverted rotation.** Right-drag or Ctrl-drag turns the map opposite to MapLibre's default; vertical drag keeps native tilt.
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
| `src/camera/` | Inverted drag-rotation handler only. |
| `src/places/` | Place description for tooltip and info card. |
| `src/ui/` | Landing overlays. |
| `src/store.ts` | Zustand app store: hover, selection, map status. |

Pure logic lives apart from MapLibre calls so it can be unit tested in jsdom.

## Gotchas

- **WebGL cannot run in jsdom.** Test the maths and the reducers; verify rendering and camera
  feel by hand in a browser.
- **Strip the basemap's own buildings and POIs.** OpenFreeMap Liberty ships `building*` and
  `poi*` layers that would double up with ours.
- **Rotation is a custom handler.** `dragRotate.disable()` is called and a canvas handler mirrors
  MapLibre's centre-dependent bearing math, then negates only the bearing. Tilt keeps its native
  sign and clamps to `map.getMaxPitch()`.
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
