# Nearby buildings and a quieter campus outline — Design

**Status:** draft, awaiting approval

## Intent

The current view is centred on SENATI and framed tightly to the campus. A large OSM education area named `SENATI Sede Principal` is rendered as a 30% blue fill, so the campus reads as the hero object while nearby places are barely visible. The user wants to showcase lookaround places instead, without changing the camera in this first step.

## Goals

- Add more **real** buildings around the edges of the current frame.
- Keep the current centre, bounds and zoom framing unchanged.
- Make the big campus education area a faint outline/tint instead of a solid colour block.
- Keep the map honest: no fabricated footprints and no conversion of POI dots into fake buildings.

## Non-goals

- No wider camera or changed `campus.json` bounds in this step.
- No synthetic places or invented geometry.
- No changes to the 16 POI dot markers beyond their existing category hover styling.
- No runtime Overpass calls; the refreshed GeoJSON stays committed.

## Constraints

- Desktop only; the page never scrolls.
- Static Vercel hosting: no API keys, server, env vars or runtime data fetches.
- Fixed palette, closed 12-category table, no legend, no edit mode and no user text input.
- Categorised buildings stay flat category-coloured borders; `category: null` buildings stay neutral dark borders with no label, tooltip, info card or pointer cursor.
- Generated copy stays English; OSM proper names stay unchanged.

## Approaches considered

1. **Expand the fetch box only, and demote the education fill (chosen).** Pull nearby OSM buildings into the existing frame and change `education` from `fill` to `outline` so the campus polygon becomes a quiet tint plus border. More real context with the least visual and architectural churn.
2. **Expand the fetch box and the camera bounds together.** This would show much more of the surrounding district, but it makes the campus smaller on screen. Deferred to a later step.
3. **Fake buildings or outline the POI dots as footprints.** This would fill space without new data, but the shapes would be invented and would undermine the OSM-derived map. Rejected.

## Chosen design

- Change the Overpass bbox in `scripts/fetch-places.ts` from `-12.0018,-77.0635,-11.9965,-77.0575` to approximately **200 m beyond each edge**: `-12.00361,-77.06533,-11.99469,-77.05567`. This is roughly 2.7× the current area and should add a few hundred nearby buildings.
- Change the `education` category in `src/categories.ts` from `style: 'fill'` to `style: 'outline'`. The existing `places-areas-outline-tint` and `places-areas-outline` layers will then render all education areas, including `SENATI Sede Principal`, as a 12% tint and 2.5 px border instead of a 30% fill.
- Refresh `src/data/places.geojson` once from Overpass, using `pnpm data --from-file` if the live endpoints are unavailable. Keep the new GeoJSON committed; expected size is roughly 0.3–0.6 MB.
- Keep `src/data/campus.json`, `mapOptions()` and `fitCampus()` unchanged.
- Leave `TitleBlock` showing `SENATI · Sede Principal`; it names the page, not a building hierarchy.
- Add focused tests that `education` is in the outline group and not the fill group, and that the refreshed data contains more building features than before.
- Verify with `pnpm typecheck && pnpm test && pnpm build`, then Chrome at the existing viewport sizes: frame unchanged, campus polygon faint, nearby buildings visible, no scrollbars, no console errors, hover and context-building rules intact.

## Builder latitude

The exact expanded bbox may be adjusted by up to ~50 m per side if the live fetch shows too much empty area or an oversized response. All other choices above are settled.
