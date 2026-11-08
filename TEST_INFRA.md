# E2E Test Infra: Kocaeli Kandıra Mahalle Kartları

## Test Philosophy
- Opaque-box, requirement-driven verification combined with deterministic H3 spatial invariants, Kontur Population Türkiye (HDX H3 Res-8) validation, and keyless WebGL MapLibre verification.
- Methodology: Category-Partition (Tier 1) + Boundary Value Analysis (Tier 2) + Pairwise Cross-Feature Combinatorial Testing (Tier 3) + Real-World Decision Support Scenarios (Tier 4).

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|---------------------|:------:|:------:|:------:|:------:|
| F1 | 5-Year Population Changes (2021–2025) | ORIGINAL_REQUEST §1 | ≥6 | ≥6 | ✓ | ✓ |
| F2 | Vulnerable Groups & Dynamic Vulnerability Index | ORIGINAL_REQUEST §2 | ≥6 | ≥6 | ✓ | ✓ |
| F3 | Geographic Land Use Changes (% & Hectares) | ORIGINAL_REQUEST §3 | ≥6 | ≥6 | ✓ | ✓ |
| F4 | Health, Education & Infrastructure Developments | ORIGINAL_REQUEST §4 | ≥6 | ≥6 | ✓ | ✓ |
| F5 | H3 Hexagonal Map Tab (Default Keyless WebGL MapLibre, Res 7 & 8, 8 Layers, Coastline Clipping) | ORIGINAL_REQUEST §5 & Follow-up §2 | ≥6 | ≥6 | ✓ | ✓ |
| F6 | Mahalle Kartları UI, Filters, Comparison Matrix & Standalone Build | ORIGINAL_REQUEST §1-5 | ≥6 | ≥6 | ✓ | ✓ |
| F7 | Kontur Population Türkiye (HDX H3 Res-8) Grid & GeoJSON Import/Export | ORIGINAL_REQUEST Follow-up §1 | ≥6 | ≥6 | ✓ | ✓ |

## Test Architecture
- **Test runner**: `tests/e2e-suite.ts` executed via `npm test` (`npx tsx tests/e2e-suite.ts`)
- **Pass/fail semantics**: Exits with code `0` only if 100% of test cases across Tiers 1–4 pass; non-zero exit code on any failure.
- **Directory layout**:
  - `tests/e2e-suite.ts` — Automated E2E test suite covering all 7 features (`F1`..`F7`) across Tiers 1, 2, 3, and 4 (≥100 distinct test assertions).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| S1 | Coastal Tourism Peak & Infrastructure Stress Analysis (Kefken, Kerpe, Cebeci in 2025) | F1, F3, F4, F5 | High |
| S2 | Rural Forest Hyper-Aging & Mobile Health / Ambulance Triage (Kırkarmut, Deliveli, Antaplı) | F1, F2, F4, F5 | High |
| S3 | Agricultural Hazelnut Belt Seasonal Worker & Bussed Education Planning (Karaağaç, Kaymaz, Çamkonak) | F1, F2, F3, F4 | Medium |
| S4 | Central Urban Growth & Multi-Neighborhood Side-by-Side Comparison (Akdurak vs Kefken vs Kırkarmut) | F1, F2, F3, F4, F6 | Medium |
| S5 | Policy Weight Simulation Shift (Health/Elderly Focus vs Land Pressure Focus across 2021–2025 H3 Grid) | F2, F3, F5, F6 | High |
| S6 | Production Bundle & Standalone HTML Offline Delivery Verification | F5, F6 | Medium |
| S7 | Kontur Population Türkiye (HDX H3 Res-8) Full-District Coverage, Custom GeoJSON Import/Export & Keyless WebGL MapLibre Verification | F1, F5, F7 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (≥35 total)
- Tier 2: ≥5 per feature (≥35 total)
- Tier 3: ≥10 pairwise cross-feature interaction tests
- Tier 4: ≥7 realistic end-to-end decision-support scenarios
- **Total minimum: ≥87 test cases**
