# AGENTS.md

Project guidance for AI agents and new contributors. Read this before touching code.

## What this is

A single-screen 3D landing page for the **SENATI Sede Principal** campus in San Martín de
Porres, Lima (plus code `2W2Q+89`). The map fills the viewport: no page scroll, one always-on 3D
campus overview, and places drawn as category-coloured dots from OpenStreetMap data. Hovering a
dot reveals its footprint and a name/type tooltip.

**Current state:** all blocks implemented, hover-only place dots with a category legend.

## Read first

- `docs/superpowers/specs/2026-11-23-hover-only-tooltip-and-category-trim-design.md` — the design source of truth for the hover-only tooltip and category table.
- `docs/superpowers/specs/2026-11-22-flat-outlines-and-english-design.md` — the design source of truth for the flat English overview.
- `docs/superpowers/specs/2026-11-22-top-view-only-redesign-design.md` — historical design; its camera/mode sections are still authoritative for the single overview.
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
- **Closed category table.** Unknown OSM tags are dropped at fetch time, never rendered. The
  eleven categories are education, food, market, shop, park, sport, worship, finance, health,
  community and entertainment. Only `park` and `sport` have generic labels (`Park` and `Pitch`).
  Only features with an OSM `name` or a category `genericLabel` are kept; everything else is
  dropped at fetch time.
- **Flat buildings.** Buildings are not drawn at rest. Hovering a place dot fills its footprint
  with the category colour at 35 % opacity and draws a thin outline; there are no fill-extrusion
  layers.
- **No controls card.** The bottom-left category legend is the only controls panel.
- **One camera: the overview.** No mode switch, no first-person view, no pointer lock.
- **Camera limits.** Zoom 12–19.5, pitch 0–60°. Pan is unrestricted; `maxBounds` is not set.
- **Inverted rotation.** Right-drag or Ctrl-drag turns the map opposite to MapLibre's default at
  half sensitivity (0.4°/px); vertical drag keeps native tilt.
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
| `src/places/` | Place description for the hover tooltip. |
| `src/ui/` | Landing overlays. |
| `src/store.ts` | Zustand app store: hover, category visibility, map status. |

Pure logic lives apart from MapLibre calls so it can be unit tested in jsdom.

## Gotchas

- **WebGL cannot run in jsdom.** Test the maths and the reducers; verify rendering and camera
  feel by hand in a browser.
- **Strip the basemap's own buildings and POIs.** OpenFreeMap Liberty ships `building*` and
  `poi*` layers that would double up with ours.
- **Rotation is a custom handler.** `dragRotate.disable()` is called and a canvas handler mirrors
  MapLibre's centre-dependent bearing math, negates the bearing and scales it by 0.5. Tilt keeps
  its native sign and clamps to `map.getMaxPitch()`.
- **Heights are derived, not surveyed.** `building:levels × 3.2`, clamped 4–60 m. They are
  informational only: footprints render on hover. Do not claim precision.
- **No `Unnamed …` places.** The fetch drops any feature with neither a name nor a generic label.

## Conventions

- Small, focused modules. One responsibility per file.
- Tailwind for layout; shared colour tokens in `src/theme.ts`.
- Conventional Commits.
- Before claiming a task is done: `pnpm typecheck && pnpm test && pnpm build`, plus the manual
  browser check listed in that task.
