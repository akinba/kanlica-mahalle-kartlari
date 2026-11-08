# DISPATCH — explorer_m2_kontur_webgl

## Objective
Investigate:
1. Exactly why the user saw an "API key error" in the Map tab (`src/components/H3MapView.tsx` or anywhere in `src/`) and how `basemapMode === 'webgl'` (MapLibre GL) is currently configured.
2. How to make WebGL (`MapLibre GL`) the **default** map mode (`basemapMode` defaulting to `'webgl'`) with **100% free, keyless open-source basemap styles/tiles** (e.g., CartoDB Positron / Voyager / Dark Matter GL style or raster tiles `https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png` / `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, plus a built-in vector/canvas fallback layer so even offline/headless environments render WebGL `fill-extrusion` and `line` H3 hexagons with zero errors or API key prompts).
3. How to integrate **Kontur Population Türkiye (`https://data.humdata.org/dataset/kontur-population-turkiye`)** H3 Resolution 8 hexagons for Kandıra:
   - Check if `https://data.humdata.org/dataset/kontur-population-turkiye` (or HDX API `https://data.humdata.org/api/3/action/package_show?id=kontur-population-turkiye`) is reachable or what exact schema Kontur Population uses (`h3` index at Resolution 8 + `population` count, EPSG:4326 / GeoPackage / GeoJSON).
   - Design a complete **Kontur Population Türkiye (HDX H3 Res-8)** integration in `src/utils/h3SpatialEngine.ts` and `src/components/H3MapView.tsx` that:
     a) Provides a built-in Kandıra **Kontur H3 Res-8 Population Grid** (covering Kandıra's full land polygon with realistic Kontur H3 Res-8 cells `h3` + `population` calibrated to Kontur / GHSL / ADNKS 400m hex density, plus a thematic layer `'konturPopulation'` / dataset mode toggle `"Kontur Population Türkiye (HDX H3 Res-8)"` vs `"ADNKS + CBS Mahalle Modeli"`), AND
     b) Provides an interactive **"Kontur GeoJSON / H3 İçe Aktar & İndir"** modal/control on the H3 Map tab so users can also upload/import any custom Kontur GeoJSON (`{ "h3": "882d35...", "population": 123 }`) or export the Kandıra Kontur H3 Res-8 GeoJSON directly!

Write your findings to `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_m2_kontur_webgl/handoff.md` and notify `4180dda031afd7c85f4ed5941ae5ae6a`.


## 2026-11-08T14:12:41Z
You are `explorer_m2_kontur_webgl` (archetype: `teamwork_preview_explorer`, running on Gemini Flash per `agents.md`).
Your working directory is: `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/explorer_m2_kontur_webgl`
Your parent orchestrator conversation ID is: `4180dda031afd7c85f4ed5941ae5ae6a`
Tasks: Inspect `src/components/H3MapView.tsx` and `src/` for API key warning/error & WebGL setup; check HDX API metadata for `kontur-population-turkiye`; design Milestone M2 specification for WebGL MapLibre default + Kontur Population Türkiye (HDX H3 Res-8) integration.
