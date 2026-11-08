# DISPATCH — test_writer_e2e

## Objective
Create and run the comprehensive 4-Tier automated E2E Test Suite (`tests/e2e-suite.ts`) and publish `TEST_READY.md` at the project root per `TEST_INFRA.md` and `PROJECT.md`.

## Mandatory Reading
1. `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/antigravity/agents.md`
3. `/home/antigravity/akinba/kanlica-mahalle-kartlari/PROJECT.md`
4. `/home/antigravity/akinba/kanlica-mahalle-kartlari/TEST_INFRA.md`

## Write Ownership (Exclusive to `test_writer_e2e`)
- `tests/e2e-suite.ts`
- `TEST_READY.md`

## Tasks to Implement
1. Design and implement `tests/e2e-suite.ts` (runnable via `npx tsx tests/e2e-suite.ts`) covering all 6 features (`F1`..`F6`) across all 4 Tiers defined in `TEST_INFRA.md`:
   - **Tier 1 — Feature Coverage (≥6 tests per feature, ≥36 tests total)**:
     - `F1`: 5-year population series (`2021–2025`), total/male/female sum consistency, 5-year growth rate calculation, summer multiplier, net migration, district population summary.
     - `F2`: Vulnerable groups (`elderly65PlusCount`, `elderlyLivingAloneEst`, `children0To14Count`, `disabilitySupportHouseholds`, `socialAssistanceHouseholds`, `seasonalAgriculturalWorkers`, `chronicIllnessFollowupEst`), dynamic vulnerability score (`0–100`) under default and custom policy weights.
     - `F3`: Geographic land use changes (`forestPct`, `agriculturePct`, `builtUpPct` summing to 100%, 2021 vs 2025 shifts, hectare calculations `areaKm2 * pct`, building permits, `imperviousSurfaceChangePct`, `LandUseChangeCategory`).
     - `F4`: Health, education, and infrastructure developments (`asmCount`, `familyPhysicians`, `pharmacyCount`, `nearestHospitalKm`, `ambulanceEtaMin`, `mobileHealthVisitPerMonth`, schools, `bussedStudentsCount`, `studentPerTeacher`, `fiberBroadbandPct`, `drinkingWaterStatus`, 5-year trends & recent investments).
     - `F5`: H3 Hexagonal Spatial Engine & Map (`generateKandiraH3GeoJSON` at Resolution 7 & 8 across 2021–2025, valid closed GeoJSON polygons via `h3-js`, all 36 neighborhoods having a unique `isCoreCell === true` at both Res 7 and Res 8, Black Sea coastline clipping, and all 7 thematic layer properties present including `healthAccessMin` and `educationAccessMin`).
     - `F6`: UI components & source contract checks (`NeighborhoodCard`, `NeighborhoodDetailDrawer` with hectare display, `H3MapView` with 7 thematic layers, `ComparisonView`, `TimeSliderBar`, `WeightSimulatorDrawer`, valid quick-jump IDs in `App.tsx`, and standalone HTML generation).
   - **Tier 2 — Boundary & Corner Cases (≥6 tests per feature, ≥36 tests total)**:
     - Extreme weights (all zero weights fallback, single-criterion 100% weight, maximum weights), boundary years (`2021` vs `2025`), minimum/maximum neighborhood areas & altitudes, coastal max summer multiplier (`Kıncıllı/Kerpe 20x`), hyper-aged forest village (`Kırkarmut 43.8%`), zero-ASM rural village vs central urban hub, H3 Resolution 7 vs 8 cell counts and coordinate bounds.
   - **Tier 3 — Cross-Feature Pairwise Combinations (≥10 tests)**:
     - Year slider × H3 GeoJSON regeneration; Policy weights × H3 vulnerability scores; Zone filter × District summary metrics; Coastal summer surge × Water pressure & Ambulance ETA; Agricultural hazelnut share × Seasonal worker counts; Rural aging × Mobile health visits & Bussed education.
   - **Tier 4 — Real-World Decision Support Scenarios (≥6 scenarios)**:
     - S1: Coastal Tourism Peak & Infrastructure Stress Analysis (`Kefken`, `Kerpe`, `Cebeci`)
     - S2: Rural Forest Hyper-Aging & Mobile Health / Ambulance Triage (`Kırkarmut`, `Deliveli`, `Antaplı`)
     - S3: Agricultural Hazelnut Belt Seasonal Worker & Bussed Education Planning (`Karaağaç`, `Kaymaz`, `Çamkonak`)
     - S4: Central Urban Growth & Multi-Neighborhood Side-by-Side Comparison (`Akdurak`, `Kefken`, `Kırkarmut`)
     - S5: Dynamic Policy Weight Simulation Shift across 2021–2025 H3 Grid
     - S6: Production Bundle & Standalone HTML Offline Delivery Verification
2. Execute `npx tsx tests/e2e-suite.ts` and record the results.
3. Create `TEST_READY.md` at `/home/antigravity/akinba/kanlica-mahalle-kartlari/TEST_READY.md` following the required template, and write your handoff report to `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/test_writer_e2e/handoff.md`.


## 2026-11-08T14:00:44Z
You are `test_writer_e2e` (archetype: `teamwork_preview_test_writer`, running on Gemini Flash per `agents.md`).
Your working directory is: `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/test_writer_e2e`
Your parent orchestrator conversation ID is: `4180dda031afd7c85f4ed5941ae5ae6a`

MANDATORY READING BEFORE STARTING:
1. `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/ORIGINAL_REQUEST.md`
2. `/home/antigravity/agents.md`
3. `/home/antigravity/akinba/kanlica-mahalle-kartlari/PROJECT.md`
4. `/home/antigravity/akinba/kanlica-mahalle-kartlari/TEST_INFRA.md`
5. `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/test_writer_e2e/DISPATCH.md`

EXCLUSIVE WRITE OWNERSHIP:
You own exclusively: `tests/e2e-suite.ts` and `TEST_READY.md` (plus your `.agents/teamwork/test_writer_e2e/` directory). Do NOT modify any implementation files in `src/` or `package.json`.

Your tasks:
1. Write a comprehensive, self-contained automated E2E test suite at `/home/antigravity/akinba/kanlica-mahalle-kartlari/tests/e2e-suite.ts` (runnable via `npx tsx tests/e2e-suite.ts`) covering all 6 features (`F1`..`F6`) across Tiers 1, 2, 3, and 4 as specified in `TEST_INFRA.md` and `DISPATCH.md` (at least 80 distinct test assertions across Tiers 1–4).
2. Run `npx tsx tests/e2e-suite.ts` to verify its execution and output formatting.
3. Publish `/home/antigravity/akinba/kanlica-mahalle-kartlari/TEST_READY.md` following the exact template in `TEST_INFRA.md` / Project Pattern.
4. Maintain `BRIEFING.md` and `progress.md` in `/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/test_writer_e2e/`, write your detailed report to `handoff.md`, and notify `4180dda031afd7c85f4ed5941ae5ae6a` via `send_message`.
