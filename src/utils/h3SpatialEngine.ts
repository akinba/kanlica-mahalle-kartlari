import {
  latLngToCell,
  gridDisk,
  cellToBoundary,
  cellToLatLng,
  greatCircleDistance,
  UNITS,
} from 'h3-js';
import type { Feature, FeatureCollection, Polygon } from 'geojson';
import {
  DistrictSummaryMetrics,
  H3CellProperties,
  NeighborhoodData,
  NeighborhoodZone,
  SurveyYear,
  VulnerabilityWeights,
  YearlyDemographic,
} from '../types/kandira';
import { DEFAULT_VULNERABILITY_WEIGHTS, ZONE_LABELS } from '../data/kandiraNeighborhoods';

export function getYearData(
  neighborhood: NeighborhoodData,
  year: number = 2025
): YearlyDemographic {
  return (
    neighborhood.yearlyData.find((d) => d.year === year) ||
    neighborhood.yearlyData[neighborhood.yearlyData.length - 1]
  );
}

/**
 * Calculates a dynamic 0-100 composite vulnerability score for a neighborhood
 * based on user-customizable policy weights (elderly, social aid, health access,
 * education access, and coastal/urban land pressure).
 */
export function calculateDynamicVulnerabilityScore(
  neighborhood: NeighborhoodData,
  weights: VulnerabilityWeights = DEFAULT_VULNERABILITY_WEIGHTS,
  year: number = 2025
): number {
  const yearEntry = getYearData(neighborhood, year);
  const firstEntry = neighborhood.yearlyData[0];

  const totalWeight =
    weights.elderlyWeight +
    weights.socialAidWeight +
    weights.healthAccessWeight +
    weights.educationAccessWeight +
    weights.landPressureWeight;

  const safeDivisor = totalWeight > 0 ? totalWeight : 100;

  // Normalized 0-100 sub-indices across Kandıra's empirical bounds
  const elderlySub = Math.min(100, Math.max(0, ((yearEntry.elderly65PlusPct - 10) / 34) * 100));

  const estHouseholds = Math.max(30, yearEntry.total / 3.1);
  const socialAidPct = (neighborhood.vulnerableGroups.socialAssistanceHouseholds / estHouseholds) * 100;
  const socialAidSub = Math.min(100, Math.max(0, (socialAidPct / 11) * 100));

  const healthSub = Math.min(100, Math.max(0, ((yearEntry.healthAccessMin - 3) / 21) * 100));
  const eduSub = Math.min(100, Math.max(0, ((yearEntry.educationAccessMin - 3) / 16) * 100));

  const builtGrowth = Math.max(0, yearEntry.builtUpPct - firstEntry.builtUpPct);
  const summerPressure = Math.min(45, (yearEntry.summerPopulationMultiplier - 1) * 2.4);
  const landPressureSub = Math.min(100, builtGrowth * 5.2 + summerPressure);

  const weighted =
    (elderlySub * weights.elderlyWeight +
      socialAidSub * weights.socialAidWeight +
      healthSub * weights.healthAccessWeight +
      eduSub * weights.educationAccessWeight +
      landPressureSub * weights.landPressureWeight) /
    safeDivisor;

  return Number(Math.min(100, Math.max(0, weighted)).toFixed(1));
}

/**
 * Generates a standard GeoJSON FeatureCollection of H3 hexagons covering Kandıra
 * at resolution 7 (macro catchment) or resolution 8 (micro neighborhood ring),
 * with distance-decayed spatial interpolation where hexagons overlap.
 */
export function generateKandiraH3GeoJSON(
  neighborhoods: NeighborhoodData[],
  year: SurveyYear = 2025,
  resolution: 7 | 8 = 8,
  weights: VulnerabilityWeights = DEFAULT_VULNERABILITY_WEIGHTS
): FeatureCollection<Polygon, H3CellProperties> {
  // Map of h3Index -> candidate assignments to resolve overlaps by closest neighborhood center
  const cellMap = new Map<
    string,
    {
      neighborhood: NeighborhoodData;
      distanceKm: number;
      isCoreCell: boolean;
      ringFactor: number;
    }
  >();

  for (const n of neighborhoods) {
    const [lng, lat] = n.coordinates;
    const coreH3 = latLngToCell(lat, lng, resolution);

    // Ring radius depends on resolution and neighborhood area
    const kRing = resolution === 7 ? 1 : n.areaKm2 > 13 ? 2 : 1;
    const diskCells = gridDisk(coreH3, kRing);

    for (const h3Index of diskCells) {
      const isCore = h3Index === coreH3;
      const [cellLat, cellLng] = cellToLatLng(h3Index);
      const distKm = greatCircleDistance([lat, lng], [cellLat, cellLng], UNITS.km);
      const decay = isCore ? 1.0 : Math.max(0.22, Math.exp(-distKm / (resolution === 7 ? 2.4 : 1.35)));

      const existing = cellMap.get(h3Index);
      if (!existing || isCore || (!existing.isCoreCell && distKm < existing.distanceKm)) {
        cellMap.set(h3Index, {
          neighborhood: n,
          distanceKm: distKm,
          isCoreCell: isCore,
          ringFactor: decay,
        });
      }
    }
  }

  // Count how many cells belong to each neighborhood to distribute population realistically
  const neighborhoodWeightSums = new Map<string, number>();
  for (const entry of cellMap.values()) {
    const prev = neighborhoodWeightSums.get(entry.neighborhood.id) || 0;
    neighborhoodWeightSums.set(entry.neighborhood.id, prev + entry.ringFactor);
  }

  const features: Feature<Polygon, H3CellProperties>[] = [];

  for (const [h3Index, entry] of cellMap.entries()) {
    const { neighborhood, isCoreCell, ringFactor } = entry;
    const yearData = getYearData(neighborhood, year);
    const data2021 = getYearData(neighborhood, 2021);
    const data2025 = getYearData(neighborhood, 2025);

    const weightSum = neighborhoodWeightSums.get(neighborhood.id) || 1;
    const cellShare = ringFactor / weightSum;

    const cellPopulation = Math.max(8, Math.round(yearData.total * cellShare));
    const popChange5YrPct = Number(
      (((data2025.total - data2021.total) / data2021.total) * 100).toFixed(1)
    );
    const builtUpChange5YrPct = Number(
      (((data2025.builtUpPct - data2021.builtUpPct) / data2021.builtUpPct) * 100).toFixed(1)
    );

    const baseVuln = calculateDynamicVulnerabilityScore(neighborhood, weights, year);
    // Outer ring cells in rural/forest zones have slightly higher access friction
    const cellVuln = Number(
      Math.min(100, Math.max(5, baseVuln * (isCoreCell ? 1.0 : 0.94 + (1 - ringFactor) * 0.1))).toFixed(
        1
      )
    );

    const cellBuiltUp = Number((yearData.builtUpPct * (isCoreCell ? 1.12 : 0.78)).toFixed(1));
    const cellSummerPop = Math.round(cellPopulation * yearData.summerPopulationMultiplier);

    // cellToBoundary(h3Index, true) returns [lng, lat][] vertices for GeoJSON
    const rawCoords = cellToBoundary(h3Index, true);
    const boundaryCoords =
      rawCoords.length > 0 &&
      (rawCoords[0][0] !== rawCoords[rawCoords.length - 1][0] ||
        rawCoords[0][1] !== rawCoords[rawCoords.length - 1][1])
        ? [...rawCoords, rawCoords[0]]
        : rawCoords;

    features.push({
      type: 'Feature',
      id: h3Index,
      properties: {
        h3Index,
        neighborhoodId: neighborhood.id,
        neighborhoodName: neighborhood.name,
        zone: neighborhood.zone,
        zoneLabel: neighborhood.zoneLabel,
        year,
        population: cellPopulation,
        popChange5YrPct,
        elderlyPct: yearData.elderly65PlusPct,
        youthPct: yearData.youth0To14Pct,
        vulnerabilityScore: cellVuln,
        builtUpPct: Math.min(95, cellBuiltUp),
        builtUpChange5YrPct,
        forestPct: yearData.forestPct,
        agriculturePct: yearData.agriculturePct,
        healthAccessMin: isCoreCell ? yearData.healthAccessMin : yearData.healthAccessMin + 2,
        educationAccessMin: isCoreCell
          ? yearData.educationAccessMin
          : yearData.educationAccessMin + 2,
        summerPopEstimate: cellSummerPop,
        isCoreCell,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [boundaryCoords],
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Computes district-wide aggregated KPIs and zone breakdowns for a given year.
 */
export function getDistrictSummaryMetrics(
  neighborhoods: NeighborhoodData[],
  year: SurveyYear = 2025,
  weights: VulnerabilityWeights = DEFAULT_VULNERABILITY_WEIGHTS
): DistrictSummaryMetrics {
  let totalPopulation = 0;
  let totalPop2021 = 0;
  let estimatedSummerPeakPopulation = 0;
  let weightedElderlySum = 0;
  let totalElderly65Plus = 0;
  let totalChildren0To14 = 0;
  let totalSocialAssistanceHouseholds = 0;
  let totalSeasonalWorkers = 0;
  let areaSum = 0;
  let weightedBuiltUpSum = 0;
  let weightedForestSum = 0;
  let weightedAgriSum = 0;
  let healthMinSum = 0;
  let eduMinSum = 0;
  let highRiskNeighborhoodCount = 0;

  const zoneAccumulator: Record<
    NeighborhoodZone,
    {
      label: string;
      count: number;
      population: number;
      elderlyWeighted: number;
      vulnSum: number;
    }
  > = {
    merkez: {
      label: ZONE_LABELS.merkez,
      count: 0,
      population: 0,
      elderlyWeighted: 0,
      vulnSum: 0,
    },
    kiyi_turizm: {
      label: ZONE_LABELS.kiyi_turizm,
      count: 0,
      population: 0,
      elderlyWeighted: 0,
      vulnSum: 0,
    },
    kirsal_tarim: {
      label: ZONE_LABELS.kirsal_tarim,
      count: 0,
      population: 0,
      elderlyWeighted: 0,
      vulnSum: 0,
    },
    kirsal_orman: {
      label: ZONE_LABELS.kirsal_orman,
      count: 0,
      population: 0,
      elderlyWeighted: 0,
      vulnSum: 0,
    },
  };

  for (const n of neighborhoods) {
    const yd = getYearData(n, year);
    const yd2021 = getYearData(n, 2021);
    const vuln = calculateDynamicVulnerabilityScore(n, weights, year);

    totalPopulation += yd.total;
    totalPop2021 += yd2021.total;
    estimatedSummerPeakPopulation += Math.round(yd.total * yd.summerPopulationMultiplier);
    weightedElderlySum += yd.total * yd.elderly65PlusPct;
    totalElderly65Plus += Math.round((yd.total * yd.elderly65PlusPct) / 100);
    totalChildren0To14 += Math.round((yd.total * yd.youth0To14Pct) / 100);
    totalSocialAssistanceHouseholds += n.vulnerableGroups.socialAssistanceHouseholds;
    totalSeasonalWorkers += n.vulnerableGroups.seasonalAgriculturalWorkers;

    areaSum += n.areaKm2;
    weightedBuiltUpSum += n.areaKm2 * yd.builtUpPct;
    weightedForestSum += n.areaKm2 * yd.forestPct;
    weightedAgriSum += n.areaKm2 * yd.agriculturePct;

    healthMinSum += yd.healthAccessMin;
    eduMinSum += yd.educationAccessMin;

    if (vuln >= 60) {
      highRiskNeighborhoodCount += 1;
    }

    const zb = zoneAccumulator[n.zone];
    zb.count += 1;
    zb.population += yd.total;
    zb.elderlyWeighted += yd.total * yd.elderly65PlusPct;
    zb.vulnSum += vuln;
  }

  const count = Math.max(1, neighborhoods.length);
  const popChangeSince2021Pct = Number(
    (((totalPopulation - totalPop2021) / Math.max(1, totalPop2021)) * 100).toFixed(1)
  );

  return {
    year,
    totalPopulation,
    popChangeSince2021Pct,
    estimatedSummerPeakPopulation,
    avgElderlyPct: Number((weightedElderlySum / Math.max(1, totalPopulation)).toFixed(1)),
    totalElderly65Plus,
    totalChildren0To14,
    totalSocialAssistanceHouseholds,
    totalSeasonalWorkers,
    avgBuiltUpPct: Number((weightedBuiltUpSum / Math.max(1, areaSum)).toFixed(1)),
    avgForestPct: Number((weightedForestSum / Math.max(1, areaSum)).toFixed(1)),
    avgAgriculturePct: Number((weightedAgriSum / Math.max(1, areaSum)).toFixed(1)),
    avgHealthAccessMin: Number((healthMinSum / count).toFixed(1)),
    avgEducationAccessMin: Number((eduMinSum / count).toFixed(1)),
    highRiskNeighborhoodCount,
    zoneBreakdown: {
      merkez: {
        label: zoneAccumulator.merkez.label,
        count: zoneAccumulator.merkez.count,
        population: zoneAccumulator.merkez.population,
        avgElderlyPct: Number(
          (
            zoneAccumulator.merkez.elderlyWeighted /
            Math.max(1, zoneAccumulator.merkez.population)
          ).toFixed(1)
        ),
        avgVulnerability: Number(
          (zoneAccumulator.merkez.vulnSum / Math.max(1, zoneAccumulator.merkez.count)).toFixed(1)
        ),
      },
      kiyi_turizm: {
        label: zoneAccumulator.kiyi_turizm.label,
        count: zoneAccumulator.kiyi_turizm.count,
        population: zoneAccumulator.kiyi_turizm.population,
        avgElderlyPct: Number(
          (
            zoneAccumulator.kiyi_turizm.elderlyWeighted /
            Math.max(1, zoneAccumulator.kiyi_turizm.population)
          ).toFixed(1)
        ),
        avgVulnerability: Number(
          (
            zoneAccumulator.kiyi_turizm.vulnSum / Math.max(1, zoneAccumulator.kiyi_turizm.count)
          ).toFixed(1)
        ),
      },
      kirsal_tarim: {
        label: zoneAccumulator.kirsal_tarim.label,
        count: zoneAccumulator.kirsal_tarim.count,
        population: zoneAccumulator.kirsal_tarim.population,
        avgElderlyPct: Number(
          (
            zoneAccumulator.kirsal_tarim.elderlyWeighted /
            Math.max(1, zoneAccumulator.kirsal_tarim.population)
          ).toFixed(1)
        ),
        avgVulnerability: Number(
          (
            zoneAccumulator.kirsal_tarim.vulnSum / Math.max(1, zoneAccumulator.kirsal_tarim.count)
          ).toFixed(1)
        ),
      },
      kirsal_orman: {
        label: zoneAccumulator.kirsal_orman.label,
        count: zoneAccumulator.kirsal_orman.count,
        population: zoneAccumulator.kirsal_orman.population,
        avgElderlyPct: Number(
          (
            zoneAccumulator.kirsal_orman.elderlyWeighted /
            Math.max(1, zoneAccumulator.kirsal_orman.population)
          ).toFixed(1)
        ),
        avgVulnerability: Number(
          (
            zoneAccumulator.kirsal_orman.vulnSum / Math.max(1, zoneAccumulator.kirsal_orman.count)
          ).toFixed(1)
        ),
      },
    },
  };
}
