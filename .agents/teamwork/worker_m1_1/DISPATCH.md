# DISPATCH — worker_m1_1

## Objective
Implement Milestone M1 refinements for the Kocaeli Kandıra Mahalle Kartları web application based on the Survey Explorer findings (`explorer_survey_1`, `explorer_survey_2`, `explorer_survey_3`) and `PROJECT.md`.

## Mandatory Reading
1. `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/antigravity/agents.md`
3. `/home/antigravity/akinba/kanlica-mahalle-kartlari/PROJECT.md`
4. `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_survey_3/handoff.md`

## Write Ownership (Exclusive to `worker_m1_1`)
- `src/utils/h3SpatialEngine.ts`
- `src/components/H3MapView.tsx`
- `src/components/NeighborhoodDetailDrawer.tsx`
- `src/App.tsx`
- `scripts/build-standalone-html.mjs`
- `vite.config.ts`
- `index.html`

## Tasks to Implement
1. **`src/utils/h3SpatialEngine.ts`**:
   - **Fix H3 Core Cell Collision at Resolution 7 & 8**: When iterating over `neighborhoods` in `generateKandiraH3GeoJSON`, if `cellMap.get(rawCoreH3)?.isCoreCell` is already `true` (claimed by another nearby central neighborhood such as Akdurak/Aydınlık/Çarşı), pick the nearest unclaimed cell from `gridDisk(rawCoreH3, 1)` (or `gridDisk(rawCoreH3, 2)` as fallback) sorted by `greatCircleDistance([lat, lng], cellToLatLng(candidate), UNITS.km)` as that neighborhood's dedicated `coreH3`. Guarantee that all 36 neighborhoods (`KND-01`..`KND-36`) have a unique `isCoreCell: true` feature in the output `FeatureCollection` at both Resolution 7 and Resolution 8!
   - **Clip Black Sea Spillover for Non-Core Ring Cells**: Add a deterministic helper `isInBlackSea(lat: number, lng: number): boolean` that checks if a coordinate lies north of Kandıra's Karadeniz shoreline (matching the coastline profile in `H3MapView.tsx`, e.g., interpolating coastline latitude across `lng` from `30.01` to `30.40` so that every neighborhood's core coordinate is on land, while open-sea ring cells north of the shoreline are excluded when `!isCore`).
2. **`src/components/H3MapView.tsx`**:
   - Add `'educationAccessMin'` (`Eğitim Erişimi (Dk)`) to `H3ThematicLayer` and `LAYER_CONFIGS` so both Health (`healthAccessMin`) and Education (`educationAccessMin`) are directly selectable on the H3 hexagon map.
3. **`src/components/NeighborhoodDetailDrawer.tsx`**:
   - In the Geographic & Land Use Change section (Coğrafi & Arazi Değişimi), display explicit hectare (`ha`) values (`(neighborhood.areaKm2 * pct).toFixed(1) ha`) alongside the 2021 and 2025 percentages for Forest, Agriculture/Hazelnut, and Built-up areas so users can inspect both `%` and `hektar` shifts.
4. **`src/App.tsx`**:
   - In the H3 map quick-jump strip (`activeTab === 'h3-harita'`), replace the 2 non-existent neighborhood IDs `'saricaali'` and `'akcaova'` with valid rural neighborhood IDs `'karaagac'` and `'sarniclar'`.
5. **`scripts/build-standalone-html.mjs` & `vite.config.ts` & `index.html`**:
   - In `scripts/build-standalone-html.mjs`, update the CSS and JS asset regexes/replacements so that multiple JS chunks or `./assets/` relative paths are properly inlined into `dist/kandira_standalone.html` (or keep a single JS bundle if `build-standalone-html.mjs` inlines a single `<script>` tag, ensuring `npm run build && node scripts/build-standalone-html.mjs` succeeds and produces a working `dist/kandira_standalone.html` with zero un-inlined `./assets/` links).
   - In `index.html`, align the meta description (`36 temsilci mahallesi / 96 mahalle dokusu`) accurately.

## Verification
- Run `npm run build` and `node scripts/build-standalone-html.mjs`.
- Run a quick `npx tsx` verification confirming 36 unique `isCoreCell` features at both Res 7 and Res 8, and zero sea spillover cells.
- Document all commands and results in `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/worker_m1_1/handoff.md`.
