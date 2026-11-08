# Handoff Report & Domain Specification — `explorer_survey_2`

**Core Summary:** The Kocaeli Kandıra Mahalle Kartları web application models **36 neighborhoods (`KND-01` to `KND-36`)** across **4 functional spatial zones** in Kandıra (Merkez Kentsel, Karadeniz Kıyı & Turizm, Kırsal Tarım & Fındık, Kırsal Orman & İç Kuşak) with complete 5-year time-series data (`2021–2025`), H3 hexagonal spatial indexing (`h3-js` Resolution 7 & 8), dynamic policy-weighted vulnerability scoring, and multi-neighborhood comparison capabilities. Below is the complete 5-component handoff report and domain specification across all five required pillars.

---

## 1. Observation

### 1.1 User Requirements & Multi-Agent Rules
- **`/home/antigravity/akinba/kanlica-mahalle-kartlari/.agents/teamwork/ORIGINAL_REQUEST.md` (lines 10–23)** and **`/home/antigravity/agents.md` (lines 1–9)**:
  - Primary Agent (Orchestrator) runs on **Gemini Argon Medium** for high-level planning, architecture design, delegation, and review.
  - Sub-Agents (Worker / Fast Execution) run on **Gemini Flash Medium** for tool calling, shell execution, code edits, and quick file inspection.
  - Functional requirements (line 21):
    > *"kocaeli ili kandıra ilçesine ait mahaller için mahalle kartları oluşturan bir web uygulaması yapmak istiyorum... bu mahalle kartlarında, son 5 yıla ait nufüstaki değişimleri göstermek, kırılgan gruplara ait durumları yakalamak, coğrafi olarak arazi değişimleri, sağlık , eğitim vb. konularda bir gelişme yaşandımı anlamak istiyorum. ayrıca bir harita sekmesi olmalı ve h3 altıgenlerini kullanmak istiyorum."*

### 1.2 Domain Model & TypeScript Schemas (`src/types/kandira.ts`, lines 1–160)
- **Zones (`NeighborhoodZone`, line 1)**: `'merkez' | 'kiyi_turizm' | 'kirsal_tarim' | 'kirsal_orman'`
- **Survey Years (`SurveyYear`, line 3)**: `2021 | 2022 | 2023 | 2024 | 2025`
- **5-Year Demographic Series (`YearlyDemographic`, lines 5–20)**:
  - `year`, `total`, `male`, `female`, `elderly65PlusPct`, `youth0To14Pct`, `netMigrationPermille`, `summerPopulationMultiplier`, `builtUpPct`, `forestPct`, `agriculturePct`, `vulnerabilityRawScore`, `healthAccessMin`, `educationAccessMin`.
- **Vulnerable Groups (`VulnerableGroupMetrics`, lines 22–33)**:
  - `elderly65PlusCount`, `elderly65PlusPct`, `elderlyLivingAloneEst`, `children0To14Count`, `children0To14Pct`, `disabilitySupportHouseholds`, `socialAssistanceHouseholds`, `seasonalAgriculturalWorkers`, `chronicIllnessFollowupEst`, `riskFactors: string[]`.
- **Geographic Land Use Changes (`LandUseChangeMetrics`, lines 35–54)**:
  - `forestPct2021`, `forestPct2025`, `agricultureHazelnutPct2021`, `agricultureHazelnutPct2025`, `builtUpPct2021`, `builtUpPct2025`, `newBuildingPermits5Yr`, `imperviousSurfaceChangePct`, `dominantLandCover`, `changeCategory: LandUseChangeCategory`, `observations: string[]`.
- **Health, Education & Infrastructure (`ServiceDevelopmentMetrics`, lines 56–83)**:
  - `health`: `asmCount`, `familyPhysicians`, `pharmacyCount`, `nearestHospitalKm`, `ambulanceEtaMin`, `mobileHealthVisitPerMonth`, `trend5Yr ('gelisti' | 'sabit' | 'kritik')`, `recentInvestments: string[]`.
  - `education`: `kindergartenCount`, `primaryMiddleCount`, `highSchoolCount`, `bussedStudentsCount`, `studentPerTeacher`, `internetLabAvailable`, `trend5Yr`, `recentInvestments: string[]`.
  - `infrastructure`: `fiberBroadbandPct`, `drinkingWaterStatus ('iyilestirildi' | 'yeterli' | 'yaz_basinc_sorunu')`, `publicTransportDailyTrips`, `disasterAssemblyAreas`.
- **H3 Spatial Properties (`H3CellProperties`, lines 111–131)**:
  - `h3Index`, `neighborhoodId`, `neighborhoodName`, `zone`, `zoneLabel`, `year`, `population`, `popChange5YrPct`, `elderlyPct`, `youthPct`, `vulnerabilityScore`, `builtUpPct`, `builtUpChange5YrPct`, `forestPct`, `agriculturePct`, `healthAccessMin`, `educationAccessMin`, `summerPopEstimate`, `isCoreCell`.

### 1.3 Complete Kandıra Neighborhood Inventory (`src/data/kandiraNeighborhoods.ts`, lines 74–2624)
All 36 neighborhoods are georeferenced in `[lng, lat]` WGS84 coordinates spanning Kandıra center (`~41.07°N, 30.15°E`), the Black Sea coast (`~41.14°N–41.18°N, 30.08°E–30.34°E`), and inland agricultural/forest basins (`~40.99°N–41.15°N`):

| Code | ID | Mahalle Adı | Kuşak (`zone`) | Koordinat `[lng, lat]` | Alan (km²) | Rakım (m) | Merkeze Uzaklık (km) | 2021 Nüfus | 2025 Nüfus | 5Y Değişim (%) | 2025 65+ Yaş (%) | Yaz Çarpanı (2025) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `KND-01` | `akdurak` | **Akdurak** | `merkez` | `[30.1585, 41.0692]` | 11.4 | 58 | 0.8 | 9,840 | 10,890 | +10.7% | 13.8% | 1.25x |
| `KND-02` | `aydinlik` | **Aydınlık** | `merkez` | `[30.1492, 41.0738]` | 6.2 | 52 | 0.5 | 5,120 | 5,480 | +7.0% | 15.6% | 1.20x |
| `KND-03` | `carsi` | **Çarşı** | `merkez` | `[30.1531, 41.0706]` | 4.5 | 46 | 0.2 | 4,050 | 4,240 | +4.7% | 17.4% | 1.50x |
| `KND-04` | `orhan` | **Orhan** | `merkez` | `[30.1445, 41.0668]` | 7.8 | 64 | 1.1 | 3,680 | 3,940 | +7.1% | 16.9% | 1.25x |
| `KND-05` | `akbal` | **Akbal** | `merkez` | `[30.1684, 41.0635]` | 9.6 | 72 | 2.3 | 1,620 | 1,840 | +13.6% | 18.8% | 1.40x |
| `KND-06` | `kefken` | **Kefken** | `kiyi_turizm` | `[30.2612, 41.1672]` | 14.2 | 18 | 18.5 | 1,940 | 2,380 | +22.7% | 22.4% | 18.50x |
| `KND-07` | `kincilli` | **Kıncıllı (Kerpe)** | `kiyi_turizm` | `[30.2054, 41.1528]` | 12.8 | 22 | 12.4 | 1,260 | 1,615 | +28.2% | 21.2% | 20.00x |
| `KND-08` | `cebeci` | **Cebeci** | `kiyi_turizm` | `[30.2895, 41.1825]` | 11.6 | 15 | 21.8 | 1,180 | 1,475 | +25.0% | 23.1% | 19.50x |
| `KND-09` | `bagirganli` | **Bağırganlı** | `kiyi_turizm` | `[30.0882, 41.1586]` | 15.4 | 24 | 15.2 | 990 | 1,165 | +17.7% | 25.4% | 12.00x |
| `KND-10` | `babali` | **Babalı** | `kiyi_turizm` | `[30.3365, 41.1742]` | 18.6 | 14 | 26.4 | 685 | 845 | +23.4% | 27.8% | 15.00x |
| `KND-11` | `kumcagiz` | **Kumcağız** | `kiyi_turizm` | `[30.2285, 41.1582]` | 10.4 | 16 | 15.8 | 740 | 910 | +23.0% | 23.6% | 16.00x |
| `KND-12` | `kurtyeri` | **Kurtyeri** | `kiyi_turizm` | `[30.2215, 41.1415]` | 11.2 | 35 | 13.5 | 1,090 | 1,285 | +17.9% | 22.8% | 9.50x |
| `KND-13` | `seyrek` | **Seyrek** | `kiyi_turizm` | `[30.1415, 41.1525]` | 10.8 | 28 | 11.6 | 620 | 755 | +21.8% | 24.5% | 10.50x |
| `KND-14` | `pinarli` | **Pınarlı** | `kiyi_turizm` | `[30.1685, 41.1395]` | 9.8 | 42 | 9.8 | 580 | 690 | +19.0% | 24.2% | 6.50x |
| `KND-15` | `sarisu` | **Sarısu** | `kiyi_turizm` | `[30.1695, 41.1562]` | 11.5 | 19 | 11.2 | 540 | 665 | +23.1% | 25.0% | 11.00x |
| `KND-16` | `karaagac` | **Karaağaç** | `kirsal_tarim` | `[30.2915, 41.1245]` | 16.5 | 68 | 16.4 | 2,390 | 2,520 | +5.4% | 21.6% | 2.40x |
| `KND-17` | `kaymaz` | **Kaymaz (Kocaali)** | `kirsal_tarim` | `[30.0485, 41.0285]` | 18.2 | 95 | 13.8 | 1,380 | 1,340 | -2.9% | 28.4% | 1.80x |
| `KND-18` | `camkonak` | **Çamkonak** | `kirsal_tarim` | `[30.2725, 41.1515]` | 13.4 | 48 | 17.2 | 1,210 | 1,310 | +8.3% | 24.8% | 4.50x |
| `KND-19` | `safali` | **Safalı** | `kirsal_tarim` | `[30.1125, 41.0925]` | 12.6 | 76 | 5.4 | 940 | 925 | -1.6% | 27.6% | 1.60x |
| `KND-20` | `sarniclar` | **Sarnıçlar** | `kirsal_tarim` | `[30.0745, 40.9985]` | 15.8 | 112 | 11.6 | 890 | 850 | -4.5% | 31.2% | 1.50x |
| `KND-21` | `dalca` | **Dalca** | `kirsal_tarim` | `[30.1285, 41.0185]` | 11.4 | 98 | 6.8 | 760 | 735 | -3.3% | 30.5% | 1.60x |
| `KND-22` | `sinanlibilalli` | **Sinanlıbilalli** | `kirsal_tarim` | `[30.1845, 41.0295]` | 12.2 | 88 | 5.9 | 710 | 695 | -2.1% | 29.8% | 1.70x |
| `KND-23` | `dongelli` | **Döngelli** | `kirsal_tarim` | `[30.2245, 41.0845]` | 13.0 | 82 | 7.4 | 820 | 790 | -3.7% | 31.8% | 1.80x |
| `KND-24` | `ballar` | **Ballar** | `kirsal_tarim` | `[30.2015, 41.1125]` | 10.6 | 62 | 7.2 | 780 | 815 | +4.5% | 26.4% | 2.60x |
| `KND-25` | `yusufca` | **Yusufça** | `kirsal_tarim` | `[30.0895, 41.0615]` | 11.8 | 86 | 6.5 | 690 | 665 | -3.6% | 32.4% | 1.60x |
| `KND-26` | `yagcilar` | **Yağcılar** | `kirsal_tarim` | `[30.2545, 41.0585]` | 13.6 | 104 | 10.2 | 640 | 605 | -5.5% | 34.6% | 1.60x |
| `KND-27` | `serefsungur` | **Şerefsungur** | `kirsal_tarim` | `[30.2685, 41.0925]` | 14.0 | 92 | 11.8 | 610 | 585 | -4.1% | 33.8% | 1.70x |
| `KND-28` | `mancarlar` | **Mancarlar** | `kirsal_tarim` | `[30.0985, 41.0245]` | 12.4 | 108 | 8.4 | 590 | 555 | -5.9% | 35.2% | 1.50x |
| `KND-29` | `akcabeyli` | **Akçabeyli** | `kirsal_orman` | `[30.3125, 41.1485]` | 15.2 | 56 | 21.0 | 630 | 645 | +2.4% | 29.4% | 3.20x |
| `KND-30` | `bozburun` | **Bozburun** | `kirsal_orman` | `[30.0625, 41.1185]` | 16.4 | 118 | 11.4 | 670 | 620 | -7.5% | 36.8% | 1.70x |
| `KND-31` | `goncaaydin` | **Goncaaydın** | `kirsal_orman` | `[30.0945, 41.1195]` | 14.8 | 124 | 8.9 | 540 | 495 | -8.3% | 39.4% | 1.60x |
| `KND-32` | `deliveli` | **Deliveli** | `kirsal_orman` | `[30.1185, 40.9895]` | 13.8 | 148 | 10.6 | 430 | 385 | -10.5% | 42.8% | 1.50x |
| `KND-33` | `lokmanli` | **Lokmanlı** | `kirsal_orman` | `[30.2145, 41.0445]` | 12.6 | 116 | 8.2 | 465 | 430 | -7.5% | 38.6% | 1.80x |
| `KND-34` | `antapli` | **Antaplı** | `kirsal_orman` | `[30.0325, 41.0785]` | 16.8 | 142 | 14.5 | 440 | 395 | -10.2% | 42.1% | 1.60x |
| `KND-35` | `baglica` | **Bağlıca (Hacılar)** | `kirsal_orman` | `[30.0585, 41.0525]` | 14.2 | 128 | 11.2 | 510 | 465 | -8.8% | 38.9% | 1.70x |
| `KND-36` | `kirkarmut` | **Kırkarmut** | `kirsal_orman` | `[30.1625, 40.9965]` | 15.0 | 138 | 9.8 | 560 | 515 | -8.0% | 43.8% | 1.80x |

---

## 2. Logic Chain

### Step 1: Pillar 1 — 5-Year Population & Demographic Dynamics (`2021–2025`)
- **Observation Reference**: `src/data/kandiraNeighborhoods.ts:2630-2690` (`buildYearlySeries`), `src/components/NeighborhoodCard.tsx:161-190`, `src/components/NeighborhoodDetailDrawer.tsx:216-347`.
- **Reasoning**: Kandıra exhibits three distinct demographic regimes over the 5-year window:
  1. **Coastal Tourism & Second-Home Surge (`kiyi_turizm`)**: Driven by post-pandemic remote work and retirement migration from Kocaeli/Istanbul, permanent population grew by **+17.7% to +28.2%** (`Kıncıllı/Kerpe +28.2%`, `Cebeci +25.0%`, `Babalı +23.4%`, `Sarısu +23.1%`, `Kumcağız +23.0%`, `Kefken +22.7%`), while July–August summer multipliers reach **12x to 20x** (e.g., Kefken peaks at ~44,030 summer residents; Kerpe at ~32,300).
  2. **Central Urban Growth (`merkez`)**: Steadily expanding by **+4.7% to +13.6%** (`Akbal +13.6%`, `Akdurak +10.7%`) due to public housing, Kandıra Gıda İhtisas OSB employment, and rural-to-center elderly movement.
  3. **Inland Rural & Forest Depopulation (`kirsal_tarim`, `kirsal_orman`)**: Youth out-migration causes **-1.6% to -10.5%** population decline (`Deliveli -10.5%`, `Antaplı -10.2%`, `Bağlıca -8.8%`, `Goncaaydın -8.3%`, `Kırkarmut -8.0%`) with negative net migration (`-15‰ to -21‰`).

### Step 2: Pillar 2 — Vulnerable Groups & Composite Vulnerability Index
- **Observation Reference**: `src/utils/h3SpatialEngine.ts:36-76` (`calculateDynamicVulnerabilityScore`), `src/data/kandiraNeighborhoods.ts:2695-2710`, `src/components/WeightSimulatorDrawer.tsx:31-74`.
- **Reasoning**: Vulnerability in Kandıra is multi-dimensional rather than purely income-based:
  - **Hyper-Aging & Rural Isolation**: In `kirsal_orman` neighborhoods, the 65+ elderly share reaches **36.8%–43.8%** (`Kırkarmut 43.8%`, `Deliveli 42.8%`, `Antaplı 42.1%`), with **29% of elderly residents living alone** (`elderlyLivingAloneEst`).
  - **Social Assistance & Disability**: Household social assistance ratios reach **8.9%–10.8%** and disability support households reach **4.2%–4.9%** in remote forest villages.
  - **Seasonal Agricultural Workers**: During the August–September hazelnut harvest, `kirsal_tarim` neighborhoods (`Karaağaç`, `Kaymaz`, `Çamkonak`, `Döngelli`) host **90–280 seasonal agricultural workers**, creating temporary child safety, hygiene, and mobile health needs.
  - **Dynamic Policy Formula**: `calculateDynamicVulnerabilityScore` normalizes 5 sub-indices (`elderlySub`, `socialAidSub`, `healthSub`, `eduSub`, `landPressureSub`) onto `0–100` using customizable weights (Default: Elderly 30%, Social Aid 25%, Health Access 20%, Education Access 15%, Land Pressure 10%) and classifies neighborhoods into 4 priority tiers (`Kritik Öncelik >= 65`, `Yüksek Risk 50–64.9`, `Orta İzlem 35–49.9`, `Düşük Risk < 35`).

### Step 3: Pillar 3 — Geographic Land Use & Built-Up Surface Changes (`2021–2025`)
- **Observation Reference**: `src/types/kandira.ts:35-54`, `src/data/kandiraNeighborhoods.ts:2739-2751`, `src/components/NeighborhoodCard.tsx:388-437`.
- **Reasoning**:
  - Every neighborhood tracks 5-year shifts across three primary land cover classes summing to 100% (`forestPct`, `agriculturePct`, `builtUpPct`), plus 5-year new building permits (`newBuildingPermits5Yr`) and relative impervious surface growth (`imperviousSurfaceChangePct`).
  - Hectare values can be deterministically derived from `areaKm2 * 100 * (pct / 100) = areaKm2 * pct` (since $1\text{ km}^2 = 100\text{ ha}$). For example, in **Kefken** (`14.2 km² = 1,420 ha`), built-up area rose from `28.5%` (`404.7 ha`) in 2021 to `39.2%` (`556.6 ha`) in 2025 (**+151.9 ha / +37.5% impervious increase**, 215 new permits), while forest cover declined from `48.0%` (`681.6 ha`) to `42.8%` (`607.8 ha`).
  - Each neighborhood is classified into one of 5 structural land-change trajectories (`LandUseChangeCategory`):
    1. `Yuksek Kiyi Yapilasma Baskisi` (Kefken, Kıncıllı/Kerpe, Cebeci, Bağırganlı, Babalı, Kumcağız, Kurtyeri, Seyrek, Pınarlı, Sarısu)
    2. `Kentsel Yayilma` (Akdurak, Aydınlık, Çarşı, Orhan, Akbal)
    3. `Tarim-Findik Koruma Alani` (Karaağaç, Kaymaz, Çamkonak, Safalı, Sarnıçlar, Dalca, Sinanlıbilalli, Döngelli, Ballar, Yusufça, Yağcılar, Şerefsungur, Mancarlar)
    4. `Orman-Ekoturizm Dengeli` (Akçabeyli, Lokmanlı)
    5. `Kirsal Nufus Kaybi - Atil Arazi` (Bozburun, Goncaaydın, Deliveli, Antaplı, Bağlıca, Kırkarmut)

### Step 4: Pillar 4 — Health, Education & Infrastructure Developments
- **Observation Reference**: `src/types/kandira.ts:56-83`, `src/components/NeighborhoodDetailDrawer.tsx:440-710`.
- **Reasoning**:
  - **Health**: Tracks Family Health Centers (`asmCount`), family physicians (`familyPhysicians`), pharmacies (`pharmacyCount`), distance to M. Kazım Dinç Kandıra Devlet Hastanesi (`nearestHospitalKm`), ambulance ETA (`ambulanceEtaMin`, ranging from `3–5 min` in `merkez` to `18–23 min` in `Babalı` and `Antaplı`), monthly mobile health visits (`mobileHealthVisitPerMonth`), 5-year service trend (`gelisti | sabit | kritik`), and concrete investment records (e.g., KOSKEM water rescue & summer 112 stations in Kefken/Kerpe/Cebeci; home-health geriatric monitoring in rural neighborhoods).
  - **Education**: Tracks kindergartens, primary/middle schools, high schools, bussed students (`bussedStudentsCount`, e.g., 95 students in Kefken, 68 in Cebeci, 62 in Babalı), student-to-teacher ratios (`15–19` where schools exist), digital/internet labs (`internetLabAvailable`), and 5-year trend badges.
  - **Infrastructure**: Tracks fiber broadband coverage (`52%` in Antaplı to `96%` in Çarşı), drinking water status (`iyilestirildi`, `yeterli`, or `yaz_basinc_sorunu` in coastal summer peak zones), daily public bus trips (`6` trips/day in remote forest villages vs. `64` in Çarşı), and AFAD disaster assembly areas (`1–6`).

### Step 5: Pillar 5 — Mahalle Kartı UI, Multi-Neighborhood Comparison & H3 Spatial Studio
- **Observation Reference**: `src/App.tsx:47-350`, `src/components/NeighborhoodCard.tsx:130-567`, `src/components/ComparisonView.tsx:35-303`, `src/components/H3MapView.tsx:42-400`, `src/utils/h3SpatialEngine.ts:83-209`.
- **Reasoning**:
  - **Mahalle Kartları Grid (`NeighborhoodCard.tsx`)**: Displays neighborhood code, zone badge, H3 Resolution-8 cell index (`latLngToCell(lat, lng, 8)`), dynamic vulnerability score badge, 2021–2025 SVG population sparkline, summer peak badge, vulnerable group summary, 3-part stacked land-use bar (Forest / Agriculture / Built-up), health/education trend pills, and 4 quick actions (*Detaylı Karne*, *H3 Harita*, *Kıyasla*, *Yazdır/PDF*).
  - **H3 Hexagonal Map (`H3MapView.tsx` & `h3SpatialEngine.ts`)**: Uses `h3-js` (`latLngToCell`, `gridDisk`, `cellToBoundary`, `greatCircleDistance`) to generate a distance-decayed hexagonal mesh across Kandıra at **Resolution 7 (Macro)** and **Resolution 8 (Micro)** with 6 thematic layers (`vulnerabilityScore`, `popChange5YrPct`, `elderlyPct`, `builtUpChange5YrPct`, `healthAccessMin`, `summerPopEstimate`), supporting both an interactive SVG Vector Cartographic Studio (with 2D/3D isometric extrusion) and WebGL MapLibre GL mode.
  - **Comparison Matrix (`ComparisonView.tsx`)**: Side-by-side comparison of up to 4 neighborhoods across all 5 pillars, pre-seeded with contrasting archetypes (`Akdurak` [Merkez], `Kefken` [Kıyı/Turizm], `Kırkarmut` [Kırsal Orman]).

---

## 3. Caveats

1. **Hectare Unit Display in Land-Use UI**: While `areaKm2` and percentage shares (`forestPct`, `agriculturePct`, `builtUpPct`) are stored for every neighborhood and year, displaying explicit hectare (`ha`) deltas alongside percentages in `NeighborhoodDetailDrawer.tsx` (using `ha = areaKm2 * pct`) is a straightforward UI enrichment if desired by the orchestrator.
2. **Neighborhood Naming Nuances**: Kandıra has 96 official mahalle/köy units in total; the dataset in `src/data/kandiraNeighborhoods.ts` curates the **36 representative and highest-impact neighborhoods** (`KND-01` to `KND-36`) covering all 5 central neighborhoods (`Akdurak`, `Aydınlık`, `Çarşı`, `Orhan`, `Akbal`), all 10 coastal tourism settlements (`Kefken`, `Kıncıllı/Kerpe`, `Cebeci`, `Bağırganlı`, `Babalı`, `Kumcağız`, `Kurtyeri`, `Seyrek`, `Pınarlı`, `Sarısu`), 13 agricultural/hazelnut hubs (`Karaağaç`, `Kaymaz`, `Çamkonak`, `Safalı`, `Sarnıçlar`, `Dalca`, `Sinanlıbilalli`, `Döngelli`, `Ballar`, `Yusufça`, `Yağcılar`, `Şerefsungur`, `Mancarlar`), and 8 forest settlements (`Akçabeyli`, `Bozburun`, `Goncaaydın`, `Deliveli`, `Lokmanlı`, `Antaplı`, `Bağlıca`, `Kırkarmut`).

---

## 4. Conclusion

1. **Domain Specification & Codebase Readiness**: The Kandıra Mahalle Kartları domain model (`src/types/kandira.ts`), 36-neighborhood spatial-temporal dataset (`src/data/kandiraNeighborhoods.ts`), H3 hexagonal spatial engine (`src/utils/h3SpatialEngine.ts`), and 4-tab decision-support UI (`src/App.tsx` and `src/components/*`) comprehensively satisfy all 5 pillars requested in `ORIGINAL_REQUEST.md` and `DISPATCH.md`.
2. **Actionable Recommendations for Orchestrator (If Further Worker Tasks Are Scheduled)**:
   - **Land-Use Hectare Display**: In `NeighborhoodDetailDrawer.tsx` (Section 3: Coğrafi & Arazi Değişimi), display exact hectare (`ha`) values (`(neighborhood.areaKm2 * pct).toFixed(1) ha`) alongside percentages so decision-makers can read both `%` and `hektar` shifts directly.
   - **CSV / GeoJSON Data Export**: Add a one-click export button on the H3 Map or Regional Synthesis tab to download the filtered 36-neighborhood table or H3 GeoJSON FeatureCollection for external GIS usage.

---

## 5. Verification Method

To independently verify all observations and domain specifications in this report:

1. **TypeScript & Build Verification**:
   ```bash
   npx tsc --noEmit
   npm run build
   ```
   *(Verified: `npx tsc --noEmit` exits with code `0` and zero errors).*
2. **Inspect Domain Types & 36-Neighborhood Seed Data**:
   - View `/home/antigravity/akinba/kanlica-mahalle-kartlari/src/types/kandira.ts` (lines 1–160)
   - View `/home/antigravity/akinba/kanlica-mahalle-kartlari/src/data/kandiraNeighborhoods.ts` (lines 74–2791)
3. **Inspect H3 Spatial Engine & UI Components**:
   - View `/home/antigravity/akinba/kanlica-mahalle-kartlari/src/utils/h3SpatialEngine.ts` (lines 36–209)
   - View `/home/antigravity/akinba/kanlica-mahalle-kartlari/src/components/NeighborhoodCard.tsx`
   - View `/home/antigravity/akinba/kanlica-mahalle-kartlari/src/components/NeighborhoodDetailDrawer.tsx`
   - View `/home/antigravity/akinba/kanlica-mahalle-kartlari/src/components/H3MapView.tsx`
   - View `/home/antigravity/akinba/kanlica-mahalle-kartlari/src/components/ComparisonView.tsx`
4. **Invalidation Conditions**:
   - This report would be invalidated if `src/types/kandira.ts` or `src/data/kandiraNeighborhoods.ts` is modified to alter neighborhood coordinates, zone classifications, or H3 resolution logic without updating downstream components.
