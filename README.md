# Safar · Smart Trip Planner (Next.js 16 Static Export)

Full-parity Next.js `16.4.6` (App Router, React 19, TypeScript) implementation of **Safar · Smart Trip Planner** (`https://safar-trip.pages.dev/`), built as a zero-database static application (`output: "export"`) ready for one-click **GitHub Pages** deployment.

## Features

- **Interactive 3D Globe (`/`):** MapLibre GL 3D globe with custom India official boundary overlay (`borders.geojson`), auto-rotating intro view, great-circle route arcs, animated flight planes, and colour-coded destination pins.
- **Complete Trip & Budget Engine:**
  - **22 Indian starting cities** & **41 curated destinations** (30 across India + 11 budget-friendly international destinations).
  - **12 vibes**, logarithmic **₹2,500 – ₹3,00,000** slider + quick presets, per-person vs total-group mode, days (`1–21`) & travellers (`1–12`) steppers, stay comfort (`Hostel` / `Budget` / `3★–4★` / `Luxury`), transport filter + per-destination mode switcher (`Flight` / `Train` / `Bus` / `Drive`), max one-way travel hours, month & weather preference, 6 smart toggles, and 4 sort modes.
  - **Live Flight Fares:** Proxied `/api/fare` in `next dev`, optional `NEXT_PUBLIC_FARE_API` Worker override, and build-time `public/fares-cache.json` snapshot (`scripts/fetch-fares.mjs`) so static GitHub Pages deployments show real Aviasales/Travelpayouts return fares without CORS errors.
  - **Detail View:** Stacked rupee breakdown bar, round-trip transport comparison, live booking links (Skyscanner, Ixigo, RedBus, Booking.com, Agoda, Hostelworld, Klook, Airalo eSIM), day-by-day timeline itinerary, local food chips, tips/skips, group bill splitter, and 1-tap WhatsApp / clipboard / Web Share URL hash deep links (`#trip=goa`, `#from=delhi&budget=10000&days=4`).
- **50 Static SEO Travel Guides (`/guides/` & `/guides/[slug]/`):**
  - 41 destination budget & itinerary guides + 9 city budget roundup guides (`trips-under-10000-from-delhi`, etc.) with `CollectionPage`, `Article`, `TouristDestination`, `ItemList`, `FAQPage`, and `BreadcrumbList` JSON-LD schemas.
- **Installable PWA & Android App Pages (`/app/`, `/get-app/`):**
  - Service worker (`public/sw.js`), Web App Manifest (`/manifest.webmanifest`), iOS Home Screen install sheet, Android APK download (`/downloads/safar-trip-planner.apk`), `/robots.txt`, and `/sitemap.xml`.
- **Responsive Mobile UI & Day/Night Theme:** Bottom tab bar (`Map` / `Filters` / `Trips`), collapsible bottom sheet, and persistent Day/Night theme toggle.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. In development, `/api/fare` automatically proxies live flight queries to `https://safar-fares.safar-trips.workers.dev/api/fare`.

## Testing, Linting & Static Export

```bash
npm test          # Vitest unit suite for pricing, transport, itinerary & guide parity
npm run lint      # ESLint (Next.js core-web-vitals + TypeScript)
npm run build     # Prefetches live fares into public/fares-cache.json & exports static site to ./out
```

To build for a GitHub Pages project subpath (for example `/safar-trip`):

```bash
NEXT_PUBLIC_BASE_PATH=/safar-trip NEXT_PUBLIC_SITE_URL=https://<owner>.github.io npm run build
```

## GitHub Pages Deployment

`.github/workflows/deploy.yml` automatically configures `NEXT_PUBLIC_BASE_PATH` and `NEXT_PUBLIC_SITE_URL` via `actions/configure-pages@v5`, snapshots fresh live flight fares, builds `./out`, and deploys to GitHub Pages on every push to `main`.

