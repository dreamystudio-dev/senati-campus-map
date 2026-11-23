# Flat outlines, English labels and calmer rotation — Design

**Date:** 2026-11-22
**Status:** approved

## Intent

Make the campus overview quieter and easier to read. Buildings should read as line work rather
than coloured solids, the map's own generated language should be English, and camera rotation
should feel less twitchy. The controls card is not wanted.

## Goals

- **G1 — Calmer rotation.** Halve the rotation sensitivity; tilt sensitivity stays as it is.
- **G2 — No controls card.** Remove the panel and its copy code from the app entirely.
- **G3 — Unnamed buildings are context only.** The 91 features with `category: null` render as
  plain neutral borders. They are not a place type, not a marker, and not interactive: no hover
  highlight, no tooltip, no info card, no label.
- **G4 — Buildings are borders.** Every categorised building renders as a flat footprint outline
  in its category colour, with no solid fill and no translucent volume at rest.
- **G5 — Hover fills a markerable building.** Hovering a categorised building fills its footprint
  with that same border colour at partial opacity, instead of the current white overlay.
- **G6 — English.** All generated map labels and UI copy are English. Proper names from
  OpenStreetMap are left exactly as authored.

## Non-goals

- No changes to the single-overview camera, pan limits, zoom range or tilt range.
- No new categories, palette colours, legend, edit mode or text input.
- No runtime Overpass calls, API keys, server functions or environment variables.
- No translation of OSM proper names (e.g. `Centro Tecnológico` stays as written).
- No changes to areas or points beyond the shared hover-highlight colour and English labels.

## Constraints

- Desktop only; the page never scrolls; root stays `h-dvh overflow-hidden`.
- Static Vercel deployment; `src/data/places.geojson` stays committed.
- Fixed palette and closed category table from `src/categories.ts`.
- Rotation still mirrors MapLibre's native math and negates bearing (O4 of the previous redesign),
  so sensitivity must scale both the linear and angular branches.

## Approaches

1. **Change the existing layers in place (chosen).** Replace the two building `fill-extrusion`
   layers and the outline-volume layer with a single flat `line` layer per building group; reuse
   the existing hover source with a category-coloured `fill` layer; filter interaction queries on
   `category != null`. Small, testable, no data pipeline changes beyond four label strings.
2. **Rebuild the committed GeoJSON without uncategorised buildings.** Would satisfy "not a
   building type" by deletion, but the human partner chose to keep them as neutral context, and
   it would require re-running the offline data transform. Rejected.
3. **Translate OSM names at render time.** Would not preserve proper nouns and would need a
   translation source or dictionary, violating the offline/static constraint. Rejected.
4. **Hide the controls card with CSS.** Leaves dead components and copy in the bundle. Rejected
   in favour of deleting the component, its import, its copy module and its test.

## Decisions (builder's calls recorded here)

- Rotation sensitivity multiplier is `0.5`, applied to both MapLibre branches: 0.8°/px becomes
  0.4°/px in the linear branch and the angular delta is halved too. Pitch stays at 0.5°/px.
- Categorised building borders are 3 px wide at 0.9 opacity — the current outline width. Neutral
  context borders use the existing `#2a303b` at a slightly lower opacity so they recede.
- Hover fill opacity is 0.35 — visible but clearly temporary. The hover outline uses the same
  category colour, so areas and points also stop flashing white.
- "Markerable" means a feature with a non-null `category`. Uncategorised buildings are excluded
  in `createMap`'s `mousemove`/`click` queries, so the store never receives their ids.
- Generated labels become `Park`, `Pitch`, `Parking`, `Construction` in `src/categories.ts` and
  the four matching `genericLabel` values in the committed `places.geojson`. `describePlace`'s
  unreachable `Unnamed building` / `Building` fallbacks are removed rather than translated.
- UI copy that remains (info card close button, error overlay, attribution) is already English;
  docs that describe the old Spanish labels are updated.

## What is left to the builder

- Update the layer tests for the new layer set and hover colours.
- Update interaction tests so unnamed buildings are proven non-interactive.
- Update rotation tests for the halved sensitivity.
- Run `pnpm typecheck && pnpm test && pnpm build` and a real Chrome check of borders, hover fill,
  no tooltip on unnamed buildings, English labels, removed controls card and calmer rotation.
