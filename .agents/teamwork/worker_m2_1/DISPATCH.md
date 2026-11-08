# DISPATCH — worker_m2_1

## Objective
Implement Milestone M2:
1. Integrate **Kontur Population Türkiye (`https://data.humdata.org/dataset/kontur-population-turkiye`)** H3 Resolution 8 hexagons across Kandıra (`polygonToCells` full-district coverage + `konturPopulation` + `konturDensityPerKm2` + `parseKonturH3GeoJSON` & `createKonturExportGeoJSON` + UI layer/coverage switcher & GeoJSON Import/Export).
2. Make **WebGL (`MapLibre GL`)** the default map mode (`basemapMode = 'webgl'`) with 4 keyless open-source tile styles (`Carto Voyager`, `Carto Positron`, `Carto Dark Matter`, `OSM Standart`), normalized 3D `fill-extrusion-height` expressions (zero negative height or camera spike errors), WebGL neighborhood markers/labels, and zero API key errors/warnings.
3. Expand `tests/e2e-suite.ts` and `TEST_READY.md` to thoroughly test Feature F7 (Kontur Population Türkiye H3 Res-8) and Feature F5 (Default Keyless WebGL MapLibre) across Tiers 1–4 (`≥100` passing test assertions), and add `"test": "npx tsx tests/e2e-suite.ts"` to `package.json`.

## Mandatory Reading
1. `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/antigravity/agents.md`
3. `/home/antigravity/akinba/kanlica-mahalle-kartlari/PROJECT.md`
4. `/home/antigravity/akinba/kanlica-mahalle-kartlari/TEST_INFRA.md`
5. `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_m2_kontur_webgl/handoff.md`

## Tasks to Implement
1. **`src/types/kandira.ts`**:
   - Add `export type H3CoverageMode = 'kontur_full' | 'mahalle_catchment';`
   - Extend `H3CellProperties` with `fid?: number`, `h3: string`, `konturPopulation: number`, `konturDensityPerKm2: number`, and `dataSource?: 'kontur_hdx_2023' | 'kandira_adnks_cbs' | 'kontur_custom_upload'`.
2. **`src/utils/h3SpatialEngine.ts`**:
   - Import `polygonToCells`, `cellArea`, `isValidCell`, `getResolution`, `cellToParent`, `cellToCenterChild` from `'h3-js'`.
   - Export `KANDIRA_DISTRICT_POLYGON` and `KONTUR_DATASET_METADATA` (`id: 'kontur-population-turkiye'`, `title: 'Türkiye: Population Density for 400m H3 Hexagons'`, `provider: 'Kontur / Humanitarian Data Exchange (HDX)'`, `releaseDate: '2023-11-01'`, `license: 'CC BY 4.0'`, `hdxUrl: 'https://data.humdata.org/dataset/kontur-population-turkiye'`, `resolution: 8`).
   - Update `generateKandiraH3GeoJSON(neighborhoods, year, resolution, weights, coverageMode = 'mahalle_catchment', customKonturMap?)` as specified in `explorer_m2_kontur_webgl/handoff.md`:
     - Preserve the 36 unique `isCoreCell: true` cells and zero Black Sea spillover.
     - When `coverageMode === 'kontur_full'`, also populate all land H3 cells inside `polygonToCells(KANDIRA_DISTRICT_POLYGON, resolution)` (plus any cells in `customKonturMap`), filtering out sea cells via `isInBlackSea`.
     - Populate `h3`, `konturPopulation`, `konturDensityPerKm2`, and `dataSource` on every feature.
   - Implement and export `parseKonturH3GeoJSON(jsonText: string)` and `createKonturExportGeoJSON(fc)` for importing/exporting standard Kontur GeoJSON (`{ fid, h3, population }`).
3. **`src/components/H3MapView.tsx`**:
   - Add `'konturPopulation'` (`Kontur Nüfus Yoğunluğu (HDX 400m H3)`) to `H3ThematicLayer` and `LAYER_CONFIGS` (8 thematic layers total).
   - Change `basemapMode` default state to `'webgl'` (`useState<'vector' | 'webgl'>('webgl')`).
   - Add `WebglTileStyle = 'voyager' | 'positron' | 'dark' | 'osm'` selector (`Carto Voyager`, `Carto Positron`, `Carto Dark`, `OSM Standart`) using 100% free, keyless public tile URLs (`https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png`, `light_all`, `dark_all`, `tile.openstreetmap.org`) and display a clear badge `"WebGL Aktif • API Anahtarsız Açık Kaynak Harita (CARTO / OSM)"`.
   - Fix MapLibre `fill-extrusion-height` expression to use normalized interpolation (`['interpolate', ['linear'], ['max', stops[0].value, ['to-number', ['get', activeLayer], 0]], stops[0].value, 60, stops[1].value, 450, stops[2].value, 1150, stops[3].value, 2200]`) so negative values (`popChange5YrPct`) or large population counts (`konturPopulation`, `summerPopEstimate`) never cause MapLibre paint errors or spikes.
   - Add a `kandira-neighborhood-pins` GeoJSON point source + circle & symbol layers in WebGL mode so neighborhood pins & labels render on the WebGL map and respond to `showLabels` and click events.
   - Ensure graceful headless fallback: if WebGL context creation fails in a restricted headless environment without GPU, render the SVG studio view seamlessly without throwing uncaught errors or displaying any API key / WebGL error banner.
   - Add the **Kontur H3 Kapsam Seçici** (`Mahalle Havzası` vs `Kontur Tam Saha (HDX H3)`) and **Kontur GeoJSON İndir / Yükle** controls in the H3 Map toolbar, and show `konturPopulation` & `konturDensityPerKm2` inside the H3 Cell Inspector HUD.
4. **`package.json`, `tests/e2e-suite.ts`, and `TEST_READY.md`**:
   - Add `"test": "npx tsx tests/e2e-suite.ts"` to `package.json`.
   - Extend `tests/e2e-suite.ts` with Feature `F7` (Kontur Population Türkiye H3 Res-8 full-polygon coverage, `h3`/`konturPopulation`/`konturDensityPerKm2` validation, `parseKonturH3GeoJSON` & `createKonturExportGeoJSON` round-trip, and Scenario `T4-S7`) and verify `basemapMode = 'webgl'` default + keyless tile styles + normalized `fill-extrusion-height` in `F5` tests.
   - Update `TEST_READY.md` with the new test counts (`≥100` passing assertions).
5. Run `npm run build`, `node scripts/build-standalone-html.mjs`, and `npm test` (`npx tsx tests/e2e-suite.ts`) and document all outputs in `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/worker_m2_1/handoff.md`.
