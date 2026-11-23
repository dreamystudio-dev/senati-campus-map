# Hover-only place tooltip and category trim — Design

**Date:** 2026-11-23
**Status:** approved

## Intent

The neighbourhood view has more places than the old campus view, and some of them carry little
information. This change trims the category table, removes places whose only possible label is
`Unnamed <category>`, and simplifies the place tooltip: it appears on hover only, shows the place
name above its type, sizes itself to its content, and reveals the footprint through the existing
hover styling instead of a click.

## Goals

- **G1 — Smaller category table.** Remove `fuel`, `parking`, `transit`, `facilities`, `art` and
  `construction`. Eleven categories remain: education, food, market, shop, park, sport, worship,
  finance, health, community, entertainment. The Parking and Construction generic labels go with
  them; only `Park` and `Pitch` remain.
- **G2 — No `Unnamed …` places.** Drop any feature that has neither an OSM `name` nor a category
  `genericLabel` at fetch time, so it has no dot, no outline and no tooltip. `describePlace` stops
  inventing `Unnamed <category>` titles.
- **G3 — Hover-only tooltip.** Remove the click form (selection, expanded dialog, close button,
  Escape handler). Hovering a dot shows the tooltip; leaving hides it.
- **G4 — Footprint on hover.** Hovering a dot also shows its footprint through the existing hover
  source, at the current 35 % fill plus thin outline. Clicking does nothing special.
- **G5 — Tooltip layout.** Name on top, category label underneath, both horizontally centred.
  Width fits the content (`w-fit`, with a min and max), larger padding and type than today.
- **G6 — Fewer legend rows.** The bottom-left legend follows the table automatically; no new
  legend controls.

## Non-goals

- No new categories, colours, camera behaviour, rotation change or mobile layout.
- No change to the 2× frame, centre, zoom/pitch limits or `fitCampus()`.
- No runtime Overpass, API keys, server functions or environment variables.
- No fix for the known `office=*` Overpass query gap (deferred; noted in review).
- No redesign of the legend beyond having fewer rows.

## Anti-goals

- A tooltip or label that ever reads `Unnamed …`.
- A nameless dot that opens an empty tooltip.
- Reintroducing click-to-select, a dialog or a close button.
- A fixed-width tooltip that leaves a large empty box for a short name.
- Page scroll, a second controls panel, or a fill-extrusion building.

## Constraints

- Desktop only; the page never scrolls; root stays `h-dvh overflow-hidden`.
- Static Vercel deployment; `src/data/places.geojson` stays committed and is regenerated with
  `pnpm data` (network required) because the category table changes.
- Fixed palette and the closed category table in `src/categories.ts`.
- Hover fill stays 35 %; the hover outline keeps its current thin style.
- No user text input; OSM proper names stay exactly as authored.

## Approaches

1. **Reuse the click-reveal path (A).** Rename `selectedFootprintId` to a hover-driven id and let
   the base polygon layers show the footprint. Small, but the footprint appears with the at-rest
   3 px border and base fill rather than the 35 % hover fill, and the selection naming stays.
2. **Reveal the footprint through the hover source (chosen, B).** When a hovered feature has a
   `footprintId`, `syncHoverSource` adds that polygon to the hover source alongside the dot. The
   existing `places-hover-fill` / `places-hover-line` layers then draw it at 35 % fill with a thin
   outline, and `places-hover-point` enlarges the dot. This honours the existing hover rule and
   lets the now-unused selection state, click handler and base polygon layers be deleted.
3. **Hide `Unnamed …` in the UI only.** Filter in `describePlace`/the panel but keep the dots.
   Rejected: a nameless dot with no information is clutter and still occupies the map.
4. **Drop `Unnamed …` places at render time.** Filter the GeoJSON in `createMap`. Rejected: the
   data pipeline is the single source of truth, and the fetch already drops uncategorised places.

## Decisions (builder's calls recorded here)

- `Unnamed …` places are dropped in `scripts/fetch-places.ts` when `!tags.name && !category.genericLabel`,
  covering buildings, areas and points alike. Regenerate the committed GeoJSON afterwards.
- `describePlace` returns an empty title when there is no name and no generic label; it never
  invents `Unnamed <category>`. The panel omits the title line if it is empty (defensive only).
- The store loses `selectedId`, `selectedFootprintId` and `select`. `toggleCategory` clears
  `hoveredId` and `hoverPosition`. `hoverPosition` is kept even though the panel is fixed
  top-centre; it is still part of hover state and costs nothing.
- `syncHoverSource` emits the hovered feature plus its linked footprint polygon, found by
  `properties.footprintId`. No store signature change is needed.
- `layers.ts` drops `places-buildings`, `places-areas-fill`, `places-areas-outline-tint`,
  `places-areas-outline`, the `selectedFootprintId` parameter and the now-unused `FILL_IDS` /
  `OUTLINE_IDS` / `categoryIn` helpers. Points, hover layers and labels remain.
- `createMap` loses the click handler; its filter-sync key depends only on `hiddenCategories`.
- Tooltip styling: name `text-base` semibold, type `text-xs` in the category colour, centred,
  `px-4 py-2.5`, `w-fit`, `min-w-[10rem]`, `max-w-[24rem]`, rounded, same dark translucent panel.
- `AGENTS.md` is updated to match the shipped behaviour: eleven categories, hover-only tooltip,
  no `Unnamed …` places, and the legend as the one controls panel.

## What is left to the builder

- Update the category tests for eleven categories and the remaining generic labels.
- Add fetch tests proving nameless/no-generic features are dropped and unnamed park/pitch areas
  survive; regenerate the GeoJSON.
- Update store, hover, layer and a11y tests: no selection/dialog/Escape, footprint appears on
  hover, tooltip shows name above type.
- Run `pnpm typecheck && pnpm test && pnpm build` and a Chrome check at 1280×800, 1440×900 and
  1920×1080: hover shows the centred name/type tooltip and the footprint, leaving hides both,
  no click dialog, eleven legend rows, no `Unnamed …` anywhere, no console errors.
