export type NeighborhoodZone = 'merkez' | 'kiyi_turizm' | 'kirsal_tarim' | 'kirsal_orman';

export type SurveyYear = 2021 | 2022 | 2023 | 2024 | 2025;

export interface YearlyDemographic {
  year: SurveyYear;
  total: number;
  male: number;
  female: number;
  elderly65PlusPct: number;
  youth0To14Pct: number;
  netMigrationPermille: number;
  summerPopulationMultiplier: number;
  builtUpPct: number;
  forestPct: number;
  agriculturePct: number;
  vulnerabilityRawScore: number;
  healthAccessMin: number;
  educationAccessMin: number;
}

export interface VulnerableGroupMetrics {
  elderly65PlusCount: number;
  elderly65PlusPct: number;
  elderlyLivingAloneEst: number;
  children0To14Count: number;
  children0To14Pct: number;
  disabilitySupportHouseholds: number;
  socialAssistanceHouseholds: number;
  seasonalAgriculturalWorkers: number;
  chronicIllnessFollowupEst: number;
  riskFactors: string[];
}

export type LandUseChangeCategory =
  | 'Yuksek Kiyi Yapilasma Baskisi'
  | 'Kentsel Yayilma'
  | 'Tarim-Findik Koruma Alani'
  | 'Orman-Ekoturizm Dengeli'
  | 'Kirsal Nufus Kaybi - Atil Arazi';

export interface LandUseChangeMetrics {
  forestPct2021: number;
  forestPct2025: number;
  agricultureHazelnutPct2021: number;
  agricultureHazelnutPct2025: number;
  builtUpPct2021: number;
  builtUpPct2025: number;
  newBuildingPermits5Yr: number;
  imperviousSurfaceChangePct: number;
  dominantLandCover: string;
  changeCategory: LandUseChangeCategory;
  observations: string[];
}

export interface ServiceDevelopmentMetrics {
  health: {
    asmCount: number;
    familyPhysicians: number;
    pharmacyCount: number;
    nearestHospitalKm: number;
    ambulanceEtaMin: number;
    mobileHealthVisitPerMonth: number;
    trend5Yr: 'gelisti' | 'sabit' | 'kritik';
    recentInvestments: string[];
  };
  education: {
    kindergartenCount: number;
    primaryMiddleCount: number;
    highSchoolCount: number;
    bussedStudentsCount: number;
    studentPerTeacher: number;
    internetLabAvailable: boolean;
    trend5Yr: 'gelisti' | 'sabit' | 'kritik';
    recentInvestments: string[];
  };
  infrastructure: {
    fiberBroadbandPct: number;
    drinkingWaterStatus: 'iyilestirildi' | 'yeterli' | 'yaz_basinc_sorunu';
    publicTransportDailyTrips: number;
    disasterAssemblyAreas: number;
  };
}

export interface NeighborhoodData {
  id: string;
  code: string;
  name: string;
  zone: NeighborhoodZone;
  zoneLabel: string;
  coordinates: [number, number]; // [lng, lat]
  areaKm2: number;
  elevationM: number;
  distanceToCenterKm: number;
  summary: string;
  yearlyData: YearlyDemographic[];
  vulnerableGroups: VulnerableGroupMetrics;
  landUse: LandUseChangeMetrics;
  services: ServiceDevelopmentMetrics;
  priorityRecommendations: string[];
}

export interface VulnerabilityWeights {
  elderlyWeight: number;
  socialAidWeight: number;
  healthAccessWeight: number;
  educationAccessWeight: number;
  landPressureWeight: number;
}

export type H3CoverageMode = 'kontur_full' | 'mahalle_catchment';

export interface H3CellProperties {
  fid?: number;
  h3: string; // Kontur codebook standard H3 attribute
  h3Index: string;
  neighborhoodId: string;
  neighborhoodName: string;
  primaryNeighborhood: string;
  neighborhoodNames: string[]; // array of neighborhood names overlapping/covering this border/core cell
  zone: NeighborhoodZone;
  zoneLabel: string;
  zones: string[]; // zones of covering neighborhoods
  year: SurveyYear;
  population: number; // legacy cell population
  totalPopulation: number;
  konturPopulation: number; // Kontur HDX 400m H3 population count
  konturDensityPerKm2: number; // Population per km² within the H3 cell
  konturPopulationDensity?: number; // Kontur population density per km² (alias for map layers)
  popChange5YrPct: number;
  elderlyPct: number;
  youthPct: number;
  vulnerabilityScore: number;
  builtUpPct: number;
  builtUpChange5YrPct: number;
  forestPct: number;
  agriculturePct: number;
  healthAccessMin: number;
  educationAccessMin: number;
  summerPopEstimate: number;
  seasonalWorkersEst: number;
  socialAidHouseholdsEst: number;
  isCoreCell: boolean;
  dataSource?: 'kontur_hdx_2023' | 'kandira_adnks_cbs' | 'kontur_custom_upload';
}

export interface DistrictSummaryMetrics {
  year: SurveyYear;
  totalPopulation: number;
  popChangeSince2021Pct: number;
  estimatedSummerPeakPopulation: number;
  avgElderlyPct: number;
  totalElderly65Plus: number;
  totalChildren0To14: number;
  totalSocialAssistanceHouseholds: number;
  totalSeasonalWorkers: number;
  avgBuiltUpPct: number;
  avgForestPct: number;
  avgAgriculturePct: number;
  avgHealthAccessMin: number;
  avgEducationAccessMin: number;
  highRiskNeighborhoodCount: number;
  zoneBreakdown: Record<
    NeighborhoodZone,
    {
      label: string;
      count: number;
      population: number;
      avgElderlyPct: number;
      avgVulnerability: number;
    }
  >;
}
