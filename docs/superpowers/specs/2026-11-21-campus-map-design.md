# SENATI Campus Map — Design

**Date:** 2026-11-21
**Status:** draft, awaiting approval

## Intent

A single-screen landing page for a university showcase. The map of **SENATI Sede Principal** in San Martín de Porres, Lima (plus code `2W2Q+89`, centre `-11.9990, -77.0604`) is the entire page. A visitor can explore the campus in 3D, switch to a straight-down view, and see the surrounding places — campus buildings, parks, the market, shops, food, a church, a petrol station — each colour-coded by what it is and labelled with its name.

## Why

The page is a showcase piece, not a product. It should demonstrate three things in one screen: a real place rendered from real open data, a camera that feels good in both a map view and a first-person view, and a colour system that makes a varied neighbourhood legible at a glance.

## Goals

- The page fits one viewport on desktop. Nothing scrolls.
- The map is the hero: pan, zoom, rotate and tilt all work with mouse and trackpad.
- **Top view**: straight down, north-up, the readable "what is where" view.
- **Variety of places, colour-coded by category.** Each place type gets a colour and a display style — filled volume or outlined footprint — and named places show their name as a label. The variety is the content; there is no manual marking UI.
- Changing what a category looks like is a one-line edit in a committed config file.

## Non-goals

- No photorealistic rendering, no terrain, no textures on buildings.
- No search, geocoding, routing, or directions.
- No accounts, no database, no server, no runtime API calls other than map tiles.
- No mobile or touch layout. Desktop only.
- No in-app editor. Categories are configured in code.
- No support for arbitrary locations. The map is locked to this campus box.

## Anti-goals

These would mean the page failed even if it technically runs:

- Anything scrolls the page.
- Free view feels like fighting the camera: jitter, clipping through the ground, getting stuck inside a building, or a horizon that spins unexpectedly.
- The colour system turns into confetti: too many categories, colours that vanish against the basemap, or labels that collide into noise.
- Slow first paint, or a map that visibly jumps as tiles and features arrive.
- A page that looks like a map demo instead of a designed landing page.

## Constraints

- Deployed on Vercel as a static site. No environment variables, no API keys, no server functions.
- Place data is committed to the repo. Nothing is fetched from Overpass at runtime.
- OpenStreetMap attribution and OpenFreeMap attribution are visible.
- Desktop-first and desktop-only. The showcase machine is a laptop with an integrated GPU.

## Approaches considered

**A. MapLibre GL JS with campus data as local GeoJSON — chosen.**
One renderer for both cameras. Places come from our own GeoJSON, so each has a stable id, and fill versus outline is a property of the category rather than a hack. Labels read a `name` property. Top view is the ordinary map camera; free view uses MapLibre's official first-person recipe (`calculateCameraOptionsFromTo` plus WASD, `centerClampedToGround: false`). Basemap context comes from OpenFreeMap, which is free and keyless. Cost: flat-shaded extrusions and a flat ground plane at street level.

**B. Three.js from scratch — rejected.**
Total camera freedom and precise control over outlines and materials, but projection, roads, water, and 3D text labels all have to be rebuilt. Weeks of work for a one-screen showcase.

**C. CesiumJS with OSM 3D Buildings — rejected.**
Real building meshes and terrain, but it cannot draw a per-feature footprint outline, which removes half the visual system. It also needs an ion token and ships a multi-megabyte bundle.

## Design

### 1. Stack

| Concern | Choice |
| --- | --- |
| Build | Vite 8 |
| UI | React 19 + TypeScript 7 |
| Styles | Tailwind CSS 4 (via `@tailwindcss/vite`) |
| Map | MapLibre GL JS 6 |
| State | Zustand 5 |
| Tests | Vitest 5 |
| Hosting | Vercel, static `dist` |

Exact versions are pinned at scaffold time. No router. One route.

### 2. Project layout

```
senati-campus-map/
├── scripts/fetch-places.mjs        # one-off Overpass pull, writes src/data
├── src/
│   ├── data/places.geojson         # committed: buildings, areas, point places
│   ├── data/campus.json            # committed: name, centre, bounds
│   ├── categories.ts               # committed: tag → category, colour, style
│   ├── map/                        # map init, layers, camera, interactions
│   ├── places/                     # category resolution, labelling, info card model
│   ├── ui/                         # landing overlays
│   └── App.tsx
├── docs/superpowers/specs/         # this document
└── PLAN.md
```

### 3. Data pipeline

`npm run data` runs `scripts/fetch-places.mjs`:

- Queries Overpass once inside the campus box
  (`lat -12.0018..-11.9965`, `lon -77.0635..-77.0575`, roughly 590 × 655 m) using
  `nwr["building"]`, `nwr["amenity"]`, `nwr["shop"]`, `nwr["leisure"]`, `nwr["tourism"]`
  with `out geom`. `nwr` and `out geom` keep multipolygon relations, which matter because
  large institutional buildings are often relations in OSM.
- Converts the Overpass response with `osmtogeojson`, which assembles multipolygons and
  handles relation members correctly.
- Drops uncategorised areas and points, including filler landuse (`grass`, `residential`,
  `industrial`) that would otherwise paint the whole map. Keeps uncategorised **buildings**
  with `category: null` — they give the campus its 3D mass and render neutral.
- Keeps `name`, `building`, `building:levels`, `height`, and the category-bearing tags.
- Derives `heightM` for buildings: parse the `height` tag when present, otherwise
  `building:levels × 3.2`, otherwise 6 m. Clamped to 4–60 m.
- Computes a label point with `polylabel` for polygons (guaranteed inside the footprint,
  including multi-part buildings), and uses the node position for point places.
- Writes `src/data/places.geojson` and `src/data/campus.json`.

The output is committed. The script is idempotent and only needs re-running if the campus data
changes. Expected size: roughly 90–120 features after dropping filler, well under 500 KB.

Each feature carries `id` (OSM type and id, e.g. `way/70606031`), `name`, `category`
(`null` for neutral context buildings), `kind` (the raw OSM tag), `levels`, `heightM`, and
`geometryType` (`building`, `area`, or `point`).

### 4. Categories

`src/categories.ts` is the single source of truth for the colour system. It maps OSM tags to
about twelve categories. Every category has a palette colour and a display style.

| Category | Matches | Style | Colour |
| --- | --- | --- | --- |
| Education | `amenity=college\|university\|school\|kindergarten`, `office=educational_institution` | fill | sky |
| Food & drink | `amenity=cafe\|restaurant\|fast_food\|bar` | fill | coral |
| Market | `amenity=marketplace` | fill | amber |
| Shop | `shop=*` | fill | violet |
| Park & garden | `leisure=park\|garden` | outline | lime |
| Sport | `leisure=pitch\|sports_centre\|stadium` | outline | teal |
| Worship | `amenity=place_of_worship` | fill | pink |
| Finance | `amenity=bank\|atm` | outline | bone |
| Fuel | `amenity=fuel` | fill | orange |
| Art | `tourism=artwork` | fill | bone |
| Parking | `amenity=parking` | outline | slate |
| Construction | `landuse=construction\|brownfield` | outline | slate |

Twelve categories over a ten-swatch palette, so `bone` and `slate` are shared by two categories
each. Resolution is first-match-wins in table order, and the result is baked into
`places.geojson` at fetch time so the client does no tag parsing.

Adding a place type, changing a colour, or switching a category between fill and outline is a
one-line edit to this table followed by `npm run data`.

### 5. Rendering

Three geometry classes, each with its own layer family:

- **Buildings** — `fill-extrusion`, coloured by category, height from `heightM`. Fill-style
  categories get a solid extrusion; outline-style categories on buildings get a translucent
  extrusion plus a 3 px footprint line.
- **Areas** — flat polygons on the ground for parks, pitches, parking and construction.
  Outline-style areas get a coloured border and a very light tint; fill-style areas get a
  translucent fill. These must stay quiet so they do not compete with buildings.
- **Point places** — shops, banks and kindergartens mapped as nodes. Rendered as small
  circles with `circle-pitch-alignment: 'viewport'` so they stay face-on when the camera is
  horizontal, plus their label.

Uncategorised features and the basemap ground stay neutral slate. Every feature gets a subtle
height-based lightness variation so the campus does not read as one flat slab.

**Labels** — a symbol layer filtered to features with a name, anchored at the label point,
with a dark halo and priority above road labels. Unnamed area features fall back to their
category's generic label (`Parque`, `Cancha`, `Estacionamiento`) because a coloured park with
no label reads as a bug. Unnamed buildings and points get colour but no label.

### 6. Basemap

OpenFreeMap Liberty style (`https://tiles.openfreemap.org/styles/liberty`). At load, the style
is cloned and:

- every `building*` layer is removed, so only our buildings render in 3D;
- POI icon layers are removed, so the only place labels are ours;
- ground, water, parks and roads are restyled into a dark, muted palette so categories carry
  the colour.

`renderWorldCopies: false`. Attribution control stays.

### 7. Camera

A small state machine: `mode: 'top' | 'free'`, plus `transitioning`.

**Top view** — pitch 0, bearing 0, zoom fitted to the campus bounds (15.5–19.5). Drag pans,
wheel zooms, right-drag or ctrl-drag rotates and tilts up to 60°. Standard MapLibre behaviour.

**Free view** — has two sub-states, `locked` and `unlocked`, because a first-person camera and
clickable overlays cannot both own the pointer at once.

- `locked`: pointer captured, cursor hidden. Mouse look and WASD are live; the overlay UI is
  visible but inert except for the mode switch and `Esc`.
- `unlocked` (`Esc`): cursor returns, the camera freezes where it is, WASD is ignored, and every
  overlay becomes clickable. Clicking the map canvas re-locks.
- The mode switch still reads "Free" while unlocked.
- A building click opens the info card only while unlocked, since a click while locked is what
  re-locks the pointer.
- Player state is metres from a campus origin: `x`, `y`, `heading`, `eyeM`, plus a look pitch
  clamped between −60° and +5°.
- `W/S` forward and back, `A/D` strafe, `Q/E` down and up, `Shift` sprint. Speed 8 m/s walking,
  20 m/s sprinting. Eye height clamped to 2–80 m.
- Each animation frame: compute eye and look-ahead points in lng/lat, call
  `map.calculateCameraOptionsFromTo(eye, eyeM, ahead, aheadM)`, then `map.jumpTo`.
- Map is created with `pitch: 90`, `maxPitch: 95`, `centerClampedToGround: false`, and pointer
  interactions disabled while in free view.
- MapLibre pitch 90 is horizontal and 95 is the renderer's ceiling, so the camera can look from
  5° above the horizon down to 60° below. Looking further up is not possible; there is no sky.

**Transitions** — top → free eases to a drone vantage over 1.2 s: campus entry point, eye height
25 m, pitch ~55°, heading toward the main building. It does not dive straight to eye level,
which would be a lurch from an overview. Control is handed to the free camera at that vantage,
and the user descends with `Q`. Free → top eases back to the fitted top view over 1.2 s. Input
is ignored during a transition.

### 8. Landing UI

```
┌──────────────────────────────────────────────┐
│ SENATI · Sede Principal          [Top|Free]  │
│ San Martín de Porres, Lima                   │
│                                              │
│         ▄▄▄▄▄▄      ▄▄▄▄▄▄▄▄                │
│      ▄▄████████▄  ▄██████████▄               │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░             │
│                                              │
│ ┌ Mercado Mesa Redonda ───────┐ ┌ Controls ─┐│
│ │ Market · 1 level · 6.4 m    │ │ WASD move ││
│ └─────────────────────────────┘ └───────────┘│
└──────────────────────────────────────────────┘
```

- Full viewport, `h-dvh`, `overflow-hidden`.
- Title block top-left, mode switch top-right as a segmented control.
- No legend. Colour is explained by interaction, not by a key: hovering a place shows a tooltip
  with its name and category, and clicking opens an info card with name, category, kind, levels
  and height.
- Info card bottom-left, controls card bottom-right. The controls card is contextual: top view
  shows drag/scroll/rotate, free view shows WASD/mouse/QE.
- A small hover highlight brightens the feature under the cursor so the map feels alive.
- Loading overlay until the map's first `idle`, with a short fade.
- Dark slate theme, warm off-white text, self-hosted variable font (no runtime font fetch).

### 9. Guardrails

The author asked for a length limit for security. With no text input anywhere, the limits are
structural:

- `maxBounds` is the campus box padded 10%. The camera cannot leave it, in either mode.
- Limits are per mode. Top view: zoom 15.5–19.5, pitch 0–60°. Free view: eye height 2–80 m,
  pitch ≤ 95°. The top-view zoom cap deliberately does not apply to free view, whose altitude
  is set by eye height instead; a 2 m eye is roughly zoom 21, which top view must never reach.
- The category table is closed: unknown tags are dropped at fetch time, so the client renders a
  bounded, known set of features.
- No keys or secrets in the client; only OpenFreeMap tile requests leave the browser.
- No user input, so no injection surface beyond the committed data.

### 10. Performance

- One places source, roughly 120 features, one fill-extrusion pass.
- Basemap is only requested at zoom 15.5+, within the campus box.
- Target: under 2.5 s to interactive on a wired connection, 60 fps on integrated graphics.
- The GeoJSON is simplified at fetch time if it exceeds 500 KB.

### 11. Testing

- **Vitest** on pure logic: category resolution against the tag table, height derivation,
  label fallbacks, bounds fitting, camera lng/lat ↔ metre conversion.
- **Manual QA checklist** in the README: both modes, transition in each direction, Esc and
  re-lock, hover tooltip, click-to-inspect, resize, category colours.
- An optional Playwright smoke test (page loads, places layer exists, mode switch works) is a
  nice-to-have, not a gate.

### 12. Deployment

Vercel static build (`vite build` → `dist`). No environment variables. README documents the data
refresh command, the category table, and attribution requirements.

## Decisions left to the builder

- Exact palette hex values, subject to contrast checks against the dark basemap.
- The free-view entry point and initial heading.
- Whether to add simple building collision in free view (nice-to-have; not required).
- Type scale and spacing of the overlays.
- Whether hover uses a `feature-state` highlight or a duplicated filtered layer.

## Risks

- **MapLibre 6 API drift.** The first-person helpers (`calculateCameraOptionsFromTo`,
  `centerClampedToGround`) exist in current docs; verify at scaffold time and fall back to
  `FreeCameraOptions` if the signature changed.
- **Sparse height data.** Most buildings have `building:levels` but almost none have `height`.
  Derived heights are plausible, not surveyed; the page should not claim precision.
- **Low buildings.** The campus is mostly one- and two-storey, so the 3D read depends on camera
  angle and shading more than on height.
- **Colour confetti.** Twelve categories can turn into noise. If it does, the fix is fewer
  categories and more neutral ground, not more colours.
- **OpenFreeMap outage.** Show a clear error overlay with a retry rather than an empty background.
