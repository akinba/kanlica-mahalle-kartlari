# BRIEFING — worker_m1_1

## Role & Archetype
- **Worker ID**: `worker_m1_1`
- **Archetype**: `flash_worker_subagent` (Gemini Flash Medium per `/home/antigravity/agents.md`)
- **Milestone**: M1 — Full Application Refinement, H3 Bijection/Clipping & E2E Verification

## Exclusive Write Scope
- `src/utils/h3SpatialEngine.ts`
- `src/components/H3MapView.tsx`
- `src/components/NeighborhoodDetailDrawer.tsx`
- `src/App.tsx`
- `scripts/build-standalone-html.mjs`
- `vite.config.ts`
- `index.html`

## Assigned Refinements
1. **`src/utils/h3SpatialEngine.ts`**:
   - Prevent H3 core cell collisions at Resolution 7 and Resolution 8 so all 36 neighborhoods (`KND-01`..`KND-36`) have a unique `isCoreCell: true` feature in `generateKandiraH3GeoJSON`.
   - Add `isInBlackSea(lat, lng)` coastline clipping helper so non-core H3 ring cells north of Kandıra's Karadeniz shoreline are excluded.
2. **`src/components/H3MapView.tsx`**:
   - Add `'educationAccessMin'` (`Eğitim Erişimi (Dk)`) to `H3ThematicLayer` and `LAYER_CONFIGS`.
3. **`src/components/NeighborhoodDetailDrawer.tsx`**:
   - Display explicit hectare (`ha`) values (`(neighborhood.areaKm2 * pct).toFixed(1) ha`) alongside 2021 and 2025 percentages for Forest, Agriculture/Hazelnut, and Built-up areas.
4. **`src/App.tsx`**:
   - Replace dead quick-jump neighborhood IDs `'saricaali'` and `'akcaova'` with valid IDs `'karaagac'` and `'sarniclar'`.
5. **`scripts/build-standalone-html.mjs` & `index.html`**:
   - Fix `./assets/` regexes in `scripts/build-standalone-html.mjs` so `npm run build && node scripts/build-standalone-html.mjs` produces a self-contained `dist/kandira_standalone.html` with zero un-inlined `./assets/` references.
   - Update `index.html` meta description to reference `36 temsilci mahallesi`.
