# Project: Kocaeli Kandıra Mahalle Kartları & H3 Mekansal Karar Destek Sistemi

## Architecture
- **Stack**: React 18.3.1 + TypeScript 5.6.3 + Vite 5.4.11 + Tailwind CSS 3.4.15 + `h3-js` 4.1.0 + `maplibre-gl` 4.7.1 + `lucide-react` 0.460.0.
- **Multi-Agent Architecture (`agents.md`)**:
  - **Primary Agent (Orchestrator)**: Gemini Argon Medium — high-level planning, architecture design, step-by-step delegation, and reviewing.
  - **Sub-Agent (Worker / Fast Execution)**: Gemini Flash Medium (`Model="flash"`) — tool calling, shell execution, code edits, and quick file inspection.
- **Module Boundaries & Data Flow**:
  - `src/types/kandira.ts`: Core domain types (`NeighborhoodZone`, `SurveyYear`, `YearlyDemographic`, `VulnerableGroupMetrics`, `LandUseChangeMetrics`, `ServiceDevelopmentMetrics`, `NeighborhoodData`, `VulnerabilityWeights`, `H3CoverageMode`, `H3CellProperties` including `h3`, `konturPopulation`, `konturDensityPerKm2`, `dataSource`, `DistrictSummaryMetrics`).
  - `src/data/kandiraNeighborhoods.ts`: Complete 36-neighborhood dataset (`KND-01` to `KND-36`) across 4 spatial zones (`merkez`: 5, `kiyi_turizm`: 10, `kirsal_tarim`: 13, `kirsal_orman`: 8) with 2021–2025 time series.
  - `src/utils/h3SpatialEngine.ts`: Genuine Uber H3 hexagonal indexing (`latLngToCell`, `gridDisk`, `polygonToCells`, `cellToBoundary`, `cellToLatLng`, `cellArea`, `greatCircleDistance`, `isValidCell`) at Resolution 7 & 8 with core-cell bijection, Black Sea coastline clipping, **Kontur Population Türkiye (HDX 400m H3 Res-8)** full-district `polygonToCells` grid (~947 Res-8 hexagons), `parseKonturH3GeoJSON` & `createKonturExportGeoJSON` utilities, dynamic policy-weighted vulnerability index calculation (`calculateDynamicVulnerabilityScore`), and district aggregations (`getDistrictSummaryMetrics`).
  - `src/components/NeighborhoodCard.tsx`: Mahalle Kartı summary card with H3 Res-8 badge, 2021–2025 population sparkline, summer peak badge, vulnerable group indicators, stacked land-use bar, and health/education status pills.
  - `src/components/NeighborhoodDetailDrawer.tsx`: Deep-dive slide-over report sheet covering all 5 pillars (5-year population chart/table, vulnerable groups & risk factors, 5-year land use shifts in both `%` and `hektar`, health/education/infrastructure scorecard, and decision-support recommendations).
  - `src/components/H3MapView.tsx`: **WebGL-default** (`basemapMode = 'webgl'`) H3 hexagonal spatial studio using **MapLibre GL** with 5 keyless open-source basemap styles (`Açık Gri Altlık (Esri Light Gray)`, `OSM Standart`, `Uydu (Esri Satellite)`, `Topografik Arazi (OpenTopo)`, `Koyu Gri Altlık (Esri Dark Gray)` — 100% keyless open basemaps, zero watermarks), WebGL neighborhood markers/labels, **Kontur Population Türkiye (HDX H3 Res-8)** thematic layer (`konturPopulation`) + live Kontur GeoJSON Import/Export toolbar, and 2D choropleth map.
  - `src/components/ComparisonView.tsx`: Side-by-side multi-neighborhood comparison matrix (up to 4 neighborhoods).
  - `src/components/TimeSliderBar.tsx`: Interactive 2021–2025 year stepper and playback controller.
  - `src/components/WeightSimulatorDrawer.tsx`: Interactive 5-criteria policy weight simulator (`elderlyWeight`, `socialAidWeight`, `healthAccessWeight`, `educationAccessWeight`, `landPressureWeight`).
  - `src/App.tsx`: Main application shell with 6-card District KPI Ribbon, 4 main tabs (`mahalle-kartlari`, `h3-harita`, `karsilastirma`, `bolgesel-analiz`), search/zone filtering, and JSON/CSV export utility.

## Code Layout
- `src/types/kandira.ts` — Domain TypeScript interfaces
- `src/data/kandiraNeighborhoods.ts` — 36 Kandıra neighborhoods seed data & 2021–2025 generator
- `src/utils/h3SpatialEngine.ts` — H3 hexagonal spatial engine, Kontur Population Türkiye (HDX H3 Res-8) engine & vulnerability index calculator
- `src/components/*.tsx` — Modular React UI components
- `src/App.tsx` — Main application container & navigation
- `scripts/build-standalone-html.mjs` — Standalone single-file HTML bundler
- `tests/e2e-suite.ts` — Comprehensive automated 4-Tier + Tier-5 E2E test runner (`npm test`)

## Feature Inventory
Every feature from the Survey phase and User Follow-up (`2026-11-08T14:11:04Z`) is mapped below:
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | 5-Year Population Changes (2021–2025) | Total/male/female population, 5-year change %, net migration ‰, summer population multiplier, SVG sparkline & yearly table | M1 | ORIGINAL_REQUEST / Survey |
| F2 | Vulnerable Groups Analysis | 65+ elderly count/%, elderly living alone, 0–14 children, disability & social aid households, seasonal agricultural workers, chronic illness, dynamic composite vulnerability score (0–100) & policy weight simulator | M1 | ORIGINAL_REQUEST / Survey |
| F3 | Geographic Land Use Changes (2021–2025) | Forest, agriculture/hazelnut, and built-up surface shifts in both `%` and `hektar (ha)`, 5-year building permits, impervious surface growth %, and land-change category classification | M1 | ORIGINAL_REQUEST / Survey |
| F4 | Health, Education & Infrastructure Developments | ASM count, physicians, pharmacies, hospital distance, ambulance ETA (min), mobile health visits, school counts, bussed students, student/teacher ratio, internet lab, fiber %, water status, 5-year trends (`gelisti`/`sabit`/`kritik`) & recent investment logs | M1 | ORIGINAL_REQUEST / Survey |
| F5 | H3 Hexagonal Map Tab (`h3-harita`) — Default Keyless WebGL MapLibre | Default `basemapMode = 'webgl'` using MapLibre GL with 5 keyless open-source tile styles (`Esri Light Gray`, `OSM Standart`, `Esri Satellite`, `OpenTopoMap`, `Esri Dark Gray`), zero API key errors/warnings/watermarks, WebGL neighborhood pins/labels, 36 unique core cells (`isCoreCell` 1-to-1 bijection), and Black Sea coastline clipping | M1, M2 | ORIGINAL_REQUEST / Survey |
| F6 | Neighborhood Cards, Comparison Matrix & Regional Analysis | Filterable/sortable Mahalle Kartları grid, slide-over detailed report sheet (`NeighborhoodDetailDrawer`), 4-neighborhood side-by-side comparison matrix (`ComparisonView`), regional zone synthesis (`bolgesel-analiz`), and valid quick-jump navigation | M1 | ORIGINAL_REQUEST / Survey |
| F7 | Kontur Population Türkiye (HDX H3 Resolution 8) Integration | Full-district Kandıra `polygonToCells` H3 Res-8 & Res-7 Kontur grid (`h3`, `konturPopulation`, `konturDensityPerKm2`, `dataSource`), `'konturPopulation'` thematic layer (`Kontur Nüfus (HDX)`), coverage mode toggle (`kontur_full` vs `mahalle_catchment`), and live Kontur GeoJSON Import/Export (`parseKonturH3GeoJSON` / `createKonturExportGeoJSON`) | M2 | ORIGINAL_REQUEST (Follow-up) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Base H3 Bijection, Coastline Clipping, Land-Use Hectares & E2E Infra | Resolve H3 core cell collisions at Res 7 & 8, clip Black Sea H3 ring spillover, add `educationAccessMin` H3 layer, add explicit hectare (`ha`) land-use metrics in detail drawer, fix quick-jump IDs in `App.tsx`, fix standalone bundler regex & `index.html` metadata | none | DONE |
| M2 | Kontur Population Türkiye (HDX H3 Res-8) & Default Keyless WebGL MapLibre | Integrate Kontur Population Türkiye (`kontur-population-turkiye`) H3 Res-8 grid (`polygonToCells`, `konturPopulation`, `konturDensityPerKm2`, GeoJSON import/export), make WebGL (`MapLibre GL`) the default map mode with 4 keyless open-source tile styles and normalized 3D `fill-extrusion` heights (zero API key errors), and verify 100% E2E test suite | M1 | IN_PROGRESS |

## Interface Contracts
### `src/utils/h3SpatialEngine.ts` ↔ `src/components/H3MapView.tsx`
- `generateKandiraH3GeoJSON(neighborhoods: NeighborhoodData[], year: SurveyYear, resolution: 7 | 8, weights?: VulnerabilityWeights, coverageMode?: H3CoverageMode, customKonturMap?: ReadonlyMap<string, number>): KandiraH3FeatureCollection`
  - Guarantees 36 unique `isCoreCell === true` features at both Resolution 7 and Resolution 8.
  - When `coverageMode === 'kontur_full'`, generates full Kandıra district polygon coverage via `polygonToCells(KANDIRA_DISTRICT_POLYGON, resolution)` (~947 H3 Res-8 cells, ~136 H3 Res-7 cells) clipped against the Black Sea coastline.
  - Populates `H3CellProperties` including `h3`, `konturPopulation`, `konturDensityPerKm2`, `dataSource`, `vulnerabilityScore`, `popChange5YrPct`, `elderlyPct`, `builtUpChange5YrPct`, `healthAccessMin`, `educationAccessMin`, and `summerPopEstimate`.
- `parseKonturH3GeoJSON(jsonText: string)` & `createKonturExportGeoJSON(fc: KandiraH3FeatureCollection)`
  - Parses and exports standard Kontur Population GeoJSON files (`{ fid, h3, population, konturDensityPerKm2 }`).
