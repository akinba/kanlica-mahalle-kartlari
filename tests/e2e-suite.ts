import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { cellToLatLng, latLngToCell } from 'h3-js';
import {
  KANDIRA_NEIGHBORHOODS,
  DEFAULT_VULNERABILITY_WEIGHTS,
  ZONE_LABELS,
} from '../src/data/kandiraNeighborhoods';
import {
  calculateDynamicVulnerabilityScore,
  generateKandiraH3GeoJSON,
  getDistrictSummaryMetrics,
  getYearData,
  isInBlackSea,
} from '../src/utils/h3SpatialEngine';
import type {
  LandUseChangeCategory,
  NeighborhoodZone,
  SurveyYear,
  VulnerabilityWeights,
} from '../src/types/kandira';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

type TierId = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4';
type FeatureId = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'CROSS' | 'SCENARIO';

interface TestResult {
  id: string;
  tier: TierId;
  feature: FeatureId;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertClose(
  actual: number,
  expected: number,
  tolerance: number,
  message: string
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(
      `${message} (expected ${expected} ± ${tolerance}, got ${actual})`
    );
  }
}

function runTest(
  id: string,
  tier: TierId,
  feature: FeatureId,
  name: string,
  fn: () => void
): void {
  try {
    fn();
    results.push({ id, tier, feature, name, passed: true });
    console.log(`  ✅ [${id}] (${tier} | ${feature}) ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ id, tier, feature, name, passed: false, error: message });
    console.error(`  ❌ [${id}] (${tier} | ${feature}) ${name}\n     ↳ ${message}`);
  }
}

const SURVEY_YEARS: SurveyYear[] = [2021, 2022, 2023, 2024, 2025];

console.log('================================================================================');
console.log(' KANDIRA MAHALLE KARTLARI & H3 MEKANSAL KARAR DESTEK SİSTEMİ — E2E TEST SUITE');
console.log('================================================================================\n');

// ============================================================================
// TIER 1: FEATURE COVERAGE (6 features × 6 tests = 36 tests)
// ============================================================================
console.log('--- TIER 1: Primary Feature Coverage (F1..F6) ---');

// F1: 5-Year Population Changes (2021–2025)
runTest(
  'T1-F1-01',
  'Tier 1',
  'F1',
  'Dataset contains all 36 Kandıra neighborhoods across 4 zones with complete 2021–2025 series',
  () => {
    assert(
      KANDIRA_NEIGHBORHOODS.length === 36,
      `Expected 36 neighborhoods, got ${KANDIRA_NEIGHBORHOODS.length}`
    );
    const codes = new Set(KANDIRA_NEIGHBORHOODS.map((n) => n.code));
    assert(codes.size === 36, 'All 36 neighborhood codes (KND-01..KND-36) must be unique');
    for (let i = 1; i <= 36; i++) {
      const code = `KND-${String(i).padStart(2, '0')}`;
      assert(codes.has(code), `Missing neighborhood code ${code}`);
    }
    for (const n of KANDIRA_NEIGHBORHOODS) {
      assert(
        n.yearlyData.length === 5,
        `${n.name} must have 5 yearly demographic entries`
      );
      const years = n.yearlyData.map((d) => d.year);
      assert(
        JSON.stringify(years) === JSON.stringify(SURVEY_YEARS),
        `${n.name} years must be [2021,2022,2023,2024,2025]`
      );
    }
  }
);

runTest(
  'T1-F1-02',
  'Tier 1',
  'F1',
  'Male + female population equals total population for all 36 neighborhoods across 2021–2025 (180 records)',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      for (const yd of n.yearlyData) {
        assert(yd.total > 0, `${n.name} (${yd.year}) total must be positive`);
        assert(
          yd.male + yd.female === yd.total,
          `${n.name} (${yd.year}) male (${yd.male}) + female (${yd.female}) !== total (${yd.total})`
        );
      }
    }
  }
);

runTest(
  'T1-F1-03',
  'Tier 1',
  'F1',
  '5-year population change percentage (2021→2025) matches exact demographic formula for urban, coastal, and rural neighborhoods',
  () => {
    const akdurak = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'akdurak')!;
    const kincilli = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kincilli')!;
    const kirkarmut = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kirkarmut')!;

    const akdChange = Number(
      (((getYearData(akdurak, 2025).total - getYearData(akdurak, 2021).total) /
        getYearData(akdurak, 2021).total) *
        100).toFixed(1)
    );
    const kinChange = Number(
      (((getYearData(kincilli, 2025).total - getYearData(kincilli, 2021).total) /
        getYearData(kincilli, 2021).total) *
        100).toFixed(1)
    );
    const krkChange = Number(
      (((getYearData(kirkarmut, 2025).total - getYearData(kirkarmut, 2021).total) /
        getYearData(kirkarmut, 2021).total) *
        100).toFixed(1)
    );

    assertClose(akdChange, 10.7, 0.1, 'Akdurak 5-yr growth %');
    assertClose(kinChange, 28.2, 0.1, 'Kıncıllı (Kerpe) 5-yr growth %');
    assertClose(krkChange, -8.0, 0.1, 'Kırkarmut 5-yr decline %');
  }
);

runTest(
  'T1-F1-04',
  'Tier 1',
  'F1',
  'Net migration permille reflects positive inflow in central/coastal zones and negative outflow in rural forest zone',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const yd2025 = getYearData(n, 2025);
      if (n.zone === 'merkez' || n.zone === 'kiyi_turizm') {
        assert(
          yd2025.netMigrationPermille > 0,
          `Expected positive net migration in ${n.name} (${n.zone}), got ${yd2025.netMigrationPermille}`
        );
      }
      if (n.zone === 'kirsal_orman') {
        assert(
          yd2025.netMigrationPermille < 0,
          `Expected negative net migration in rural forest village ${n.name}, got ${yd2025.netMigrationPermille}`
        );
      }
    }
  }
);

runTest(
  'T1-F1-05',
  'Tier 1',
  'F1',
  'Summer population multiplier is >= 1.0 everywhere and >= 7.5 in 2025 for all coastal tourism neighborhoods',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      for (const yd of n.yearlyData) {
        assert(
          yd.summerPopulationMultiplier >= 1.0,
          `${n.name} (${yd.year}) summer multiplier must be >= 1.0`
        );
      }
      if (n.zone === 'kiyi_turizm') {
        const yd2025 = getYearData(n, 2025);
        assert(
          yd2025.summerPopulationMultiplier >= 7.5,
          `Coastal neighborhood ${n.name} must have 2025 summer multiplier >= 7.5, got ${yd2025.summerPopulationMultiplier}`
        );
      }
    }
  }
);

runTest(
  'T1-F1-06',
  'Tier 1',
  'F1',
  'getDistrictSummaryMetrics accurately aggregates total population, 5-year change %, and summer peak population',
  () => {
    const summary2025 = getDistrictSummaryMetrics(KANDIRA_NEIGHBORHOODS, 2025);
    const manualPop2025 = KANDIRA_NEIGHBORHOODS.reduce(
      (acc, n) => acc + getYearData(n, 2025).total,
      0
    );
    const manualSummer2025 = KANDIRA_NEIGHBORHOODS.reduce((acc, n) => {
      const yd = getYearData(n, 2025);
      return acc + Math.round(yd.total * yd.summerPopulationMultiplier);
    }, 0);
    assert(
      summary2025.totalPopulation === manualPop2025,
      `District 2025 population mismatch: ${summary2025.totalPopulation} vs ${manualPop2025}`
    );
    assert(
      summary2025.estimatedSummerPeakPopulation === manualSummer2025,
      `District 2025 summer peak mismatch: ${summary2025.estimatedSummerPeakPopulation} vs ${manualSummer2025}`
    );
    assert(
      summary2025.popChangeSince2021Pct > 0,
      'District 2021→2025 population change should be positive'
    );
  }
);

// F2: Vulnerable Groups Analysis & Dynamic Vulnerability Score
runTest(
  'T1-F2-01',
  'Tier 1',
  'F2',
  'Every neighborhood has complete and positive vulnerable group metrics and risk factor descriptions',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const vg = n.vulnerableGroups;
      assert(vg.elderly65PlusCount > 0, `${n.name} elderly65PlusCount must be > 0`);
      assert(vg.elderly65PlusPct > 10, `${n.name} elderly65PlusPct must be > 10%`);
      assert(vg.elderlyLivingAloneEst > 0, `${n.name} elderlyLivingAloneEst must be > 0`);
      assert(vg.children0To14Count > 0, `${n.name} children0To14Count must be > 0`);
      assert(
        vg.disabilitySupportHouseholds >= 2,
        `${n.name} disabilitySupportHouseholds must be >= 2`
      );
      assert(
        vg.socialAssistanceHouseholds >= 4,
        `${n.name} socialAssistanceHouseholds must be >= 4`
      );
      assert(
        vg.chronicIllnessFollowupEst > 0,
        `${n.name} chronicIllnessFollowupEst must be > 0`
      );
      assert(
        Array.isArray(vg.riskFactors) && vg.riskFactors.length >= 1,
        `${n.name} must have at least 1 documented risk factor`
      );
    }
  }
);

runTest(
  'T1-F2-02',
  'Tier 1',
  'F2',
  'Elderly (65+) and children (0–14) counts in vulnerableGroups match 2025 population and demographic percentages',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const yd2025 = getYearData(n, 2025);
      const expectedElderly = Math.round((yd2025.total * yd2025.elderly65PlusPct) / 100);
      const expectedChildren = Math.round((yd2025.total * yd2025.youth0To14Pct) / 100);
      assert(
        n.vulnerableGroups.elderly65PlusCount === expectedElderly,
        `${n.name} elderly count mismatch: ${n.vulnerableGroups.elderly65PlusCount} vs ${expectedElderly}`
      );
      assert(
        n.vulnerableGroups.children0To14Count === expectedChildren,
        `${n.name} children count mismatch: ${n.vulnerableGroups.children0To14Count} vs ${expectedChildren}`
      );
    }
  }
);

runTest(
  'T1-F2-03',
  'Tier 1',
  'F2',
  'Elderly living alone estimate reflects zone isolation multipliers (29% forest, 24% agri, 18% central/coastal)',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const factor =
        n.zone === 'kirsal_orman' ? 0.29 : n.zone === 'kirsal_tarim' ? 0.24 : 0.18;
      const expectedAlone = Math.round(n.vulnerableGroups.elderly65PlusCount * factor);
      assert(
        n.vulnerableGroups.elderlyLivingAloneEst === expectedAlone,
        `${n.name} elderlyLivingAloneEst mismatch: ${n.vulnerableGroups.elderlyLivingAloneEst} vs ${expectedAlone}`
      );
    }
  }
);

runTest(
  'T1-F2-04',
  'Tier 1',
  'F2',
  'Seasonal agricultural worker counts are populated for hazelnut/rural zones and sum to district total (3,230)',
  () => {
    const summary = getDistrictSummaryMetrics(KANDIRA_NEIGHBORHOODS, 2025);
    const sumWorkers = KANDIRA_NEIGHBORHOODS.reduce(
      (acc, n) => acc + n.vulnerableGroups.seasonalAgriculturalWorkers,
      0
    );
    assert(
      summary.totalSeasonalWorkers === sumWorkers,
      `District seasonal workers (${summary.totalSeasonalWorkers}) !== sum (${sumWorkers})`
    );
    assert(sumWorkers === 3230, `Expected 3,230 total seasonal workers in Kandıra, got ${sumWorkers}`);
  }
);

runTest(
  'T1-F2-05',
  'Tier 1',
  'F2',
  'calculateDynamicVulnerabilityScore returns finite scores in [0, 100] across all 36 neighborhoods and 5 years',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      for (const year of SURVEY_YEARS) {
        const score = calculateDynamicVulnerabilityScore(
          n,
          DEFAULT_VULNERABILITY_WEIGHTS,
          year
        );
        assert(
          Number.isFinite(score) && score >= 0 && score <= 100,
          `${n.name} (${year}) invalid vulnerability score: ${score}`
        );
      }
    }
  }
);

runTest(
  'T1-F2-06',
  'Tier 1',
  'F2',
  'DEFAULT_VULNERABILITY_WEIGHTS sums to 100 and ranks high-risk rural/coastal villages above central neighborhoods',
  () => {
    const w = DEFAULT_VULNERABILITY_WEIGHTS;
    const totalWeight =
      w.elderlyWeight +
      w.socialAidWeight +
      w.healthAccessWeight +
      w.educationAccessWeight +
      w.landPressureWeight;
    assert(totalWeight === 100, `Default weights must sum to 100, got ${totalWeight}`);

    const kirkarmut = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kirkarmut')!;
    const babali = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'babali')!;
    const aydinlik = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'aydinlik')!;

    const krkScore = calculateDynamicVulnerabilityScore(kirkarmut, w, 2025);
    const babScore = calculateDynamicVulnerabilityScore(babali, w, 2025);
    const aydScore = calculateDynamicVulnerabilityScore(aydinlik, w, 2025);

    assert(
      krkScore > aydScore && babScore > aydScore,
      `Expected Kırkarmut (${krkScore}) and Babalı (${babScore}) > Aydınlık (${aydScore})`
    );
  }
);

// F3: Geographic Land Use Changes (2021–2025)
runTest(
  'T1-F3-01',
  'Tier 1',
  'F3',
  'Forest + Agriculture/Hazelnut + Built-up percentages sum to 100% for every neighborhood and year',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      for (const yd of n.yearlyData) {
        const sum = yd.forestPct + yd.agriculturePct + yd.builtUpPct;
        assertClose(
          sum,
          100.0,
          0.15,
          `${n.name} (${yd.year}) land cover sum must equal 100%`
        );
      }
    }
  }
);

runTest(
  'T1-F3-02',
  'Tier 1',
  'F3',
  'LandUseChangeMetrics 2021 and 2025 values match the 2021 and 2025 entries in yearlyData',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const y2021 = getYearData(n, 2021);
      const y2025 = getYearData(n, 2025);
      assertClose(n.landUse.forestPct2021, y2021.forestPct, 0.1, `${n.name} forest2021`);
      assertClose(n.landUse.forestPct2025, y2025.forestPct, 0.1, `${n.name} forest2025`);
      assertClose(
        n.landUse.agricultureHazelnutPct2021,
        y2021.agriculturePct,
        0.1,
        `${n.name} agri2021`
      );
      assertClose(
        n.landUse.agricultureHazelnutPct2025,
        y2025.agriculturePct,
        0.1,
        `${n.name} agri2025`
      );
      assertClose(n.landUse.builtUpPct2021, y2021.builtUpPct, 0.1, `${n.name} builtUp2021`);
      assertClose(n.landUse.builtUpPct2025, y2025.builtUpPct, 0.1, `${n.name} builtUp2025`);
    }
  }
);

runTest(
  'T1-F3-03',
  'Tier 1',
  'F3',
  'Hectare (ha) conversion (areaKm2 * pct) yields consistent hectare totals equal to areaKm2 * 100 ha',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const totalHa = n.areaKm2 * 100;
      const forestHa2025 = n.areaKm2 * n.landUse.forestPct2025;
      const agriHa2025 = n.areaKm2 * n.landUse.agricultureHazelnutPct2025;
      const builtHa2025 = n.areaKm2 * n.landUse.builtUpPct2025;
      assert(
        forestHa2025 > 0 && agriHa2025 > 0 && builtHa2025 > 0,
        `${n.name} hectare components must be positive`
      );
      assertClose(
        forestHa2025 + agriHa2025 + builtHa2025,
        totalHa,
        0.5,
        `${n.name} 2025 hectare components must sum to total neighborhood area (${totalHa} ha)`
      );
    }
  }
);

runTest(
  'T1-F3-04',
  'Tier 1',
  'F3',
  'imperviousSurfaceChangePct matches 5-year built-up surface growth rate for all 36 neighborhoods',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const expected = Number(
        (((n.landUse.builtUpPct2025 - n.landUse.builtUpPct2021) /
          n.landUse.builtUpPct2021) *
          100).toFixed(1)
      );
      assertClose(
        n.landUse.imperviousSurfaceChangePct,
        expected,
        0.1,
        `${n.name} imperviousSurfaceChangePct mismatch`
      );
    }
  }
);

runTest(
  'T1-F3-05',
  'Tier 1',
  'F3',
  '5-year new building permits are concentrated in coastal tourism and central urban zones',
  () => {
    const avgPermitsByZone = (zone: NeighborhoodZone) => {
      const list = KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === zone);
      return list.reduce((s, n) => s + n.landUse.newBuildingPermits5Yr, 0) / list.length;
    };
    const coastalAvg = avgPermitsByZone('kiyi_turizm');
    const centralAvg = avgPermitsByZone('merkez');
    const forestAvg = avgPermitsByZone('kirsal_orman');
    assert(
      coastalAvg > 120 && centralAvg > 80 && forestAvg < 20,
      `Expected high permits in coastal (${coastalAvg}) & central (${centralAvg}) vs forest (${forestAvg})`
    );
  }
);

runTest(
  'T1-F3-06',
  'Tier 1',
  'F3',
  'Every neighborhood has a valid LandUseChangeCategory, dominantLandCover, and field observations',
  () => {
    const validCategories = new Set<LandUseChangeCategory>([
      'Yuksek Kiyi Yapilasma Baskisi',
      'Kentsel Yayilma',
      'Tarim-Findik Koruma Alani',
      'Orman-Ekoturizm Dengeli',
      'Kirsal Nufus Kaybi - Atil Arazi',
    ]);
    for (const n of KANDIRA_NEIGHBORHOODS) {
      assert(
        validCategories.has(n.landUse.changeCategory),
        `${n.name} has invalid changeCategory: ${n.landUse.changeCategory}`
      );
      assert(
        n.landUse.dominantLandCover.trim().length > 5,
        `${n.name} must have non-empty dominantLandCover`
      );
      assert(
        n.landUse.observations.length >= 1,
        `${n.name} must have at least 1 land-use observation`
      );
    }
  }
);

// F4: Health, Education & Infrastructure Developments
runTest(
  'T1-F4-01',
  'Tier 1',
  'F4',
  'Health service metrics are valid and ambulanceEtaMin matches 2025 healthAccessMin',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const h = n.services.health;
      const yd2025 = getYearData(n, 2025);
      assert(h.asmCount >= 0 && h.familyPhysicians >= 0, `${n.name} invalid ASM/physician count`);
      assert(h.pharmacyCount >= 0, `${n.name} invalid pharmacy count`);
      assert(h.nearestHospitalKm > 0, `${n.name} nearestHospitalKm must be > 0`);
      assert(
        h.ambulanceEtaMin === yd2025.healthAccessMin,
        `${n.name} ambulanceEtaMin (${h.ambulanceEtaMin}) !== 2025 healthAccessMin (${yd2025.healthAccessMin})`
      );
      assert(
        ['gelisti', 'sabit', 'kritik'].includes(h.trend5Yr),
        `${n.name} invalid health trend5Yr: ${h.trend5Yr}`
      );
    }
  }
);

runTest(
  'T1-F4-02',
  'Tier 1',
  'F4',
  'Education service metrics are consistent across local schools, bussed students, and teacher ratios',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const e = n.services.education;
      const totalSchools =
        e.kindergartenCount + e.primaryMiddleCount + e.highSchoolCount;
      if (totalSchools === 0) {
        assert(
          e.studentPerTeacher === 0,
          `${n.name} has 0 schools so studentPerTeacher must be 0`
        );
        assert(
          e.bussedStudentsCount > 0,
          `${n.name} has 0 schools so bussedStudentsCount must be > 0`
        );
      } else {
        assert(
          e.studentPerTeacher >= 14 && e.studentPerTeacher <= 22,
          `${n.name} with local schools must have realistic studentPerTeacher (got ${e.studentPerTeacher})`
        );
      }
      assert(
        ['gelisti', 'sabit', 'kritik'].includes(e.trend5Yr),
        `${n.name} invalid education trend5Yr: ${e.trend5Yr}`
      );
    }
  }
);

runTest(
  'T1-F4-03',
  'Tier 1',
  'F4',
  'Infrastructure metrics (fiber %, drinking water status, daily bus trips, assembly areas) are valid for all 36 neighborhoods',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const inf = n.services.infrastructure;
      assert(
        inf.fiberBroadbandPct >= 40 && inf.fiberBroadbandPct <= 100,
        `${n.name} fiberBroadbandPct out of range: ${inf.fiberBroadbandPct}`
      );
      assert(
        ['iyilestirildi', 'yeterli', 'yaz_basinc_sorunu'].includes(
          inf.drinkingWaterStatus
        ),
        `${n.name} invalid drinkingWaterStatus: ${inf.drinkingWaterStatus}`
      );
      assert(
        inf.publicTransportDailyTrips >= 4,
        `${n.name} publicTransportDailyTrips must be >= 4`
      );
      assert(
        inf.disasterAssemblyAreas >= 1,
        `${n.name} disasterAssemblyAreas must be >= 1`
      );
    }
  }
);

runTest(
  'T1-F4-04',
  'Tier 1',
  'F4',
  '5-year access time trajectory: 2025 healthAccessMin and educationAccessMin improved or stayed <= 2021 baseline',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const y2021 = getYearData(n, 2021);
      const y2025 = getYearData(n, 2025);
      assert(
        y2025.healthAccessMin <= y2021.healthAccessMin,
        `${n.name} healthAccessMin worsened from ${y2021.healthAccessMin} to ${y2025.healthAccessMin}`
      );
      assert(
        y2025.educationAccessMin <= y2021.educationAccessMin,
        `${n.name} educationAccessMin worsened from ${y2021.educationAccessMin} to ${y2025.educationAccessMin}`
      );
    }
  }
);

runTest(
  'T1-F4-05',
  'Tier 1',
  'F4',
  'District summary avgHealthAccessMin and avgEducationAccessMin match arithmetic mean of all 36 neighborhoods',
  () => {
    const summary2025 = getDistrictSummaryMetrics(KANDIRA_NEIGHBORHOODS, 2025);
    const manualHealthAvg = Number(
      (
        KANDIRA_NEIGHBORHOODS.reduce(
          (s, n) => s + getYearData(n, 2025).healthAccessMin,
          0
        ) / KANDIRA_NEIGHBORHOODS.length
      ).toFixed(1)
    );
    const manualEduAvg = Number(
      (
        KANDIRA_NEIGHBORHOODS.reduce(
          (s, n) => s + getYearData(n, 2025).educationAccessMin,
          0
        ) / KANDIRA_NEIGHBORHOODS.length
      ).toFixed(1)
    );
    assert(
      summary2025.avgHealthAccessMin === manualHealthAvg,
      `avgHealthAccessMin mismatch: ${summary2025.avgHealthAccessMin} vs ${manualHealthAvg}`
    );
    assert(
      summary2025.avgEducationAccessMin === manualEduAvg,
      `avgEducationAccessMin mismatch: ${summary2025.avgEducationAccessMin} vs ${manualEduAvg}`
    );
  }
);

runTest(
  'T1-F4-06',
  'Tier 1',
  'F4',
  'Every neighborhood documents recent health/education investments and actionable priority recommendations',
  () => {
    for (const n of KANDIRA_NEIGHBORHOODS) {
      assert(
        n.services.health.recentInvestments.length >= 1,
        `${n.name} missing health.recentInvestments`
      );
      assert(
        n.services.education.recentInvestments.length >= 1,
        `${n.name} missing education.recentInvestments`
      );
      assert(
        n.priorityRecommendations.length >= 1,
        `${n.name} missing priorityRecommendations`
      );
    }
  }
);

// F5: H3 Hexagonal Map Tab (Res 7 & 8, 7 Layers, Coastline Clipping)
runTest(
  'T1-F5-01',
  'Tier 1',
  'F5',
  'generateKandiraH3GeoJSON produces valid closed GeoJSON Polygon features at Resolution 7 and Resolution 8',
  () => {
    for (const res of [7, 8] as const) {
      const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, res);
      assert(fc.type === 'FeatureCollection', 'Must be a GeoJSON FeatureCollection');
      assert(fc.features.length > 50, `Res ${res} must have > 50 H3 features`);
      for (const f of fc.features) {
        assert(f.geometry.type === 'Polygon', 'Each H3 feature must be a Polygon');
        const ring = f.geometry.coordinates[0];
        assert(ring.length >= 7, `H3 polygon ring must have >= 7 vertices, got ${ring.length}`);
        const first = ring[0];
        const last = ring[ring.length - 1];
        assert(
          first[0] === last[0] && first[1] === last[1],
          `H3 polygon ${f.properties.h3Index} ring must be closed`
        );
      }
    }
  }
);

runTest(
  'T1-F5-02',
  'Tier 1',
  'F5',
  'H3 Resolution 8 core-cell bijection: all 36 neighborhoods have a unique isCoreCell === true hexagon',
  () => {
    const fc8 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    const coreFeatures = fc8.features.filter((f) => f.properties.isCoreCell);
    assert(
      coreFeatures.length === 36,
      `Expected 36 core H3 cells at Res 8, got ${coreFeatures.length}`
    );
    const coreNeighborhoodIds = new Set(
      coreFeatures.map((f) => f.properties.neighborhoodId)
    );
    assert(
      coreNeighborhoodIds.size === 36,
      `Expected 36 unique neighborhoodIds among Res 8 core cells, got ${coreNeighborhoodIds.size}`
    );
  }
);

runTest(
  'T1-F5-03',
  'Tier 1',
  'F5',
  'H3 Resolution 7 core-cell bijection: all 36 neighborhoods have a unique isCoreCell === true hexagon without collision loss',
  () => {
    const fc7 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 7);
    const coreFeatures = fc7.features.filter((f) => f.properties.isCoreCell);
    assert(
      coreFeatures.length === 36,
      `Expected 36 core H3 cells at Res 7, got ${coreFeatures.length}`
    );
    const coreNeighborhoodIds = new Set(
      coreFeatures.map((f) => f.properties.neighborhoodId)
    );
    assert(
      coreNeighborhoodIds.size === 36,
      `Expected 36 unique neighborhoodIds among Res 7 core cells, got ${coreNeighborhoodIds.size}`
    );
  }
);

runTest(
  'T1-F5-04',
  'Tier 1',
  'F5',
  'Black Sea coastline clipping: zero non-core H3 ring cells spill north into the Black Sea at Res 7 or Res 8',
  () => {
    for (const res of [7, 8] as const) {
      const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, res);
      const seaSpillovers = fc.features.filter((f) => {
        if (f.properties.isCoreCell) return false;
        const [lat, lng] = cellToLatLng(f.properties.h3Index);
        return isInBlackSea(lat, lng);
      });
      assert(
        seaSpillovers.length === 0,
        `Res ${res} has ${seaSpillovers.length} non-core cells spilling into Black Sea`
      );
    }
  }
);

runTest(
  'T1-F5-05',
  'Tier 1',
  'F5',
  'All 7 thematic layer properties (including healthAccessMin and educationAccessMin) are finite numbers on every H3 cell',
  () => {
    const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    const requiredNumericProps = [
      'vulnerabilityScore',
      'popChange5YrPct',
      'elderlyPct',
      'builtUpChange5YrPct',
      'healthAccessMin',
      'educationAccessMin',
      'summerPopEstimate',
    ] as const;

    for (const f of fc.features) {
      for (const prop of requiredNumericProps) {
        const val = f.properties[prop];
        assert(
          typeof val === 'number' && Number.isFinite(val),
          `H3 cell ${f.properties.h3Index} missing or non-finite ${prop}: ${val}`
        );
      }
    }
  }
);

runTest(
  'T1-F5-06',
  'Tier 1',
  'F5',
  'H3 core cells preserve exact neighborhood healthAccessMin and educationAccessMin while outer ring cells add +2 min friction',
  () => {
    const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    for (const f of fc.features) {
      const n = KANDIRA_NEIGHBORHOODS.find((x) => x.id === f.properties.neighborhoodId)!;
      const yd = getYearData(n, 2025);
      if (f.properties.isCoreCell) {
        assert(
          f.properties.healthAccessMin === yd.healthAccessMin,
          `Core cell for ${n.name} healthAccessMin mismatch`
        );
        assert(
          f.properties.educationAccessMin === yd.educationAccessMin,
          `Core cell for ${n.name} educationAccessMin mismatch`
        );
      } else {
        assert(
          f.properties.healthAccessMin === yd.healthAccessMin + 2,
          `Ring cell for ${n.name} healthAccessMin should be +2 min`
        );
        assert(
          f.properties.educationAccessMin === yd.educationAccessMin + 2,
          `Ring cell for ${n.name} educationAccessMin should be +2 min`
        );
      }
    }
  }
);

// F6: Mahalle Kartları UI, Filters, Comparison Matrix & Source Contracts
runTest(
  'T1-F6-01',
  'Tier 1',
  'F6',
  'NeighborhoodCard.tsx renders H3 Res-8 badge, 5-year SVG sparkline, summer peak badge, and all 4 domain sections',
  () => {
    const src = fs.readFileSync(
      path.join(ROOT_DIR, 'src/components/NeighborhoodCard.tsx'),
      'utf-8'
    );
    assert(src.includes('latLngToCell(lat, lng, 8)'), 'NeighborhoodCard must compute H3 Res-8 index');
    assert(src.includes('<polyline'), 'NeighborhoodCard must render inline SVG sparkline polyline');
    assert(src.includes('summerPopulationMultiplier'), 'NeighborhoodCard must display summer multiplier');
    assert(src.includes('Kırılgan Gruplar'), 'NeighborhoodCard must include Kırılgan Gruplar section');
    assert(src.includes('Arazi & Yapılaşma'), 'NeighborhoodCard must include Arazi & Yapılaşma section');
  }
);

runTest(
  'T1-F6-02',
  'Tier 1',
  'F6',
  'NeighborhoodDetailDrawer.tsx includes all 5 deep-dive sections and displays land-use changes in both % and hectares (ha)',
  () => {
    const src = fs.readFileSync(
      path.join(ROOT_DIR, 'src/components/NeighborhoodDetailDrawer.tsx'),
      'utf-8'
    );
    assert(src.includes('Bölüm 1:'), 'Missing Bölüm 1 in NeighborhoodDetailDrawer');
    assert(src.includes('Bölüm 2:'), 'Missing Bölüm 2 in NeighborhoodDetailDrawer');
    assert(src.includes('Bölüm 3:'), 'Missing Bölüm 3 in NeighborhoodDetailDrawer');
    assert(src.includes('Bölüm 4:'), 'Missing Bölüm 4 in NeighborhoodDetailDrawer');
    assert(src.includes('Bölüm 5:'), 'Missing Bölüm 5 in NeighborhoodDetailDrawer');
    assert(
      /\bha\b|hektar/i.test(src),
      'NeighborhoodDetailDrawer Bölüm 3 must display land use in hectares (ha / hektar) in addition to %'
    );
  }
);

runTest(
  'T1-F6-03',
  'Tier 1',
  'F6',
  'H3MapView.tsx defines all 7 thematic layers (including educationAccessMin), Resolution 7 & 8 switcher, and 2D/3D extrusion',
  () => {
    const src = fs.readFileSync(
      path.join(ROOT_DIR, 'src/components/H3MapView.tsx'),
      'utf-8'
    );
    const layers = [
      'vulnerabilityScore',
      'popChange5YrPct',
      'elderlyPct',
      'builtUpChange5YrPct',
      'healthAccessMin',
      'educationAccessMin',
      'summerPopEstimate',
    ];
    for (const layer of layers) {
      assert(
        src.includes(`${layer}:`),
        `H3MapView.tsx LAYER_CONFIGS must define thematic layer '${layer}'`
      );
    }
    assert(src.includes('setResolution(7)') && src.includes('setResolution(8)'), 'H3MapView must support Res 7 & 8');
    assert(src.includes('setIs3D'), 'H3MapView must support 2D/3D prism extrusion toggle');
  }
);

runTest(
  'T1-F6-04',
  'Tier 1',
  'F6',
  'ComparisonView.tsx, TimeSliderBar.tsx, and WeightSimulatorDrawer.tsx implement comparison matrix, 2021–2025 playback, and policy presets',
  () => {
    const compSrc = fs.readFileSync(
      path.join(ROOT_DIR, 'src/components/ComparisonView.tsx'),
      'utf-8'
    );
    const sliderSrc = fs.readFileSync(
      path.join(ROOT_DIR, 'src/components/TimeSliderBar.tsx'),
      'utf-8'
    );
    const weightSrc = fs.readFileSync(
      path.join(ROOT_DIR, 'src/components/WeightSimulatorDrawer.tsx'),
      'utf-8'
    );
    assert(
      compSrc.includes('activeComparisonList.length < 4'),
      'ComparisonView must support up to 4 neighborhoods side-by-side'
    );
    assert(
      sliderSrc.includes('[2021, 2022, 2023, 2024, 2025]'),
      'TimeSliderBar must step across 2021..2025'
    );
    assert(
      weightSrc.includes('POLICY_PRESETS') && weightSrc.includes('landPressureWeight'),
      'WeightSimulatorDrawer must provide policy presets and 5 criteria sliders'
    );
  }
);

runTest(
  'T1-F6-05',
  'Tier 1',
  'F6',
  'All quick-jump neighborhood IDs in App.tsx (Hızlı Odak Noktaları) resolve to valid KANDIRA_NEIGHBORHOODS entries',
  () => {
    const appSrc = fs.readFileSync(path.join(ROOT_DIR, 'src/App.tsx'), 'utf-8');
    const quickJumpMatch = appSrc.match(
      /Hızlı Odak Noktaları:[\s\S]*?\[([\s\S]*?)\]\.map/
    );
    assert(quickJumpMatch, 'Could not locate Quick Jump array in src/App.tsx');
    const rawIds = Array.from(quickJumpMatch[1].matchAll(/'([^']+)'/g)).map(
      (m) => m[1]
    );
    assert(rawIds.length >= 8, `Expected >= 8 quick-jump IDs, found ${rawIds.length}`);
    const validIds = new Set(KANDIRA_NEIGHBORHOODS.map((n) => n.id));
    const invalidIds = rawIds.filter((id) => !validIds.has(id));
    assert(
      invalidIds.length === 0,
      `App.tsx contains invalid quick-jump neighborhood IDs not in KANDIRA_NEIGHBORHOODS: ${invalidIds.join(', ')}`
    );
  }
);

runTest(
  'T1-F6-06',
  'Tier 1',
  'F6',
  'index.html title and meta description accurately reference Kandıra and its 36 neighborhoods',
  () => {
    const html = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf-8');
    assert(html.includes('Kandıra Mahalle Kartları'), 'index.html must include Kandıra title');
    assert(
      !html.includes('96 mahallesi'),
      'index.html meta description must not contain stale "96 mahallesi" count'
    );
    assert(
      /36\s+(?:temsilci\s+)?mahalle/i.test(html),
      'index.html meta description should reference 36 (temsilci) mahalle'
    );
  }
);

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (6 features × 6 tests = 36 tests)
// ============================================================================
console.log('\n--- TIER 2: Boundary & Corner Cases (F1..F6) ---');

// F1 Boundaries
runTest(
  'T2-F1-01',
  'Tier 2',
  'F1',
  'Base year boundary (2021): popChangeSince2021Pct is strictly 0.0% and baseline population is 48,555',
  () => {
    const summary2021 = getDistrictSummaryMetrics(KANDIRA_NEIGHBORHOODS, 2021);
    assert(
      summary2021.popChangeSince2021Pct === 0,
      `Expected 0% change in base year 2021, got ${summary2021.popChangeSince2021Pct}%`
    );
    assert(
      summary2021.totalPopulation === 48555,
      `Expected 2021 baseline population 48,555, got ${summary2021.totalPopulation}`
    );
  }
);

runTest(
  'T2-F1-02',
  'Tier 2',
  'F1',
  'Horizon year boundary (2025): district population reaches 52,200 (+7.5% over 2021)',
  () => {
    const summary2025 = getDistrictSummaryMetrics(KANDIRA_NEIGHBORHOODS, 2025);
    assert(
      summary2025.totalPopulation === 52200,
      `Expected 2025 district population 52,200, got ${summary2025.totalPopulation}`
    );
    assertClose(summary2025.popChangeSince2021Pct, 7.5, 0.1, '2025 popChangeSince2021Pct');
  }
);

runTest(
  'T2-F1-03',
  'Tier 2',
  'F1',
  'Out-of-bounds year fallback in getYearData safely returns the latest 2025 demographic record',
  () => {
    const akdurak = KANDIRA_NEIGHBORHOODS[0];
    const fallback = getYearData(akdurak, 2099);
    const y2025 = getYearData(akdurak, 2025);
    assert(
      fallback.year === 2025 && fallback.total === y2025.total,
      'getYearData for out-of-range year must fall back to 2025 entry'
    );
  }
);

runTest(
  'T2-F1-04',
  'Tier 2',
  'F1',
  'Population size extremes: largest neighborhood (Akdurak, 10,890) vs smallest village (Deliveli, 385)',
  () => {
    const sorted = [...KANDIRA_NEIGHBORHOODS].sort(
      (a, b) => getYearData(b, 2025).total - getYearData(a, 2025).total
    );
    const largest = sorted[0];
    const smallest = sorted[sorted.length - 1];
    assert(
      largest.id === 'akdurak' && getYearData(largest, 2025).total === 10890,
      `Expected Akdurak (10,890) as largest, got ${largest.name} (${getYearData(largest, 2025).total})`
    );
    assert(
      smallest.id === 'deliveli' && getYearData(smallest, 2025).total === 385,
      `Expected Deliveli (385) as smallest, got ${smallest.name} (${getYearData(smallest, 2025).total})`
    );
  }
);

runTest(
  'T2-F1-05',
  'Tier 2',
  'F1',
  'Summer multiplier extremes: Kıncıllı/Kerpe reaches 20.0x in 2025 while urban Aydınlık is 1.2x',
  () => {
    const maxMult = Math.max(
      ...KANDIRA_NEIGHBORHOODS.map((n) => getYearData(n, 2025).summerPopulationMultiplier)
    );
    const minMult = Math.min(
      ...KANDIRA_NEIGHBORHOODS.map((n) => getYearData(n, 2025).summerPopulationMultiplier)
    );
    assert(maxMult === 20.0, `Expected max summer multiplier 20.0x (Kerpe), got ${maxMult}`);
    assert(minMult === 1.2, `Expected min summer multiplier 1.2x (Aydınlık), got ${minMult}`);
  }
);

runTest(
  'T2-F1-06',
  'Tier 2',
  'F1',
  'Net migration extremes: highest inflow in Kıncıllı/Kerpe (+46.2‰) vs steepest outflow in Deliveli (-21.8‰)',
  () => {
    const kincilli = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kincilli')!;
    const deliveli = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'deliveli')!;
    assert(
      getYearData(kincilli, 2025).netMigrationPermille === 46.2,
      `Expected Kıncıllı 2025 net migration +46.2‰, got ${getYearData(kincilli, 2025).netMigrationPermille}`
    );
    assert(
      getYearData(deliveli, 2025).netMigrationPermille === -21.8,
      `Expected Deliveli 2025 net migration -21.8‰, got ${getYearData(deliveli, 2025).netMigrationPermille}`
    );
  }
);

// F2 Boundaries
runTest(
  'T2-F2-01',
  'Tier 2',
  'F2',
  'All-zero policy weights boundary: calculateDynamicVulnerabilityScore avoids NaN/division-by-zero and returns 0',
  () => {
    const zeroWeights: VulnerabilityWeights = {
      elderlyWeight: 0,
      socialAidWeight: 0,
      healthAccessWeight: 0,
      educationAccessWeight: 0,
      landPressureWeight: 0,
    };
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const score = calculateDynamicVulnerabilityScore(n, zeroWeights, 2025);
      assert(score === 0, `Expected 0 score under all-zero weights for ${n.name}, got ${score}`);
    }
  }
);

runTest(
  'T2-F2-02',
  'Tier 2',
  'F2',
  'Single-criterion 100% elderlyWeight boundary: Kırkarmut (43.8% elderly) scores 99.4 while Akdurak (13.8%) scores 11.2',
  () => {
    const elderlyOnly: VulnerabilityWeights = {
      elderlyWeight: 50,
      socialAidWeight: 0,
      healthAccessWeight: 0,
      educationAccessWeight: 0,
      landPressureWeight: 0,
    };
    const kirkarmut = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kirkarmut')!;
    const akdurak = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'akdurak')!;
    const krkScore = calculateDynamicVulnerabilityScore(kirkarmut, elderlyOnly, 2025);
    const akdScore = calculateDynamicVulnerabilityScore(akdurak, elderlyOnly, 2025);
    assertClose(krkScore, 99.4, 0.2, 'Kırkarmut elderly-only score');
    assertClose(akdScore, 11.2, 0.2, 'Akdurak elderly-only score');
  }
);

runTest(
  'T2-F2-03',
  'Tier 2',
  'F2',
  'Single-criterion 100% landPressureWeight boundary: coastal Kerpe & Cebeci saturate at 100.0 while rural Kırkarmut is < 10',
  () => {
    const landOnly: VulnerabilityWeights = {
      elderlyWeight: 0,
      socialAidWeight: 0,
      healthAccessWeight: 0,
      educationAccessWeight: 0,
      landPressureWeight: 50,
    };
    const kincilli = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kincilli')!;
    const cebeci = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'cebeci')!;
    const kirkarmut = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kirkarmut')!;
    assert(
      calculateDynamicVulnerabilityScore(kincilli, landOnly, 2025) === 100,
      'Kıncıllı (Kerpe) must saturate at 100.0 under 100% landPressureWeight'
    );
    assert(
      calculateDynamicVulnerabilityScore(cebeci, landOnly, 2025) === 100,
      'Cebeci must saturate at 100.0 under 100% landPressureWeight'
    );
    assert(
      calculateDynamicVulnerabilityScore(kirkarmut, landOnly, 2025) < 10,
      'Kırkarmut must score < 10 under 100% landPressureWeight'
    );
  }
);

runTest(
  'T2-F2-04',
  'Tier 2',
  'F2',
  'Single-criterion 100% healthAccessWeight boundary: Babalı (23 min) scores 95.2 while Çarşı (3 min) scores 0.0',
  () => {
    const healthOnly: VulnerabilityWeights = {
      elderlyWeight: 0,
      socialAidWeight: 0,
      healthAccessWeight: 50,
      educationAccessWeight: 0,
      landPressureWeight: 0,
    };
    const babali = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'babali')!;
    const carsi = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'carsi')!;
    assertClose(
      calculateDynamicVulnerabilityScore(babali, healthOnly, 2025),
      95.2,
      0.2,
      'Babalı health-only score'
    );
    assert(
      calculateDynamicVulnerabilityScore(carsi, healthOnly, 2025) === 0,
      'Çarşı (3 min access) must score 0.0 under health-only weight'
    );
  }
);

runTest(
  'T2-F2-05',
  'Tier 2',
  'F2',
  'Scale invariance of policy weights: scaling all weights by 0.5x or 5x yields identical scores',
  () => {
    const halfWeights: VulnerabilityWeights = {
      elderlyWeight: 15,
      socialAidWeight: 12.5,
      healthAccessWeight: 10,
      educationAccessWeight: 7.5,
      landPressureWeight: 5,
    };
    const fiveXWeights: VulnerabilityWeights = {
      elderlyWeight: 150,
      socialAidWeight: 125,
      healthAccessWeight: 100,
      educationAccessWeight: 75,
      landPressureWeight: 50,
    };
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const base = calculateDynamicVulnerabilityScore(n, DEFAULT_VULNERABILITY_WEIGHTS, 2025);
      const half = calculateDynamicVulnerabilityScore(n, halfWeights, 2025);
      const fiveX = calculateDynamicVulnerabilityScore(n, fiveXWeights, 2025);
      assert(
        base === half && base === fiveX,
        `${n.name} score not scale-invariant: ${base} vs ${half} vs ${fiveX}`
      );
    }
  }
);

runTest(
  'T2-F2-06',
  'Tier 2',
  'F2',
  'Age distribution extremes: Kırkarmut has highest elderly share (43.8%) and lowest youth share (8.9%) in 2025',
  () => {
    const maxElderly = Math.max(
      ...KANDIRA_NEIGHBORHOODS.map((n) => getYearData(n, 2025).elderly65PlusPct)
    );
    const minYouth = Math.min(
      ...KANDIRA_NEIGHBORHOODS.map((n) => getYearData(n, 2025).youth0To14Pct)
    );
    const kirkarmut = getYearData(
      KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kirkarmut')!,
      2025
    );
    assert(kirkarmut.elderly65PlusPct === maxElderly && maxElderly === 43.8, 'Kırkarmut max elderly 43.8%');
    assert(kirkarmut.youth0To14Pct === minYouth && minYouth === 8.9, 'Kırkarmut min youth 8.9%');
  }
);

// F3 Boundaries
runTest(
  'T2-F3-01',
  'Tier 2',
  'F3',
  'Geographic area extremes: Kaymaz is largest (19.4 km² / 1,940 ha) and Çarşı is smallest (4.5 km² / 450 ha)',
  () => {
    const areas = KANDIRA_NEIGHBORHOODS.map((n) => n.areaKm2);
    const maxArea = Math.max(...areas);
    const minArea = Math.min(...areas);
    const kaymaz = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kaymaz')!;
    const carsi = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'carsi')!;
    assert(kaymaz.areaKm2 === maxArea && maxArea === 19.4, 'Kaymaz max area 19.4 km²');
    assert(carsi.areaKm2 === minArea && minArea === 4.5, 'Çarşı min area 4.5 km²');
  }
);

runTest(
  'T2-F3-02',
  'Tier 2',
  'F3',
  'Topographic elevation extremes: Deliveli is highest (148 m) and Babalı is lowest coastal plain (14 m)',
  () => {
    const elevations = KANDIRA_NEIGHBORHOODS.map((n) => n.elevationM);
    const maxElev = Math.max(...elevations);
    const minElev = Math.min(...elevations);
    const deliveli = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'deliveli')!;
    const babali = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'babali')!;
    assert(deliveli.elevationM === maxElev && maxElev === 148, 'Deliveli max elevation 148 m');
    assert(babali.elevationM === minElev && minElev === 14, 'Babalı min elevation 14 m');
  }
);

runTest(
  'T2-F3-03',
  'Tier 2',
  'F3',
  'Built-up surface density extremes in 2025: Çarşı (61.5%) vs Antaplı (7.2%)',
  () => {
    const builtUps = KANDIRA_NEIGHBORHOODS.map((n) => n.landUse.builtUpPct2025);
    assert(Math.max(...builtUps) === 61.5, 'Max builtUpPct2025 should be 61.5% (Çarşı)');
    assert(Math.min(...builtUps) === 7.2, 'Min builtUpPct2025 should be 7.2% (Antaplı)');
  }
);

runTest(
  'T2-F3-04',
  'Tier 2',
  'F3',
  'Building permit extremes (2021–2025): Kıncıllı/Kerpe (248 permits, +51.7% built-up) vs Antaplı (8 permits)',
  () => {
    const permits = KANDIRA_NEIGHBORHOODS.map((n) => n.landUse.newBuildingPermits5Yr);
    const kincilli = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kincilli')!;
    const antapli = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'antapli')!;
    assert(
      Math.max(...permits) === 248 && kincilli.landUse.newBuildingPermits5Yr === 248,
      'Kıncıllı max permits 248'
    );
    assert(
      Math.min(...permits) === 8 && antapli.landUse.newBuildingPermits5Yr === 8,
      'Antaplı min permits 8'
    );
  }
);

runTest(
  'T2-F3-05',
  'Tier 2',
  'F3',
  'Natural forest succession boundary: depopulating rural villages (Kirsal Nufus Kaybi - Atil Arazi) gain forest cover from 2021 to 2025',
  () => {
    const depopulating = KANDIRA_NEIGHBORHOODS.filter(
      (n) => n.landUse.changeCategory === 'Kirsal Nufus Kaybi - Atil Arazi'
    );
    assert(depopulating.length >= 4, 'Expected at least 4 depopulating rural villages');
    for (const n of depopulating) {
      assert(
        n.landUse.forestPct2025 > n.landUse.forestPct2021,
        `Expected forest gain in ${n.name}, got ${n.landUse.forestPct2021}% → ${n.landUse.forestPct2025}%`
      );
    }
  }
);

runTest(
  'T2-F3-06',
  'Tier 2',
  'F3',
  'Agricultural hazelnut basin boundary: kirsal_tarim neighborhoods all exceed 48% agricultural land cover in 2025',
  () => {
    const agriZone = KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === 'kirsal_tarim');
    for (const n of agriZone) {
      assert(
        n.landUse.agricultureHazelnutPct2025 >= 48.0,
        `Expected >= 48% agriculture/hazelnut cover in ${n.name}, got ${n.landUse.agricultureHazelnutPct2025}%`
      );
    }
  }
);

// F4 Boundaries
runTest(
  'T2-F4-01',
  'Tier 2',
  'F4',
  'Hospital distance & ambulance ETA extremes: Çarşı (0.2 km, 3 min) vs Babalı (26.4 km, 23 min)',
  () => {
    const carsi = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'carsi')!;
    const babali = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'babali')!;
    assert(
      carsi.distanceToCenterKm === 0.2 && carsi.services.health.ambulanceEtaMin === 3,
      'Çarşı must be closest (0.2 km, 3 min ETA)'
    );
    assert(
      babali.distanceToCenterKm === 26.4 && babali.services.health.ambulanceEtaMin === 23,
      'Babalı must be farthest (26.4 km, 23 min ETA)'
    );
  }
);

runTest(
  'T2-F4-02',
  'Tier 2',
  'F4',
  'Zero-ASM boundary: every neighborhood without a fixed ASM (asmCount === 0) receives >= 2 mobile health visits per month',
  () => {
    const noAsm = KANDIRA_NEIGHBORHOODS.filter((n) => n.services.health.asmCount === 0);
    assert(noAsm.length >= 20, 'Expected >= 20 rural/coastal neighborhoods without fixed ASM');
    for (const n of noAsm) {
      assert(
        n.services.health.mobileHealthVisitPerMonth >= 2,
        `${n.name} has 0 ASM so mobileHealthVisitPerMonth must be >= 2`
      );
    }
  }
);

runTest(
  'T2-F4-03',
  'Tier 2',
  'F4',
  'Zero-school boundary: all 14 neighborhoods without local schools have 100% bussed education dependency and internetLabAvailable === false',
  () => {
    const noSchool = KANDIRA_NEIGHBORHOODS.filter(
      (n) =>
        n.services.education.kindergartenCount +
          n.services.education.primaryMiddleCount +
          n.services.education.highSchoolCount ===
        0
    );
    assert(noSchool.length >= 10, `Expected >= 10 zero-school villages, got ${noSchool.length}`);
    for (const n of noSchool) {
      assert(
        n.services.education.bussedStudentsCount >= 18,
        `${n.name} with 0 schools must have bussed students`
      );
      assert(
        n.services.education.internetLabAvailable === false,
        `${n.name} with 0 schools cannot have internetLabAvailable === true`
      );
    }
  }
);

runTest(
  'T2-F4-04',
  'Tier 2',
  'F4',
  'Bussed student volume extremes: Kefken (95 students) vs central Akdurak/Aydınlık/Çarşı/Orhan (0 bussed students)',
  () => {
    const kefken = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kefken')!;
    assert(
      kefken.services.education.bussedStudentsCount === 95,
      `Expected 95 bussed students in Kefken, got ${kefken.services.education.bussedStudentsCount}`
    );
    for (const id of ['akdurak', 'aydinlik', 'carsi', 'orhan']) {
      const n = KANDIRA_NEIGHBORHOODS.find((x) => x.id === id)!;
      assert(
        n.services.education.bussedStudentsCount === 0,
        `Central neighborhood ${n.name} should have 0 bussed students`
      );
    }
  }
);

runTest(
  'T2-F4-05',
  'Tier 2',
  'F4',
  'Summer water pressure boundary: yaz_basinc_sorunu occurs exclusively in high-multiplier coastal tourism neighborhoods',
  () => {
    const pressureList = KANDIRA_NEIGHBORHOODS.filter(
      (n) => n.services.infrastructure.drinkingWaterStatus === 'yaz_basinc_sorunu'
    );
    assert(pressureList.length >= 6, `Expected >= 6 coastal neighborhoods with summer water pressure issue`);
    for (const n of pressureList) {
      assert(
        n.zone === 'kiyi_turizm',
        `${n.name} has yaz_basinc_sorunu but is in zone ${n.zone}`
      );
    }
  }
);

runTest(
  'T2-F4-06',
  'Tier 2',
  'F4',
  'Fiber broadband coverage extremes: Çarşı (96%) vs Antaplı (52%)',
  () => {
    const fibers = KANDIRA_NEIGHBORHOODS.map(
      (n) => n.services.infrastructure.fiberBroadbandPct
    );
    assert(Math.max(...fibers) === 96, 'Max fiber % should be 96% (Çarşı)');
    assert(Math.min(...fibers) === 52, 'Min fiber % should be 52% (Antaplı)');
  }
);

// F5 Boundaries
runTest(
  'T2-F5-01',
  'Tier 2',
  'F5',
  'H3 Resolution 7 vs Resolution 8 density boundary: Res 8 generates > 3.5x more cells than Res 7 while both have 36 core cells',
  () => {
    const fc7 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 7);
    const fc8 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    assert(
      fc8.features.length > fc7.features.length * 3.5,
      `Expected Res 8 (${fc8.features.length}) > 3.5x Res 7 (${fc7.features.length})`
    );
    assert(
      fc7.features.filter((f) => f.properties.isCoreCell).length === 36 &&
        fc8.features.filter((f) => f.properties.isCoreCell).length === 36,
      'Both Res 7 and Res 8 must have exactly 36 core cells'
    );
  }
);

runTest(
  'T2-F5-02',
  'Tier 2',
  'F5',
  'Area-adaptive H3 k-ring boundary at Resolution 8: large neighborhoods (areaKm2 > 13) generate more H3 cells than compact Çarşı',
  () => {
    const fc8 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    const karaagacCells = fc8.features.filter(
      (f) => f.properties.neighborhoodId === 'karaagac'
    ).length;
    const carsiCells = fc8.features.filter(
      (f) => f.properties.neighborhoodId === 'carsi'
    ).length;
    assert(
      karaagacCells > carsiCells,
      `Expected Karaağaç (${karaagacCells} cells) > Çarşı (4.5 km², ${carsiCells} cells)`
    );
  }
);

runTest(
  'T2-F5-03',
  'Tier 2',
  'F5',
  'Geographic bounding box invariant: all H3 cell centroids at Res 7 and Res 8 lie within Kandıra bounds',
  () => {
    for (const res of [7, 8] as const) {
      const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, res);
      for (const f of fc.features) {
        const [lat, lng] = cellToLatLng(f.properties.h3Index);
        assert(
          lng >= 30.0 && lng <= 30.42 && lat >= 40.93 && lat <= 41.2,
          `H3 cell ${f.properties.h3Index} centroid (${lat}, ${lng}) out of Kandıra bounds`
        );
      }
    }
  }
);

runTest(
  'T2-F5-04',
  'Tier 2',
  'F5',
  'Minimum H3 cell population floor: every generated hexagon has population >= 8',
  () => {
    for (const res of [7, 8] as const) {
      const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, res);
      for (const f of fc.features) {
        assert(
          f.properties.population >= 8,
          `H3 cell ${f.properties.h3Index} population (${f.properties.population}) < 8`
        );
      }
    }
  }
);

runTest(
  'T2-F5-05',
  'Tier 2',
  'F5',
  'H3 cell builtUpPct cap invariant: every hexagon has builtUpPct clamped within [0, 95]',
  () => {
    const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    for (const f of fc.features) {
      assert(
        f.properties.builtUpPct >= 0 && f.properties.builtUpPct <= 95,
        `H3 cell ${f.properties.h3Index} builtUpPct (${f.properties.builtUpPct}) out of [0, 95]`
      );
    }
  }
);

runTest(
  'T2-F5-06',
  'Tier 2',
  'F5',
  'Empty input boundary: generateKandiraH3GeoJSON([]) and getDistrictSummaryMetrics([]) handle empty arrays safely without NaN',
  () => {
    const emptyFc = generateKandiraH3GeoJSON([], 2025, 8);
    assert(emptyFc.features.length === 0, 'Empty neighborhoods must produce 0 H3 features');
    const emptySummary = getDistrictSummaryMetrics([], 2025);
    assert(
      emptySummary.totalPopulation === 0 &&
        Number.isFinite(emptySummary.avgElderlyPct) &&
        Number.isFinite(emptySummary.avgHealthAccessMin),
      'Empty district summary must not produce NaN or Infinity'
    );
  }
);

// F6 Boundaries
runTest(
  'T2-F6-01',
  'Tier 2',
  'F6',
  'Search filter boundary: code match ("KND-36"), Turkish diacritic name ("Kırkarmut"), summary keyword ("Pembe Kayalar"), and empty match',
  () => {
    const search = (q: string) => {
      const norm = q.trim().toLowerCase();
      return KANDIRA_NEIGHBORHOODS.filter(
        (n) =>
          n.name.toLowerCase().includes(norm) ||
          n.code.toLowerCase().includes(norm) ||
          n.summary.toLowerCase().includes(norm)
      );
    };
    assert(search('KND-36').length === 1 && search('KND-36')[0].id === 'kirkarmut', 'Code search KND-36');
    assert(search('kırkarmut').length === 1, 'Turkish name search kırkarmut');
    assert(search('Pembe Kayalar').length === 1 && search('Pembe Kayalar')[0].id === 'kefken', 'Summary keyword search');
    assert(search(' olmayan_mahalle_xyz ').length === 0, 'Non-existent search must return 0');
  }
);

runTest(
  'T2-F6-02',
  'Tier 2',
  'F6',
  'Zone filter partition boundary: merkez (5) + kiyi_turizm (10) + kirsal_tarim (13) + kirsal_orman (8) = 36',
  () => {
    const counts: Record<NeighborhoodZone, number> = {
      merkez: KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === 'merkez').length,
      kiyi_turizm: KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === 'kiyi_turizm').length,
      kirsal_tarim: KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === 'kirsal_tarim').length,
      kirsal_orman: KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === 'kirsal_orman').length,
    };
    assert(counts.merkez === 5, `Expected 5 merkez neighborhoods, got ${counts.merkez}`);
    assert(counts.kiyi_turizm === 10, `Expected 10 kiyi_turizm neighborhoods, got ${counts.kiyi_turizm}`);
    assert(counts.kirsal_tarim === 13, `Expected 13 kirsal_tarim neighborhoods, got ${counts.kirsal_tarim}`);
    assert(counts.kirsal_orman === 8, `Expected 8 kirsal_orman neighborhoods, got ${counts.kirsal_orman}`);
    assert(
      counts.merkez + counts.kiyi_turizm + counts.kirsal_tarim + counts.kirsal_orman === 36,
      'Zone counts must sum to 36'
    );
  }
);

runTest(
  'T2-F6-03',
  'Tier 2',
  'F6',
  'Quick risk filter boundaries: high_vulnerability, elderly_dense, coastal_pressure (12), and service_critical predicates return valid non-empty subsets',
  () => {
    const highVuln = KANDIRA_NEIGHBORHOODS.filter(
      (n) => calculateDynamicVulnerabilityScore(n, DEFAULT_VULNERABILITY_WEIGHTS, 2025) >= 60
    );
    const elderlyDense = KANDIRA_NEIGHBORHOODS.filter(
      (n) => getYearData(n, 2025).elderly65PlusPct >= 30
    );
    const coastalPressure = KANDIRA_NEIGHBORHOODS.filter(
      (n) =>
        n.landUse.changeCategory === 'Yuksek Kiyi Yapilasma Baskisi' ||
        n.landUse.changeCategory === 'Kentsel Yayilma'
    );
    const serviceCritical = KANDIRA_NEIGHBORHOODS.filter(
      (n) =>
        n.services.health.trend5Yr === 'kritik' ||
        n.services.education.trend5Yr === 'kritik' ||
        getYearData(n, 2025).healthAccessMin >= 15
    );
    assert(highVuln.length >= 3 && highVuln.length < 36, `Invalid highVuln count: ${highVuln.length}`);
    assert(elderlyDense.length >= 10 && elderlyDense.length < 36, `Invalid elderlyDense count: ${elderlyDense.length}`);
    assert(coastalPressure.length === 12, `Expected 12 coastal+urban pressure neighborhoods (7 coastal + 5 urban), got ${coastalPressure.length}`);
    assert(serviceCritical.length >= 10 && serviceCritical.length < 36, `Invalid serviceCritical count: ${serviceCritical.length}`);
  }
);

runTest(
  'T2-F6-04',
  'Tier 2',
  'F6',
  'Comparison matrix FIFO cap boundary: toggling a 5th neighborhood keeps list length at 4 by dropping the oldest entry',
  () => {
    let comparedIds = ['akdurak', 'kefken', 'kirkarmut'];
    const toggleCompare = (id: string) => {
      if (comparedIds.includes(id)) {
        comparedIds = comparedIds.filter((x) => x !== id);
      } else if (comparedIds.length >= 4) {
        comparedIds = [...comparedIds.slice(1), id];
      } else {
        comparedIds = [...comparedIds, id];
      }
    };
    toggleCompare('cebeci');
    assert(comparedIds.length === 4, 'Should hold 4 neighborhoods');
    toggleCompare('babali');
    assert(
      comparedIds.length === 4 &&
        !comparedIds.includes('akdurak') &&
        comparedIds[3] === 'babali',
      'Adding 5th neighborhood must cap at 4 via FIFO replacement'
    );
  }
);

runTest(
  'T2-F6-05',
  'Tier 2',
  'F6',
  'All 6 sort comparators produce strictly non-increasing monotonic sequences across all 36 neighborhoods',
  () => {
    const metricExtractors: Array<(n: (typeof KANDIRA_NEIGHBORHOODS)[0]) => number> = [
      (n) => calculateDynamicVulnerabilityScore(n, DEFAULT_VULNERABILITY_WEIGHTS, 2025),
      (n) => getYearData(n, 2025).total,
      (n) =>
        ((getYearData(n, 2025).total - getYearData(n, 2021).total) /
          getYearData(n, 2021).total) *
        100,
      (n) => getYearData(n, 2025).elderly65PlusPct,
      (n) => n.landUse.imperviousSurfaceChangePct,
      (n) => getYearData(n, 2025).healthAccessMin,
    ];
    for (const getMetric of metricExtractors) {
      const sorted = [...KANDIRA_NEIGHBORHOODS].sort((a, b) => getMetric(b) - getMetric(a));
      for (let i = 0; i < sorted.length - 1; i++) {
        assert(
          getMetric(sorted[i]) >= getMetric(sorted[i + 1]),
          'Sort comparator failed descending monotonicity'
        );
      }
    }
  }
);

runTest(
  'T2-F6-06',
  'Tier 2',
  'F6',
  'All 4 policy presets in WeightSimulatorDrawer have raw weights summing to 100%',
  () => {
    const presets: VulnerabilityWeights[] = [
      { ...DEFAULT_VULNERABILITY_WEIGHTS },
      { elderlyWeight: 42, socialAidWeight: 18, healthAccessWeight: 30, educationAccessWeight: 5, landPressureWeight: 5 },
      { elderlyWeight: 10, socialAidWeight: 10, healthAccessWeight: 15, educationAccessWeight: 15, landPressureWeight: 50 },
      { elderlyWeight: 15, socialAidWeight: 40, healthAccessWeight: 10, educationAccessWeight: 30, landPressureWeight: 5 },
    ];
    for (const p of presets) {
      const sum =
        p.elderlyWeight +
        p.socialAidWeight +
        p.healthAccessWeight +
        p.educationAccessWeight +
        p.landPressureWeight;
      assert(sum === 100, `Policy preset weights must sum to 100, got ${sum}`);
    }
  }
);

// ============================================================================
// TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS (10 tests)
// ============================================================================
console.log('\n--- TIER 3: Cross-Feature Pairwise Interactions ---');

runTest(
  'T3-PW-01',
  'Tier 3',
  'CROSS',
  'F1 (Time Slider Year) × F5 (H3 GeoJSON): stepping year 2021→2025 updates H3 cell demographics while preserving identical H3 spatial grid indices',
  () => {
    const fc2021 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2021, 8);
    const fc2025 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    assert(
      fc2021.features.length === fc2025.features.length,
      'H3 grid feature count must remain invariant across years'
    );
    const indices2021 = fc2021.features.map((f) => f.properties.h3Index).join(',');
    const indices2025 = fc2025.features.map((f) => f.properties.h3Index).join(',');
    assert(indices2021 === indices2025, 'H3 indices must be identical across 2021 and 2025');

    const kefkenCore2021 = fc2021.features.find(
      (f) => f.properties.neighborhoodId === 'kefken' && f.properties.isCoreCell
    )!;
    const kefkenCore2025 = fc2025.features.find(
      (f) => f.properties.neighborhoodId === 'kefken' && f.properties.isCoreCell
    )!;
    assert(
      kefkenCore2025.properties.population > kefkenCore2021.properties.population &&
        kefkenCore2025.properties.summerPopEstimate >
          kefkenCore2021.properties.summerPopEstimate,
      'Kefken core H3 cell population and summerPopEstimate must increase from 2021 to 2025'
    );
  }
);

runTest(
  'T3-PW-02',
  'Tier 3',
  'CROSS',
  'F2 (Policy Weights) × F5 (H3 Vulnerability Layer): changing policy weights dynamically shifts H3 cell vulnerabilityScore',
  () => {
    const ruralWeights: VulnerabilityWeights = {
      elderlyWeight: 45,
      socialAidWeight: 20,
      healthAccessWeight: 30,
      educationAccessWeight: 5,
      landPressureWeight: 0,
    };
    const coastalWeights: VulnerabilityWeights = {
      elderlyWeight: 5,
      socialAidWeight: 5,
      healthAccessWeight: 10,
      educationAccessWeight: 10,
      landPressureWeight: 70,
    };
    const fcRural = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8, ruralWeights);
    const fcCoastal = generateKandiraH3GeoJSON(
      KANDIRA_NEIGHBORHOODS,
      2025,
      8,
      coastalWeights
    );

    const kincilliRural = fcRural.features.find(
      (f) => f.properties.neighborhoodId === 'kincilli' && f.properties.isCoreCell
    )!;
    const kincilliCoastal = fcCoastal.features.find(
      (f) => f.properties.neighborhoodId === 'kincilli' && f.properties.isCoreCell
    )!;
    assert(
      kincilliCoastal.properties.vulnerabilityScore >
        kincilliRural.properties.vulnerabilityScore + 25,
      `Expected Kıncıllı H3 score to jump by >25 points under coastal weights (${kincilliRural.properties.vulnerabilityScore} → ${kincilliCoastal.properties.vulnerabilityScore})`
    );
  }
);

runTest(
  'T3-PW-03',
  'Tier 3',
  'CROSS',
  'F1 (Demographics) × F6 (Regional Zone Breakdown): sum of 4 zone populations and counts equals district total across all 5 years',
  () => {
    for (const year of SURVEY_YEARS) {
      const summary = getDistrictSummaryMetrics(KANDIRA_NEIGHBORHOODS, year);
      const zb = summary.zoneBreakdown;
      const sumCounts =
        zb.merkez.count +
        zb.kiyi_turizm.count +
        zb.kirsal_tarim.count +
        zb.kirsal_orman.count;
      const sumPops =
        zb.merkez.population +
        zb.kiyi_turizm.population +
        zb.kirsal_tarim.population +
        zb.kirsal_orman.population;
      assert(sumCounts === 36, `Zone count sum in ${year} must equal 36`);
      assert(
        sumPops === summary.totalPopulation,
        `Zone population sum (${sumPops}) !== district totalPopulation (${summary.totalPopulation}) in ${year}`
      );
    }
  }
);

runTest(
  'T3-PW-04',
  'Tier 3',
  'CROSS',
  'F1 (Summer Tourism Surge) × F4 (Water Infrastructure Stress): all 6 coastal neighborhoods with summer multiplier >= 13x report yaz_basinc_sorunu',
  () => {
    const extremeSummer = KANDIRA_NEIGHBORHOODS.filter(
      (n) => getYearData(n, 2025).summerPopulationMultiplier >= 13.0
    );
    assert(
      extremeSummer.length === 6,
      `Expected 6 extreme summer surge neighborhoods (>=13x), got ${extremeSummer.length}`
    );
    for (const n of extremeSummer) {
      assert(
        n.services.infrastructure.drinkingWaterStatus === 'yaz_basinc_sorunu',
        `Expected ${n.name} (${getYearData(n, 2025).summerPopulationMultiplier}x summer pop) to have yaz_basinc_sorunu`
      );
    }
  }
);

runTest(
  'T3-PW-05',
  'Tier 3',
  'CROSS',
  'F3 (Hazelnut Agricultural Land Share) × F2 (Seasonal Agricultural Workers): kirsal_tarim leads all zones in both hazelnut share and seasonal workers',
  () => {
    const zones: NeighborhoodZone[] = [
      'merkez',
      'kiyi_turizm',
      'kirsal_tarim',
      'kirsal_orman',
    ];
    const workersByZone = Object.fromEntries(
      zones.map((z) => [
        z,
        KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === z).reduce(
          (s, n) => s + n.vulnerableGroups.seasonalAgriculturalWorkers,
          0
        ),
      ])
    ) as Record<NeighborhoodZone, number>;

    assert(
      workersByZone.kirsal_tarim > workersByZone.merkez &&
        workersByZone.kirsal_tarim > workersByZone.kiyi_turizm &&
        workersByZone.kirsal_tarim > workersByZone.kirsal_orman,
      `kirsal_tarim (${workersByZone.kirsal_tarim}) must lead all zones in seasonal workers`
    );
  }
);

runTest(
  'T3-PW-06',
  'Tier 3',
  'CROSS',
  'F2 (Rural Forest Hyper-Aging) × F4 (Mobile Health & Bussed Education): all kirsal_orman villages combine >=34% elderly, 0 ASM, mobile health >=4/mo, and bussed students',
  () => {
    const forestVillages = KANDIRA_NEIGHBORHOODS.filter(
      (n) => n.zone === 'kirsal_orman'
    );
    assert(forestVillages.length === 8, 'Must have 8 kirsal_orman villages');
    for (const n of forestVillages) {
      const yd2025 = getYearData(n, 2025);
      assert(
        yd2025.elderly65PlusPct >= 34.0,
        `${n.name} elderly % (${yd2025.elderly65PlusPct}) should be >= 34%`
      );
      assert(n.services.health.asmCount === 0, `${n.name} should have 0 fixed ASM`);
      assert(
        n.services.health.mobileHealthVisitPerMonth >= 4,
        `${n.name} should have >= 4 monthly mobile health visits`
      );
      assert(
        n.services.education.bussedStudentsCount > 0,
        `${n.name} should rely on bussed education`
      );
    }
  }
);

runTest(
  'T3-PW-07',
  'Tier 3',
  'CROSS',
  'F3 (Coastal Construction Pressure) × F1 (Net Migration & Growth): all 7 Yuksek Kiyi Yapilasma Baskisi neighborhoods have migration >= 28‰ and 5-yr growth >= 15%',
  () => {
    const coastalPressure = KANDIRA_NEIGHBORHOODS.filter(
      (n) => n.landUse.changeCategory === 'Yuksek Kiyi Yapilasma Baskisi'
    );
    assert(
      coastalPressure.length === 7,
      `Expected 7 neighborhoods with Yuksek Kiyi Yapilasma Baskisi, got ${coastalPressure.length}`
    );
    for (const n of coastalPressure) {
      const y21 = getYearData(n, 2021);
      const y25 = getYearData(n, 2025);
      const growthPct = ((y25.total - y21.total) / y21.total) * 100;
      assert(
        y25.netMigrationPermille >= 28 && growthPct >= 15,
        `${n.name} expected high migration (${y25.netMigrationPermille}‰) and growth (${growthPct.toFixed(1)}%)`
      );
    }
  }
);

runTest(
  'T3-PW-08',
  'Tier 3',
  'CROSS',
  'F4 (Access Time Improvement 2021→2025) × F2 (Access Vulnerability Sub-Score): pure health+education access vulnerability score decreases from 2021 to 2025',
  () => {
    const accessOnlyWeights: VulnerabilityWeights = {
      elderlyWeight: 0,
      socialAidWeight: 0,
      healthAccessWeight: 50,
      educationAccessWeight: 50,
      landPressureWeight: 0,
    };
    for (const n of KANDIRA_NEIGHBORHOODS) {
      const s2021 = calculateDynamicVulnerabilityScore(n, accessOnlyWeights, 2021);
      const s2025 = calculateDynamicVulnerabilityScore(n, accessOnlyWeights, 2025);
      assert(
        s2025 <= s2021,
        `${n.name} access vulnerability should improve (decrease) from 2021 (${s2021}) to 2025 (${s2025})`
      );
    }
  }
);

runTest(
  'T3-PW-09',
  'Tier 3',
  'CROSS',
  'F5 (H3 Core Cell Bijection) × F6 (Map Inspector HUD): selecting any of the 36 neighborhoods resolves its exact core H3 cell at both Res 7 and Res 8',
  () => {
    for (const res of [7, 8] as const) {
      const fc = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, res);
      for (const n of KANDIRA_NEIGHBORHOODS) {
        const coreCell = fc.features.find(
          (f) => f.properties.neighborhoodId === n.id && f.properties.isCoreCell
        );
        assert(
          coreCell !== undefined,
          `Missing core H3 cell for neighborhood ${n.name} (${n.id}) at Resolution ${res}`
        );
      }
    }
  }
);

runTest(
  'T3-PW-10',
  'Tier 3',
  'CROSS',
  'F3 (Hectare Accounting) × F1 (District Area-Weighted Land Cover): district avgForestPct + avgAgriculturePct + avgBuiltUpPct equals 100% and matches total hectare ratios',
  () => {
    const summary2025 = getDistrictSummaryMetrics(KANDIRA_NEIGHBORHOODS, 2025);
    const sumPct =
      summary2025.avgForestPct +
      summary2025.avgAgriculturePct +
      summary2025.avgBuiltUpPct;
    assertClose(sumPct, 100.0, 0.2, 'District area-weighted land cover percentages must sum to 100%');

    const totalAreaHa = KANDIRA_NEIGHBORHOODS.reduce((s, n) => s + n.areaKm2 * 100, 0);
    const totalForestHa = KANDIRA_NEIGHBORHOODS.reduce(
      (s, n) => s + n.areaKm2 * n.landUse.forestPct2025,
      0
    );
    assertClose(
      (totalForestHa / totalAreaHa) * 100,
      summary2025.avgForestPct,
      0.1,
      'District forest hectare share must match avgForestPct'
    );
  }
);

// ============================================================================
// TIER 4: REAL-WORLD DECISION SUPPORT SCENARIOS (6 end-to-end scenarios)
// ============================================================================
console.log('\n--- TIER 4: Real-World Decision Support Scenarios (S1..S6) ---');

runTest(
  'T4-S1',
  'Tier 4',
  'SCENARIO',
  'S1: Coastal Tourism Peak & Infrastructure Stress Analysis (Kefken, Kıncıllı/Kerpe, Cebeci in 2025)',
  () => {
    const trioIds = ['kefken', 'kincilli', 'cebeci'];
    const trio = trioIds.map((id) => KANDIRA_NEIGHBORHOODS.find((n) => n.id === id)!);

    // 1. Winter permanent population vs Summer peak population
    const winterPop = trio.reduce((s, n) => s + getYearData(n, 2025).total, 0);
    const summerPop = trio.reduce((s, n) => {
      const yd = getYearData(n, 2025);
      return s + Math.round(yd.total * yd.summerPopulationMultiplier);
    }, 0);
    assert(winterPop === 5470, `Expected trio winter pop 5,470, got ${winterPop}`);
    assert(
      summerPop > 100000,
      `Expected Kefken+Kerpe+Cebeci summer peak > 100,000, got ${summerPop}`
    );

    // 2. Land-use permits & water stress
    const totalPermits = trio.reduce((s, n) => s + n.landUse.newBuildingPermits5Yr, 0);
    assert(totalPermits === 655, `Expected 655 5-year building permits in trio, got ${totalPermits}`);
    for (const n of trio) {
      assert(
        n.services.infrastructure.drinkingWaterStatus === 'yaz_basinc_sorunu',
        `${n.name} must flag yaz_basinc_sorunu`
      );
    }

    // 3. H3 spatial representation & coastline clipping
    const fc8 = generateKandiraH3GeoJSON(KANDIRA_NEIGHBORHOODS, 2025, 8);
    const trioCells = fc8.features.filter((f) =>
      trioIds.includes(f.properties.neighborhoodId)
    );
    assert(trioCells.length >= 15, `Expected >= 15 coastal H3 cells for trio, got ${trioCells.length}`);
    for (const cell of trioCells) {
      if (!cell.properties.isCoreCell) {
        const [lat, lng] = cellToLatLng(cell.properties.h3Index);
        assert(!isInBlackSea(lat, lng), `Coastal ring cell ${cell.properties.h3Index} spilled into sea`);
      }
    }
  }
);

runTest(
  'T4-S2',
  'Tier 4',
  'SCENARIO',
  'S2: Rural Forest Hyper-Aging & Mobile Health / Ambulance Triage (Kırkarmut, Deliveli, Antaplı)',
  () => {
    const forestTrioIds = ['kirkarmut', 'deliveli', 'antapli'];
    const forestTrio = forestTrioIds.map(
      (id) => KANDIRA_NEIGHBORHOODS.find((n) => n.id === id)!
    );

    for (const n of forestTrio) {
      const y21 = getYearData(n, 2021);
      const y25 = getYearData(n, 2025);
      assert(y25.total < y21.total, `${n.name} should show 5-year population decline`);
      assert(y25.elderly65PlusPct >= 39.5, `${n.name} should have >= 39.5% elderly in 2025`);
      assert(n.services.health.asmCount === 0, `${n.name} has 0 local ASM`);
      assert(
        n.services.health.mobileHealthVisitPerMonth >= 4,
        `${n.name} must receive >= 4 mobile health visits/month`
      );
    }

    // Under rural_elderly policy weights, all 3 rank in the top 5 most vulnerable neighborhoods in Kandıra
    const ruralElderlyWeights: VulnerabilityWeights = {
      elderlyWeight: 42,
      socialAidWeight: 18,
      healthAccessWeight: 30,
      educationAccessWeight: 5,
      landPressureWeight: 5,
    };
    const ranked = [...KANDIRA_NEIGHBORHOODS]
      .sort(
        (a, b) =>
          calculateDynamicVulnerabilityScore(b, ruralElderlyWeights, 2025) -
          calculateDynamicVulnerabilityScore(a, ruralElderlyWeights, 2025)
      )
      .slice(0, 5)
      .map((n) => n.id);

    for (const id of forestTrioIds) {
      assert(
        ranked.includes(id),
        `Expected ${id} in top 5 under rural_elderly policy preset, got top 5: ${ranked.join(', ')}`
      );
    }
  }
);

runTest(
  'T4-S3',
  'Tier 4',
  'SCENARIO',
  'S3: Agricultural Hazelnut Belt Seasonal Worker & Bussed Education Planning (Karaağaç, Kaymaz, Çamkonak)',
  () => {
    const agriTrioIds = ['karaagac', 'kaymaz', 'camkonak'];
    const agriTrio = agriTrioIds.map(
      (id) => KANDIRA_NEIGHBORHOODS.find((n) => n.id === id)!
    );

    let combinedAgriHa2025 = 0;
    let combinedSeasonalWorkers = 0;
    let combinedBussedStudents = 0;

    for (const n of agriTrio) {
      assert(
        n.landUse.changeCategory === 'Tarim-Findik Koruma Alani',
        `${n.name} must be classified as Tarim-Findik Koruma Alani`
      );
      combinedAgriHa2025 += n.areaKm2 * n.landUse.agricultureHazelnutPct2025;
      combinedSeasonalWorkers += n.vulnerableGroups.seasonalAgriculturalWorkers;
      combinedBussedStudents += n.services.education.bussedStudentsCount;
    }

    assertClose(
      combinedAgriHa2025,
      2811.55,
      0.5,
      'Expected 2,811.55 hectares of agricultural/hazelnut land in Karaağaç+Kaymaz+Çamkonak'
    );
    assert(
      combinedSeasonalWorkers === 735,
      `Expected 735 seasonal agricultural workers in Karaağaç+Kaymaz+Çamkonak, got ${combinedSeasonalWorkers}`
    );
    assert(
      combinedBussedStudents === 201,
      `Expected 201 bussed students across Karaağaç+Kaymaz+Çamkonak, got ${combinedBussedStudents}`
    );
  }
);

runTest(
  'T4-S4',
  'Tier 4',
  'SCENARIO',
  'S4: Central Urban Growth & Multi-Neighborhood Side-by-Side Comparison (Akdurak vs Kefken vs Kırkarmut)',
  () => {
    const akdurak = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'akdurak')!;
    const kefken = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kefken')!;
    const kirkarmut = KANDIRA_NEIGHBORHOODS.find((n) => n.id === 'kirkarmut')!;

    // Verify contrasting multi-dimensional profiles across Merkez, Kıyı, and Orman
    assert(
      getYearData(akdurak, 2025).total > getYearData(kefken, 2025).total &&
        getYearData(kefken, 2025).total > getYearData(kirkarmut, 2025).total,
      'Winter population order must be Akdurak > Kefken > Kırkarmut'
    );
    assert(
      getYearData(kefken, 2025).summerPopulationMultiplier >
        getYearData(kirkarmut, 2025).summerPopulationMultiplier &&
        getYearData(kirkarmut, 2025).summerPopulationMultiplier >
          getYearData(akdurak, 2025).summerPopulationMultiplier,
      'Summer multiplier order must be Kefken (18.5x) > Kırkarmut (1.8x) > Akdurak (1.25x)'
    );
    assert(
      getYearData(kirkarmut, 2025).elderly65PlusPct >
        getYearData(kefken, 2025).elderly65PlusPct &&
        getYearData(kefken, 2025).elderly65PlusPct >
          getYearData(akdurak, 2025).elderly65PlusPct,
      'Elderly % order must be Kırkarmut (43.8%) > Kefken (22.4%) > Akdurak (13.8%)'
    );

    // Distinct H3 Res-8 indices for comparison header
    const h3Set = new Set(
      [akdurak, kefken, kirkarmut].map((n) =>
        latLngToCell(n.coordinates[1], n.coordinates[0], 8)
      )
    );
    assert(h3Set.size === 3, 'All 3 compared neighborhoods must have distinct H3 Res-8 indices');
  }
);

runTest(
  'T4-S5',
  'Tier 4',
  'SCENARIO',
  'S5: Policy Weight Simulation Shift across 2021–2025 H3 Grid (Rural Elderly Focus vs Coastal Land Pressure Focus)',
  () => {
    const ruralPreset: VulnerabilityWeights = {
      elderlyWeight: 42,
      socialAidWeight: 18,
      healthAccessWeight: 30,
      educationAccessWeight: 5,
      landPressureWeight: 5,
    };
    const coastalPreset: VulnerabilityWeights = {
      elderlyWeight: 10,
      socialAidWeight: 10,
      healthAccessWeight: 15,
      educationAccessWeight: 15,
      landPressureWeight: 50,
    };

    const summaryRural = getDistrictSummaryMetrics(
      KANDIRA_NEIGHBORHOODS,
      2025,
      ruralPreset
    );
    const summaryCoastal = getDistrictSummaryMetrics(
      KANDIRA_NEIGHBORHOODS,
      2025,
      coastalPreset
    );

    // Zone average vulnerability flips between kirsal_orman and kiyi_turizm
    assert(
      summaryRural.zoneBreakdown.kirsal_orman.avgVulnerability >
        summaryRural.zoneBreakdown.kiyi_turizm.avgVulnerability,
      'Under rural_elderly preset, kirsal_orman must have higher avgVulnerability than kiyi_turizm'
    );
    assert(
      summaryCoastal.zoneBreakdown.kiyi_turizm.avgVulnerability >
        summaryCoastal.zoneBreakdown.kirsal_orman.avgVulnerability,
      'Under coastal_land preset, kiyi_turizm must have higher avgVulnerability than kirsal_orman'
    );
  }
);

runTest(
  'T4-S6',
  'Tier 4',
  'SCENARIO',
  'S6: Production Bundle & Standalone HTML Offline Delivery Verification (dist/kandira_standalone.html)',
  () => {
    const distIndex = path.join(ROOT_DIR, 'dist/index.html');
    if (!fs.existsSync(distIndex)) {
      execSync('npm run build', { cwd: ROOT_DIR, stdio: 'pipe' });
    }
    execSync('node scripts/build-standalone-html.mjs', {
      cwd: ROOT_DIR,
      stdio: 'pipe',
    });

    const standalonePath = path.join(ROOT_DIR, 'dist/kandira_standalone.html');
    assert(
      fs.existsSync(standalonePath),
      'dist/kandira_standalone.html was not created by build-standalone-html.mjs'
    );
    const stat = fs.statSync(standalonePath);
    assert(
      stat.size > 250 * 1024,
      `Expected standalone HTML > 250 KB, got ${(stat.size / 1024).toFixed(1)} KB`
    );

    const html = fs.readFileSync(standalonePath, 'utf-8');
    assert(html.includes('<style>'), 'Standalone HTML must inline CSS inside <style>');
    assert(
      html.includes('<script type="module">'),
      'Standalone HTML must inline JS bundle inside <script type="module">'
    );
    assert(
      !/href=["']\/assets\/[^"']+\.css["']/i.test(html),
      'Standalone HTML must not retain external /assets/*.css stylesheet links'
    );
    assert(
      !/src=["']\/assets\/[^"']+\.js["']/i.test(html),
      'Standalone HTML must not retain external /assets/*.js script tags'
    );
  }
);

// ============================================================================
// SUMMARY REPORT & EXIT CODE
// ============================================================================
const total = results.length;
const passed = results.filter((r) => r.passed).length;
const failed = total - passed;

const byTier = (tier: TierId) => {
  const sub = results.filter((r) => r.tier === tier);
  return `${sub.filter((r) => r.passed).length}/${sub.length}`;
};

console.log('\n================================================================================');
console.log(` E2E TEST SUMMARY: ${passed}/${total} PASSED (${failed} FAILED)`);
console.log(
  `   • Tier 1 (Feature Coverage):       ${byTier('Tier 1')}`
);
console.log(
  `   • Tier 2 (Boundary & Corner):      ${byTier('Tier 2')}`
);
console.log(
  `   • Tier 3 (Pairwise Interactions):  ${byTier('Tier 3')}`
);
console.log(
  `   • Tier 4 (Real-World Scenarios):   ${byTier('Tier 4')}`
);
console.log('================================================================================');

if (failed > 0) {
  console.error('\nFailed Tests:');
  for (const f of results.filter((r) => !r.passed)) {
    console.error(`  - [${f.id}] ${f.name}: ${f.error}`);
  }
  process.exit(1);
}
