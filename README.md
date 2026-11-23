# SENATI Campus Map

A single-screen 3D landing page for the **SENATI Sede Principal** campus in San Martín de Porres, Lima, Peru.

- **Campus:** SENATI Sede Principal (Av. Alfredo Mendiola 3520, Independencia / San Martín de Porres, Lima)
- **Plus Code:** `2W2Q+89 San Martín de Porres, Peru`
- **Coordinates:** `[-77.0604, -11.999]` (centre of `src/data/campus.json`)

The map fills the viewport with zero page scrolling. Places are loaded from committed OpenStreetMap GeoJSON data and drawn as category-coloured dots with labels; buildings are not drawn at rest. Hovering a dot reveals its footprint at 35 % opacity with a thin outline, plus a top-centre tooltip showing the place name and category. Visitors explore a single always-on 3D campus overview: drag to pan, scroll to zoom, and right-drag (or Ctrl-drag) to rotate and tilt at roughly 0.4°/px. The bottom-left category legend is the only controls panel.

---

## Tech Stack

- **Framework:** Vite 6 · React 19 · TypeScript 5.7
- **Styling:** Tailwind CSS 4 · Inter Variable font
- **Mapping:** MapLibre GL JS 5 (with vector tiles from OpenFreeMap Liberty style)
- **State:** Zustand 5
- **Testing:** Vitest 3 · Testing Library · MapLibre GL Style Spec validator
- **Deployment:** Static hosting on Vercel (no runtime server, API keys, or environment variables)

---

## Commands

```bash
# Install dependencies
pnpm install

# Start local development server
pnpm dev

# Run Vitest unit & integration test suite
pnpm test

# Run TypeScript type check
pnpm typecheck

# Build production bundle in dist/
pnpm build

# Refresh campus place data from Overpass API (requires network)
pnpm data

# Transform a saved Overpass JSON response offline
pnpm data --from-file overpass.json
```

---

## Campus Data Refresh (`pnpm data`)

Campus places are pre-fetched from OpenStreetMap via the Overpass API and saved to `src/data/places.geojson`. There are **no runtime Overpass calls** when loading the site.

The Overpass query queries nodes, ways, and relations within the campus bounding box with a 90-second timeout:

```overpass
[out:json][timeout:90];
(
  nwr["building"](-12.0018,-77.0635,-11.9965,-77.0575);
  nwr["amenity"](-12.0018,-77.0635,-11.9965,-77.0575);
  nwr["shop"](-12.0018,-77.0635,-11.9965,-77.0575);
  nwr["leisure"](-12.0018,-77.0635,-11.9965,-77.0575);
  nwr["tourism"](-12.0018,-77.0635,-11.9965,-77.0575);
  nwr["landuse"](-12.0018,-77.0635,-11.9965,-77.0575);
);
out geom;
```

> **Note:** The Overpass server may take 30–90 seconds or occasionally rate-limit during peak hours. If it fails, retry after a few moments or pass a local JSON snapshot with `--from-file`.

At build/fetch time, `scripts/fetch-places.ts`:
1. Resolves OSM tags against the closed eleven-category table. Unknown features are dropped.
2. Assigns English generic labels only to unnamed park and pitch areas (*Park*, *Pitch*).
3. Drops any feature with neither an OSM name nor a generic label, so no `Unnamed …` place is ever rendered.
4. Commits clean GeoJSON in `src/data/places.geojson`. Derived heights (`levels * 3.2m`, clamped to 4–60 m) stay in the data as informational metadata but are not displayed.

---

## Editing Categories (`src/categories.ts`)

`src/categories.ts` is the single source of truth for place categorisation, colors, and render styles.

The eleven categories are education, food, market, shop, park, sport, worship, finance, health, community and entertainment.

Each category defines:
- `id`: unique `CategoryId` identifier
- `label`: English display name for the hover tooltip
- `color`: hex color code from the fixed design palette
- `style`: `'fill'` for solid area fills, or `'outline'` for outline/tinted areas
- `genericLabel` (optional): English fallback label for unnamed areas (e.g. `Park`)
- `matches`: tag-matching predicate `(tags: Record<string, string>) => boolean`

### Palette Tokens
- **Sky (`#5aa9e6`):** Education & Community
- **Coral (`#ef6f6c`):** Food & Drink
- **Amber (`#f2b134`):** Market
- **Violet (`#9b7ede`):** Shop & Entertainment
- **Lime (`#8bc34a`):** Park & Garden
- **Teal (`#2ec4b6`):** Sport & Health
- **Pink (`#e56b9f`):** Worship
- **Bone (`#e8e2d6`):** Finance
- **Orange (`#f08a3c`) and slate (`#6b7a8f`):** part of the fixed palette, not assigned to a current category

---

## Manual QA Checklist

Before deploying or after visual changes, verify the following in a desktop browser:

- [ ] **Campus framing:** The overview fits the campus box cleanly on load at 1280×800, 1440×900, and 1920×1080 viewports without page scrollbars.
- [ ] **Camera controls:**
  - No separate controls card is present; the category legend is the only panel.
  - Right-drag and Ctrl-drag rotate the map in the inverted direction at roughly 0.4°/px; an opposite drag restores the original frame.
  - Vertical drag tilts with the native sign and stops hard at 60°; it cannot go below 0°.
  - Left-drag pans freely in any direction, with no bounds clamp or snap-back.
  - Scrolling out stops at zoom 12; further scrolling does not change the view.
- [ ] **Resize:** Resizing the window re-fits the single overview, with no page scrollbars at 1280×800, 1440×900 and 1920×1080.
- [ ] **Feature hover & inspection:**
  - Places render as coloured dots with labels; buildings are not drawn at rest and uncategorised OSM features are dropped at fetch time.
  - Hovering a dot shows a pointer cursor, reveals its footprint at ~35 % opacity with a thin outline, and shows a top-centre tooltip with the name above the category label. Point-only places show the tooltip and enlarged dot without a polygon.
  - Clicking a place does nothing: there is no dialog, close button or `Esc` handler. Leaving the dot clears the tooltip and footprint.
  - Toggling a category in the legend immediately hides its dots and labels and clears any active hover.
  - No `Unnamed …` place or label appears anywhere; unnamed parks and pitches fall back to *Park* and *Pitch*, named ones keep their OSM name.
  - Every category colour is distinguishable on the dark basemap.
- [ ] **Accessibility:**
  - The tooltip is hover-only with no interactive controls to tab through; the map canvas keeps focus rings (`#5aa9e6`).
- [ ] **Reduced motion & transparency:**
  - Enabling `prefers-reduced-motion` changes nothing visually now that there are no camera transitions.
  - Enabling `prefers-reduced-transparency` disables backdrop blur filters.
- [ ] **Error handling & recovery:**
  - When tile network requests fail or WebGL is disabled, the error overlay displays with an informative message and a functional "Retry" button.

---

## Deploying to Vercel

The app is a static site; no API keys, environment variables or server functions are needed.

- **Framework preset:** Vite
- **Build command:** `pnpm build`
- **Output directory:** `dist`
- **Install command:** `pnpm install` (Vercel's default for a `pnpm-lock.yaml` repo)

Deploy from the CLI with `pnpm dlx vercel --prod`, or import the repository in the Vercel dashboard with the settings above. After deployment, confirm the production URL shows the 3D map, the OpenFreeMap/OSM attribution, and the 3D campus overview.

---

## Attribution

- **Map Data:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- **Basemap Tiles & Style:** [OpenFreeMap](https://openfreemap.org/) (Liberty style)
