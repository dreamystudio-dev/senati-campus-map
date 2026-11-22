# SENATI Campus Map

A single-screen 3D landing page for the **SENATI Sede Principal** campus in San Martín de Porres, Lima, Peru.

- **Campus:** SENATI Sede Principal (Av. Alfredo Mendiola 3520, Independencia / San Martín de Porres, Lima)
- **Plus Code:** `2W2Q+89 San Martín de Porres, Peru`
- **Coordinates:** `[-77.0602, -11.9984]`

The map fills the viewport with zero page scrolling. Places are loaded from committed OpenStreetMap GeoJSON data and styled with category-specific palette colours and 3D extrusions. Visitors can explore via two complementary camera modes: an overview **Top View** and an interactive first-person **Free View** with WASD walking controls.

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
  nwr["building"](-12.0010,-77.0635,-11.9960,-77.0570);
  nwr["amenity"](-12.0010,-77.0635,-11.9960,-77.0570);
  nwr["leisure"](-12.0010,-77.0635,-11.9960,-77.0570);
  nwr["shop"](-12.0010,-77.0635,-11.9960,-77.0570);
  nwr["tourism"](-12.0010,-77.0635,-11.9960,-77.0570);
  nwr["landuse"](-12.0010,-77.0635,-11.9960,-77.0570);
);
out body;
>;
out skel qt;
```

> **Note:** The Overpass server may take 30–90 seconds or occasionally rate-limit during peak hours. If it fails, retry after a few moments or pass a local JSON snapshot with `--from-file`.

At build/fetch time, `scripts/fetch-places.ts`:
1. Resolves OSM tags against the closed category table. Unknown non-building features are dropped.
2. Derives building heights (`levels * 3.2m`, clamped between 4m and 60m).
3. Assigns fallback Spanish labels to unnamed areas (e.g. *Parque*, *Cancha*, *Estacionamiento*).
4. Commits clean GeoJSON in `src/data/places.geojson`.

---

## Editing Categories (`src/categories.ts`)

`src/categories.ts` is the single source of truth for place categorisation, colors, and render styles.

Each category defines:
- `id`: unique `CategoryId` identifier
- `label`: English display name for tooltips and info cards
- `color`: hex color code from the fixed design palette
- `style`: `'fill'` for solid polygons/extrusions, or `'outline'` for outlines and tinted areas
- `genericLabel` (optional): Spanish fallback label for unnamed features (e.g. `Parque`)
- `matches`: tag-matching predicate `(tags: Record<string, string>) => boolean`

### Palette Tokens
- **Sky (`#5aa9e6`):** Education
- **Coral (`#ef6f6c`):** Food & Drink
- **Amber (`#f2b134`):** Market
- **Violet (`#9b7ede`):** Shop
- **Lime (`#8bc34a`):** Park & Garden
- **Teal (`#2ec4b6`):** Sport
- **Pink (`#e56b9f`):** Worship
- **Bone (`#e8e2d6`):** Finance & Art
- **Orange (`#f08a3c`):** Fuel
- **Slate (`#6b7a8f`):** Parking & Construction / Uncategorised buildings (`#2a303b`)

---

## Manual QA Checklist

Before deploying or after visual changes, verify the following in a desktop browser:

- [ ] **Top View bounds:** Fits the campus box cleanly at 1280×800, 1440×900, and 1920×1080 viewports without page scrollbars.
- [ ] **Camera limits:** Pitch in top view stops hard at 60°; zoom stays clamped between 15.5 and 19.5; camera cannot be dragged outside padded bounds.
- [ ] **Free View navigation:**
  - Enters smoothly at the drone vantage facing the campus.
  - `W` / `A` / `S` / `D` moves forward, left, backward, right.
  - `Q` / `E` pans camera left and right.
  - Mouse look aims direction when pointer is locked.
  - `Esc` releases pointer lock.
  - Clicking empty canvas re-engages pointer lock.
- [ ] **Feature hover & inspection:**
  - Hovering a place shows cursor pointer, white highlight fill/outline, and floating tooltip.
  - Clicking a place opens `InfoCard` dialog with category chip, title, metadata, and close button.
  - Unnamed parks show the generic label ("Parque"), not blank.
  - Unnamed buildings display cleanly with neutral colour.
  - Pressing `Esc` closes `InfoCard` and restores focus to map canvas.
- [ ] **Accessibility:**
  - Keyboard navigation: `Tab` cycles focus to Top/Free buttons and active controls with visible focus rings (`#5aa9e6`).
  - Screen reader live region announces mode changes ("Free view" / "Top view").
- [ ] **Reduced motion & transparency:**
  - Enabling `prefers-reduced-motion` makes camera mode transitions instant (`duration: 0`).
  - Enabling `prefers-reduced-transparency` disables backdrop blur filters.
- [ ] **Error handling & recovery:**
  - When tile network requests fail or WebGL is disabled, the error overlay displays with an informative message and a functional "Retry" button.

---

## Attribution

- **Map Data:** © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright)
- **Basemap Tiles & Style:** [OpenFreeMap](https://openfreemap.org/) (Liberty style)
