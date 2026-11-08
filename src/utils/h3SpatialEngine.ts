import {
  latLngToCell,
  gridDisk,
  polygonToCells,
  cellToBoundary,
  cellToLatLng,
  cellArea,
  greatCircleDistance,
  isValidCell,
  getResolution,
  cellToParent,
  cellToCenterChild,
  cellsToMultiPolygon,
  UNITS,
} from 'h3-js';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';
import {
  DistrictBoundaryProperties,
  DistrictSummaryMetrics,
  H3CellProperties,
  H3CoverageMode,
  NeighborhoodBoundaryProperties,
  NeighborhoodData,
  NeighborhoodZone,
  SurveyYear,
  VulnerabilityWeights,
  YearlyDemographic,
} from '../types/kandira';
import { DEFAULT_VULNERABILITY_WEIGHTS, ZONE_LABELS } from '../data/kandiraNeighborhoods';

export const KONTUR_DATASET_METADATA = {
  id: 'kontur-population-turkiye',
  title: 'Türkiye: Population Density for 400m H3 Hexagons',
  provider: 'Kontur / Humanitarian Data Exchange (HDX)',
  releaseDate: '2023-11-01',
  license: 'CC BY 4.0',
  hdxUrl: 'https://data.humdata.org/dataset/kontur-population-turkiye',
  resolution: 8,
  sources: 'GHSL R2023A + Meta HRSL + Microsoft Buildings + Copernicus 100m + OpenStreetMap',
} as const;

/**
 * Full Kandıra district land boundary polygon ([lat, lng] pairs for h3-js polygonToCells).
 * Covers Kandıra's coastal strip along the Black Sea and southern/eastern/western administrative borders.
 */
export const KANDIRA_DISTRICT_POLYGON: Array<[number, number]> = [
  [41.132, 30.01],
  [41.160, 30.062],
  [41.163, 30.0882],
  [41.157, 30.1415],
  [41.160, 30.1695],
  [41.160, 30.2054],
  [41.164, 30.2285],
  [41.174, 30.2612],
  [41.186, 30.2895],
  [41.188, 30.3365],
  [41.190, 30.365],
  [41.192, 30.40],
  [40.960, 30.39],
  [40.945, 30.28],
  [40.945, 30.15],
  [40.965, 30.02],
];

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
 * Piecewise-linear Karadeniz coastline profile across Kandıra's longitude span (30.01°E – 30.40°E).
 * Used to clip non-core H3 ring hexagons whose centroids fall north of the shoreline into open sea.
 */
const KANDIRA_COASTLINE_PROFILE: Array<[number, number]> = [
  [30.01, 41.152],
  [30.062, 41.160],
  [30.0882, 41.163], // Bağırganlı Burnu
  [30.1415, 41.157], // Seyrek
  [30.1695, 41.160], // Sarısu
  [30.2054, 41.160], // Kerpe Burnu
  [30.2285, 41.164], // Kumcağız
  [30.2612, 41.174], // Kefken
  [30.2895, 41.186], // Cebeci
  [30.3365, 41.188], // Babalı
  [30.365, 41.190],
  [30.40, 41.192],
];

export function isInBlackSea(lat: number, lng: number): boolean {
  if (lng <= KANDIRA_COASTLINE_PROFILE[0][0]) {
    return lat > KANDIRA_COASTLINE_PROFILE[0][1];
  }
  const last = KANDIRA_COASTLINE_PROFILE[KANDIRA_COASTLINE_PROFILE.length - 1];
  if (lng >= last[0]) {
    return lat > last[1];
  }

  for (let i = 0; i < KANDIRA_COASTLINE_PROFILE.length - 1; i++) {
    const [lng1, lat1] = KANDIRA_COASTLINE_PROFILE[i];
    const [lng2, lat2] = KANDIRA_COASTLINE_PROFILE[i + 1];
    if (lng >= lng1 && lng <= lng2) {
      const t = (lng - lng1) / Math.max(0.00001, lng2 - lng1);
      const coastLat = lat1 + t * (lat2 - lat1);
      return lat > coastLat;
    }
  }
  return false;
}

/**
 * Generates a standard GeoJSON FeatureCollection of H3 hexagons covering Kandıra
 * at resolution 7 (macro catchment) or resolution 8 (micro 400m Kontur hexagon),
 * supporting both neighborhood catchment rings ('mahalle_catchment') and
 * full-district Kontur Population Türkiye polygon coverage ('kontur_full').
 */
export function generateKandiraH3GeoJSON(
  neighborhoods: NeighborhoodData[],
  year: SurveyYear = 2025,
  resolution: 7 | 8 = 8,
  weights: VulnerabilityWeights = DEFAULT_VULNERABILITY_WEIGHTS,
  coverageMode: H3CoverageMode = 'kontur_full',
  customKonturMap?: ReadonlyMap<string, number>
): FeatureCollection<Polygon, H3CellProperties> {
  if (neighborhoods.length === 0) {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }

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
    const rawCoreH3 = latLngToCell(lat, lng, resolution);

    // Prevent core cell collision for dense central neighborhoods (e.g. Akdurak/Aydınlık/Çarşı)
    let coreH3 = rawCoreH3;
    if (cellMap.get(rawCoreH3)?.isCoreCell) {
      const candidates = gridDisk(rawCoreH3, 1)
        .filter((c) => !cellMap.get(c)?.isCoreCell && !isInBlackSea(...cellToLatLng(c)))
        .sort((a, b) => {
          const distA = greatCircleDistance([lat, lng], cellToLatLng(a), UNITS.km);
          const distB = greatCircleDistance([lat, lng], cellToLatLng(b), UNITS.km);
          return distA - distB;
        });
      if (candidates.length > 0) {
        coreH3 = candidates[0];
      } else {
        const ring2Candidates = gridDisk(rawCoreH3, 2)
          .filter((c) => !cellMap.get(c)?.isCoreCell && !isInBlackSea(...cellToLatLng(c)))
          .sort((a, b) => {
            const distA = greatCircleDistance([lat, lng], cellToLatLng(a), UNITS.km);
            const distB = greatCircleDistance([lat, lng], cellToLatLng(b), UNITS.km);
            return distA - distB;
          });
        if (ring2Candidates.length > 0) {
          coreH3 = ring2Candidates[0];
        }
      }
    }

    // Ring radius depends on resolution and neighborhood area
    const kRing = resolution === 7 ? 1 : n.areaKm2 > 13 ? 2 : 1;
    const diskCells = gridDisk(coreH3, kRing);

    for (const h3Index of diskCells) {
      const isCore = h3Index === coreH3;
      const [cellLat, cellLng] = cellToLatLng(h3Index);

      // Clip non-core ring cells that spill north into the Black Sea
      if (!isCore && isInBlackSea(cellLat, cellLng)) {
        continue;
      }

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

  // If coverageMode === 'kontur_full', populate full Kandıra district polygon cells via polygonToCells
  if (coverageMode === 'kontur_full') {
    const fullDistrictCells = polygonToCells(KANDIRA_DISTRICT_POLYGON, resolution);
    const extraCells = new Set<string>(fullDistrictCells);

    if (customKonturMap) {
      for (const customH3 of customKonturMap.keys()) {
        if (isValidCell(customH3) && getResolution(customH3) === resolution) {
          extraCells.add(customH3);
        }
      }
    }

    for (const h3Index of extraCells) {
      if (cellMap.has(h3Index)) continue;

      const [cellLat, cellLng] = cellToLatLng(h3Index);
      if (isInBlackSea(cellLat, cellLng)) continue;
      if (cellLng < 30.0 || cellLng > 30.42 || cellLat < 40.93 || cellLat > 41.2) continue;

      let closestNeighborhood = neighborhoods[0];
      let minDistanceKm = Infinity;

      for (const n of neighborhoods) {
        const [nLng, nLat] = n.coordinates;
        const dKm = greatCircleDistance([nLat, nLng], [cellLat, cellLng], UNITS.km);
        if (dKm < minDistanceKm) {
          minDistanceKm = dKm;
          closestNeighborhood = n;
        }
      }

      const decay = Math.max(
        0.06,
        Math.exp(-minDistanceKm / (resolution === 7 ? 2.1 : 1.15))
      );

      cellMap.set(h3Index, {
        neighborhood: closestNeighborhood,
        distanceKm: minDistanceKm,
        isCoreCell: false,
        ringFactor: decay,
      });
    }
  }

  // Count how many cells belong to each neighborhood to distribute population realistically
  const neighborhoodWeightSums = new Map<string, number>();
  for (const entry of cellMap.values()) {
    const prev = neighborhoodWeightSums.get(entry.neighborhood.id) || 0;
    neighborhoodWeightSums.set(entry.neighborhood.id, prev + entry.ringFactor);
  }

  const features: Feature<Polygon, H3CellProperties>[] = [];
  let fidCounter = 1;

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

    // Kontur Population Türkiye (HDX 400m H3) calculation:
    // Uses custom uploaded Kontur value if present, otherwise calibrates via GHSL/HRSL/Microsoft Building footprint density
    const hasCustomKontur = Boolean(customKonturMap && customKonturMap.has(h3Index));
    const settlementFactor = isCoreCell
      ? 1.16
      : Math.max(0.45, Math.min(1.08, 0.58 + ringFactor * 0.42 + (yearData.builtUpPct / 100) * 0.25));
    const konturPopulation = hasCustomKontur
      ? Math.max(1, Math.round(customKonturMap!.get(h3Index)!))
      : Math.max(4, Math.round(yearData.total * cellShare * settlementFactor));

    const hexAreaKm2 = Math.max(0.05, cellArea(h3Index, UNITS.km2));
    const konturDensityPerKm2 = Math.max(1, Math.round(konturPopulation / hexAreaKm2));
    const dataSource: H3CellProperties['dataSource'] = hasCustomKontur
      ? 'kontur_custom_upload'
      : coverageMode === 'kontur_full'
      ? 'kontur_hdx_2023'
      : 'kandira_adnks_cbs';

    // Calculate distance to all neighborhoods to detect overlapping/border neighborhoods
    const [cellLat, cellLng] = cellToLatLng(h3Index);
    const distances = neighborhoods.map((n) => {
      const [nLng, nLat] = n.coordinates;
      const dKm = greatCircleDistance([nLat, nLng], [cellLat, cellLng], UNITS.km);
      return { n, dKm };
    });
    distances.sort((a, b) => a.dKm - b.dKm);

    const closestDist = distances[0].dKm;
    const overlapping = distances.filter((item, idx) => {
      if (idx === 0) return true;
      if (item.n.id === neighborhood.id) return true;
      const diffKm = item.dKm - closestDist;
      return (diffKm <= 1.8 && item.dKm <= 4.8) || (item.dKm <= closestDist * 1.5 && item.dKm <= 3.8);
    });

    const neighborhoodNames = Array.from(
      new Set([neighborhood.name, ...overlapping.map((o) => o.n.name)])
    );
    const zones = Array.from(
      new Set([neighborhood.zone, ...overlapping.map((o) => o.n.zone)])
    );

    const seasonalWorkersEst = Math.max(
      0,
      Math.round(neighborhood.vulnerableGroups.seasonalAgriculturalWorkers * cellShare)
    );
    const socialAidHouseholdsEst = Math.max(
      0,
      Math.round(neighborhood.vulnerableGroups.socialAssistanceHouseholds * cellShare)
    );

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
        fid: fidCounter++,
        h3: h3Index,
        h3Index,
        neighborhoodId: neighborhood.id,
        neighborhoodName: neighborhood.name,
        primaryNeighborhood: neighborhood.name,
        neighborhoodNames,
        zone: neighborhood.zone,
        zoneLabel: neighborhood.zoneLabel,
        zones,
        year,
        population: cellPopulation,
        totalPopulation: cellPopulation,
        konturPopulation,
        konturDensityPerKm2,
        konturPopulationDensity: konturDensityPerKm2,
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
        seasonalWorkersEst,
        socialAidHouseholdsEst,
        isCoreCell,
        dataSource,
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

export interface ParsedKonturDataset {
  map: Map<string, number>;
  cellCount: number;
  totalPopulation: number;
}

/**
 * Parses a Kontur Population GeoJSON FeatureCollection or JSON array containing
 * `{ h3, population }` (or `{ h3Index, konturPopulation }`) records and normalizes
 * valid H3 indices to `targetResolution` (default Resolution 8).
 */
export function parseKonturH3GeoJSON(
  jsonText: string,
  targetResolution: 7 | 8 = 8
): ParsedKonturDataset {
  const map = new Map<string, number>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { map, cellCount: 0, totalPopulation: 0 };
  }

  const rawItems: Array<Record<string, unknown>> = [];
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        rawItems.push(item as Record<string, unknown>);
      }
    }
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.features)) {
      for (const feat of obj.features) {
        if (feat && typeof feat === 'object') {
          const fObj = feat as Record<string, unknown>;
          const props =
            fObj.properties && typeof fObj.properties === 'object'
              ? (fObj.properties as Record<string, unknown>)
              : {};
          rawItems.push({
            ...props,
            _featureId: fObj.id,
          });
        }
      }
    }
  }

  for (const item of rawItems) {
    const rawH3 = String(
      item.h3 ?? item.h3Index ?? item.h3_index ?? item._featureId ?? ''
    ).trim();
    if (!rawH3 || !isValidCell(rawH3)) continue;

    let normalizedH3 = rawH3;
    const res = getResolution(rawH3);
    if (res > targetResolution) {
      normalizedH3 = cellToParent(rawH3, targetResolution);
    } else if (res < targetResolution) {
      normalizedH3 = cellToCenterChild(rawH3, targetResolution);
    }

    const rawPop = Number(
      item.konturPopulation ?? item.population ?? item.pop ?? 0
    );
    if (!Number.isFinite(rawPop) || rawPop <= 0) continue;

    const prev = map.get(normalizedH3) || 0;
    map.set(normalizedH3, Math.round(prev + rawPop));
  }

  let totalPopulation = 0;
  for (const val of map.values()) {
    totalPopulation += val;
  }

  return {
    map,
    cellCount: map.size,
    totalPopulation,
  };
}

/**
 * Exports a Kandıra H3 FeatureCollection in the official Kontur Population
 * GeoJSON schema (`{ fid, h3, population, konturDensityPerKm2, ... }`).
 */
export function createKonturExportGeoJSON(
  fc: FeatureCollection<Polygon, H3CellProperties>
) {
  return {
    type: 'FeatureCollection' as const,
    metadata: {
      ...KONTUR_DATASET_METADATA,
      district: 'Kocaeli / Kandıra',
      exportedAt: new Date().toISOString(),
      featureCount: fc.features.length,
    },
    features: fc.features.map((f, idx) => ({
      type: 'Feature' as const,
      id: f.properties.h3 || f.properties.h3Index,
      properties: {
        fid: f.properties.fid ?? idx + 1,
        h3: f.properties.h3 || f.properties.h3Index,
        population: f.properties.konturPopulation,
        konturPopulation: f.properties.konturPopulation,
        konturDensityPerKm2: f.properties.konturDensityPerKm2,
        adnksWinterPopulation: f.properties.population,
        summerPopEstimate: f.properties.summerPopEstimate,
        neighborhoodId: f.properties.neighborhoodId,
        neighborhoodName: f.properties.neighborhoodName,
        zone: f.properties.zone,
        year: f.properties.year,
        isCoreCell: f.properties.isCoreCell,
        dataSource: f.properties.dataSource ?? 'kontur_hdx_2023',
      },
      geometry: f.geometry,
    })),
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

/**
 * Generates GeoJSON MultiPolygon boundary features for all Kandıra neighborhoods
 * by dissolving the constituent H3 cells assigned to each neighborhood.
 */
export function generateKandiraNeighborhoodBoundariesGeoJSON(
  neighborhoods: NeighborhoodData[],
  h3Features?: Feature<Polygon, H3CellProperties>[]
): FeatureCollection<MultiPolygon, NeighborhoodBoundaryProperties> {
  const features = h3Features ?? generateKandiraH3GeoJSON(neighborhoods, 2025, 8).features;

  const cellsByNeighborhood = new Map<string, string[]>();
  for (const f of features) {
    const nId = f.properties.neighborhoodId;
    if (!cellsByNeighborhood.has(nId)) {
      cellsByNeighborhood.set(nId, []);
    }
    cellsByNeighborhood.get(nId)!.push(f.properties.h3Index);
  }

  const boundaryFeatures: Feature<MultiPolygon, NeighborhoodBoundaryProperties>[] = [];

  for (const n of neighborhoods) {
    const cells = cellsByNeighborhood.get(n.id) || [];
    let coords: number[][][][] = [];
    if (cells.length > 0) {
      coords = cellsToMultiPolygon(cells, true);
    }

    if (!coords || coords.length === 0) {
      const fallbackCell = latLngToCell(n.coordinates[1], n.coordinates[0], 8);
      coords = cellsToMultiPolygon([fallbackCell], true);
    }

    boundaryFeatures.push({
      type: 'Feature',
      id: `boundary-${n.id}`,
      properties: {
        id: n.id,
        code: n.code,
        name: n.name,
        zone: n.zone,
        zoneLabel: n.zoneLabel,
        areaKm2: n.areaKm2,
        centerCoordinates: n.coordinates,
        cellCount: cells.length,
      },
      geometry: {
        type: 'MultiPolygon',
        coordinates: coords,
      },
    });
  }

  return {
    type: 'FeatureCollection',
    features: boundaryFeatures,
  };
}

/**
 * Generates the outer administrative boundary of Kandıra district
 * by merging all constituent H3 cells into a unified perimeter MultiPolygon.
 */
export function generateKandiraDistrictBoundaryGeoJSON(
  neighborhoods: NeighborhoodData[],
  h3Features?: Feature<Polygon, H3CellProperties>[]
): FeatureCollection<MultiPolygon, DistrictBoundaryProperties> {
  const features = h3Features ?? generateKandiraH3GeoJSON(neighborhoods, 2025, 8).features;
  const allCells = features.map((f) => f.properties.h3Index);
  const districtCoords = cellsToMultiPolygon(allCells, true);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 'kandira-district-outline',
        properties: {
          id: 'kandira',
          name: 'Kandıra',
          province: 'Kocaeli',
          country: 'Türkiye',
          totalAreaKm2: neighborhoods.reduce((sum, n) => sum + n.areaKm2, 0),
          totalNeighborhoods: neighborhoods.length,
        },
        geometry: {
          type: 'MultiPolygon',
          coordinates: districtCoords,
        },
      },
    ],
  };
}
