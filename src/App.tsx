import React, { useMemo, useState } from 'react';
import {
  Hexagon,
  LayoutGrid,
  Map as MapIcon,
  Scale,
  BarChart3,
  Sliders,
  Search,
  Users,
  Sun,
  AlertTriangle,
  Trees,
  HeartPulse,
  GraduationCap,
  Filter,
  ArrowUpDown,
  FileText,
  Sparkles,
  RotateCcw,
  Building2,
  Compass,
} from 'lucide-react';
import {
  KANDIRA_NEIGHBORHOODS,
  DEFAULT_VULNERABILITY_WEIGHTS,
  ZONE_LABELS,
} from './data/kandiraNeighborhoods';
import {
  NeighborhoodData,
  NeighborhoodZone,
  SurveyYear,
  VulnerabilityWeights,
} from './types/kandira';
import {
  calculateDynamicVulnerabilityScore,
  getDistrictSummaryMetrics,
  getYearData,
} from './utils/h3SpatialEngine';
import { NeighborhoodCard } from './components/NeighborhoodCard';
import { NeighborhoodDetailDrawer } from './components/NeighborhoodDetailDrawer';
import { ComparisonView } from './components/ComparisonView';
import { H3MapView } from './components/H3MapView';
import { TimeSliderBar } from './components/TimeSliderBar';
import { WeightSimulatorDrawer } from './components/WeightSimulatorDrawer';

type ActiveTab =
  | 'mahalle-kartlari'
  | 'h3-harita'
  | 'karsilastirma'
  | 'bolgesel-analiz';

type QuickRiskFilter =
  | 'all'
  | 'high_vulnerability'
  | 'elderly_dense'
  | 'coastal_pressure'
  | 'service_critical';

type SortOption =
  | 'vulnerability_desc'
  | 'population_desc'
  | 'pop_change_desc'
  | 'elderly_desc'
  | 'builtup_change_desc'
  | 'health_access_desc';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('mahalle-kartlari');
  const [selectedYear, setSelectedYear] = useState<SurveyYear>(2025);
  const [weights, setWeights] = useState<VulnerabilityWeights>({
    ...DEFAULT_VULNERABILITY_WEIGHTS,
  });
  const [isWeightDrawerOpen, setIsWeightDrawerOpen] = useState(false);

  // Search, Zone & Risk filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<NeighborhoodZone | 'all'>('all');
  const [quickFilter, setQuickFilter] = useState<QuickRiskFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('vulnerability_desc');

  // Detail Drawer & Map Focus state
  const [detailNeighborhood, setDetailNeighborhood] =
    useState<NeighborhoodData | null>(null);
  const [mapFocusedNeighborhood, setMapFocusedNeighborhood] =
    useState<NeighborhoodData | null>(KANDIRA_NEIGHBORHOODS[0]);

  // Comparison state (pre-populated with 3 contrasting neighborhoods: Merkez, Kıyı/Turizm, Kırsal)
  const [comparedIds, setComparedIds] = useState<string[]>([
    'akdurak',
    'kefken',
    'kirkarmut',
  ]);

  const isCustomWeights = useMemo(() => {
    return (
      weights.elderlyWeight !== DEFAULT_VULNERABILITY_WEIGHTS.elderlyWeight ||
      weights.socialAidWeight !== DEFAULT_VULNERABILITY_WEIGHTS.socialAidWeight ||
      weights.healthAccessWeight !==
        DEFAULT_VULNERABILITY_WEIGHTS.healthAccessWeight ||
      weights.educationAccessWeight !==
        DEFAULT_VULNERABILITY_WEIGHTS.educationAccessWeight ||
      weights.landPressureWeight !==
        DEFAULT_VULNERABILITY_WEIGHTS.landPressureWeight
    );
  }, [weights]);

  // District-wide summary KPIs for the selected year and weights
  const districtMetrics = useMemo(() => {
    return getDistrictSummaryMetrics(
      KANDIRA_NEIGHBORHOODS,
      selectedYear,
      weights
    );
  }, [selectedYear, weights]);

  // Filtered and sorted neighborhoods for the Mahalle Kartları grid
  const filteredNeighborhoods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = KANDIRA_NEIGHBORHOODS.filter((n) => {
      if (q) {
        const matchName = n.name.toLowerCase().includes(q);
        const matchCode = n.code.toLowerCase().includes(q);
        const matchSummary = n.summary.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSummary) return false;
      }

      if (selectedZone !== 'all' && n.zone !== selectedZone) {
        return false;
      }

      const yd = getYearData(n, selectedYear);
      const vuln = calculateDynamicVulnerabilityScore(n, weights, selectedYear);

      if (quickFilter === 'high_vulnerability' && vuln < 60) return false;
      if (quickFilter === 'elderly_dense' && yd.elderly65PlusPct < 30)
        return false;
      if (
        quickFilter === 'coastal_pressure' &&
        n.landUse.changeCategory !== 'Yuksek Kiyi Yapilasma Baskisi' &&
        n.landUse.changeCategory !== 'Kentsel Yayilma'
      )
        return false;
      if (
        quickFilter === 'service_critical' &&
        n.services.health.trend5Yr !== 'kritik' &&
        n.services.education.trend5Yr !== 'kritik' &&
        yd.healthAccessMin < 15
      )
        return false;

      return true;
    });

    return filtered.sort((a, b) => {
      const ydA = getYearData(a, selectedYear);
      const ydB = getYearData(b, selectedYear);
      const a2021 = getYearData(a, 2021);
      const b2021 = getYearData(b, 2021);
      const a2025 = getYearData(a, 2025);
      const b2025 = getYearData(b, 2025);

      switch (sortBy) {
        case 'vulnerability_desc':
          return (
            calculateDynamicVulnerabilityScore(b, weights, selectedYear) -
            calculateDynamicVulnerabilityScore(a, weights, selectedYear)
          );
        case 'population_desc':
          return ydB.total - ydA.total;
        case 'pop_change_desc': {
          const pctA = ((a2025.total - a2021.total) / a2021.total) * 100;
          const pctB = ((b2025.total - b2021.total) / b2021.total) * 100;
          return pctB - pctA;
        }
        case 'elderly_desc':
          return ydB.elderly65PlusPct - ydA.elderly65PlusPct;
        case 'builtup_change_desc':
          return (
            b.landUse.imperviousSurfaceChangePct -
            a.landUse.imperviousSurfaceChangePct
          );
        case 'health_access_desc':
          return ydB.healthAccessMin - ydA.healthAccessMin;
      }
    });
  }, [searchQuery, selectedZone, quickFilter, sortBy, selectedYear, weights]);

  // Compared neighborhoods list
  const comparedNeighborhoods = useMemo(() => {
    return comparedIds
      .map((id) => KANDIRA_NEIGHBORHOODS.find((n) => n.id === id))
      .filter((n): n is NeighborhoodData => Boolean(n));
  }, [comparedIds]);

  const handleToggleCompare = (n: NeighborhoodData) => {
    setComparedIds((prev) => {
      if (prev.includes(n.id)) {
        return prev.filter((id) => id !== n.id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), n.id];
      }
      return [...prev, n.id];
    });
  };

  const handleAddCompare = (n: NeighborhoodData) => {
    setComparedIds((prev) => {
      if (prev.includes(n.id) || prev.length >= 4) return prev;
      return [...prev, n.id];
    });
  };

  const handleRemoveCompare = (id: string) => {
    setComparedIds((prev) => prev.filter((item) => item !== id));
  };

  const handleOpenOnMap = (n: NeighborhoodData) => {
    setMapFocusedNeighborhood(n);
    setDetailNeighborhood(null);
    setActiveTab('h3-harita');
  };

  const handlePrintNeighborhood = (n: NeighborhoodData) => {
    setDetailNeighborhood(n);
    window.setTimeout(() => {
      window.print();
    }, 250);
  };

  // Top 10 priority neighborhoods for the Bölgesel & Sektörel Sentez tab
  const topPriorityNeighborhoods = useMemo(() => {
    return [...KANDIRA_NEIGHBORHOODS]
      .sort(
        (a, b) =>
          calculateDynamicVulnerabilityScore(b, weights, selectedYear) -
          calculateDynamicVulnerabilityScore(a, weights, selectedYear)
      )
      .slice(0, 12);
  }, [weights, selectedYear]);

  const zoneCounts = useMemo(() => {
    return {
      all: KANDIRA_NEIGHBORHOODS.length,
      merkez: KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === 'merkez').length,
      kiyi_turizm: KANDIRA_NEIGHBORHOODS.filter((n) => n.zone === 'kiyi_turizm')
        .length,
      kirsal_tarim: KANDIRA_NEIGHBORHOODS.filter(
        (n) => n.zone === 'kirsal_tarim'
      ).length,
      kirsal_orman: KANDIRA_NEIGHBORHOODS.filter(
        (n) => n.zone === 'kirsal_orman'
      ).length,
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* TOP NAVIGATION & COMMAND HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-sm no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Brand Emblem & Title */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-teal-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
                <Hexagon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 border border-sky-500/20 text-[10px] font-bold uppercase tracking-wider">
                    Kocaeli • Kandıra Mekansal Bilişim
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    H3 Res-7 & Res-8 İndeksli
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-extrabold font-display text-slate-900 tracking-tight">
                  Kandıra Mahalle Kartları & H3 Mekansal Karar Destek Sistemi
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Kocaeli Büyükşehir / Kandıra İlçesi • 2021–2025 Demografi, Kırılgan
                  Gruplar, Arazi & Hizmet Analizi
                </p>
              </div>
            </div>

            {/* 4 Primary Navigation Tabs + Action Buttons */}
            <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2">
              <nav
                aria-label="Ana Görünüm Sekmeleri"
                className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('mahalle-kartlari')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'mahalle-kartlari'
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Mahalle Kartları ({KANDIRA_NEIGHBORHOODS.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('h3-harita')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'h3-harita'
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapIcon className="w-4 h-4" />
                  <span>H3 Altıgen Harita</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('karsilastirma')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'karsilastirma'
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  <span>Karşılaştırma Modu</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-sky-500/15 text-sky-700">
                    {comparedNeighborhoods.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('bolgesel-analiz')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'bolgesel-analiz'
                      ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Bölgesel & Sektörel Sentez</span>
                </button>
              </nav>

              {/* Weight Simulator Trigger Button */}
              <button
                type="button"
                onClick={() => setIsWeightDrawerOpen(true)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shadow-sm ${
                  isCustomWeights
                    ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
                    : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Ağırlık Simülatörü</span>
                {isCustomWeights && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* DISTRICT SUMMARY KPI RIBBON & TIME SLIDER BAR */}
      <section className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 pt-4 space-y-3 no-print">
        {/* KPI Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 tabular-nums">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Temsili Mahalle Nüfusu ({selectedYear})</span>
              <Users className="w-4 h-4 text-sky-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-display text-slate-900">
                {districtMetrics.totalPopulation.toLocaleString('tr-TR')}
              </span>
              <span
                className={`text-xs font-bold ${
                  districtMetrics.popChangeSince2021Pct >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'
                }`}
              >
                {districtMetrics.popChangeSince2021Pct >= 0
                  ? `+${districtMetrics.popChangeSince2021Pct}%`
                  : `${districtMetrics.popChangeSince2021Pct}%`}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              2021 baz yılına göre değişim
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Yaz Zirve Nüfus Tahmini</span>
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-display text-amber-600">
                {districtMetrics.estimatedSummerPeakPopulation.toLocaleString(
                  'tr-TR'
                )}
              </span>
              <span className="text-xs font-semibold text-slate-500">kişi</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Kefken, Kerpe, Cebeci, Bağırganlı etkisi
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>65+ Yaşlı Nüfus & Oranı</span>
              <HeartPulse className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-display text-slate-900">
                %{districtMetrics.avgElderlyPct}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                ({districtMetrics.totalElderly65Plus.toLocaleString('tr-TR')}{' '}
                kişi)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              0-14 Çocuk:{' '}
              {districtMetrics.totalChildren0To14.toLocaleString('tr-TR')} kişi
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Kırılgan Hane & Mevsimlik İşçi</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-display text-slate-900">
                {districtMetrics.totalSocialAssistanceHouseholds.toLocaleString(
                  'tr-TR'
                )}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                sosyal yardım hanesi
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Mevsimlik Tarım İşçisi: ~
              {districtMetrics.totalSeasonalWorkers.toLocaleString('tr-TR')}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Arazi Örtüsü Dağılımı ({selectedYear})</span>
              <Trees className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-1 flex items-baseline justify-between text-xs font-bold">
              <span className="text-emerald-700">
                Orman %{districtMetrics.avgForestPct}
              </span>
              <span className="text-amber-700">
                Tarım %{districtMetrics.avgAgriculturePct}
              </span>
              <span className="text-rose-600">
                Yapı %{districtMetrics.avgBuiltUpPct}
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full overflow-hidden flex bg-slate-100">
              <div
                style={{ width: `${districtMetrics.avgForestPct}%` }}
                className="bg-emerald-600"
              />
              <div
                style={{ width: `${districtMetrics.avgAgriculturePct}%` }}
                className="bg-amber-500"
              />
              <div
                style={{ width: `${districtMetrics.avgBuiltUpPct}%` }}
                className="bg-rose-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span>Erişim & Yüksek Öncelik</span>
              <GraduationCap className="w-4 h-4 text-sky-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-display text-rose-600">
                {districtMetrics.highRiskNeighborhoodCount} Mahalle
              </span>
              <span className="text-xs font-semibold text-slate-500">
                skor ≥ 60
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Ort. Sağlık: {districtMetrics.avgHealthAccessMin} dk • Eğitim:{' '}
              {districtMetrics.avgEducationAccessMin} dk
            </div>
          </div>
        </div>

        {/* Persistent 5-Year Time Slider Bar */}
        <TimeSliderBar
          selectedYear={selectedYear}
          onChangeYear={setSelectedYear}
        />
      </section>

      {/* MAIN VIEW CONTENT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 no-print">
        {/* TAB 1: MAHALLE KARTLARI */}
        {activeTab === 'mahalle-kartlari' && (
          <div className="space-y-5">
            {/* Filter, Search & Sort Control Bar */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Mahalle adı, kodu veya özellik ara (Örn: Kefken, Akdurak, fındık, yaşlı)..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                  />
                </div>

                {/* Zone Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedZone('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedZone === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tümü ({zoneCounts.all})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedZone('merkez')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedZone === 'merkez'
                        ? 'bg-sky-600 text-white'
                        : 'bg-sky-500/10 text-sky-700 hover:bg-sky-500/20'
                    }`}
                  >
                    Merkez ({zoneCounts.merkez})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedZone('kiyi_turizm')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedZone === 'kiyi_turizm'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20'
                    }`}
                  >
                    Kıyı & Turizm ({zoneCounts.kiyi_turizm})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedZone('kirsal_tarim')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedZone === 'kirsal_tarim'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-500/10 text-amber-800 hover:bg-amber-500/20'
                    }`}
                  >
                    Kırsal Tarım & Fındık ({zoneCounts.kirsal_tarim})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedZone('kirsal_orman')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      selectedZone === 'kirsal_orman'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20'
                    }`}
                  >
                    Kırsal Orman ({zoneCounts.kirsal_orman})
                  </button>
                </div>
              </div>

              {/* Bottom Row: Thematic Quick Filters & Sort Dropdown */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 mr-1">
                    <Filter className="w-3.5 h-3.5" />
                    Odak Filtre:
                  </span>
                  {[
                    { id: 'all', label: 'Tüm Mahalleler' },
                    {
                      id: 'high_vulnerability',
                      label: 'Yüksek Kırılganlık (Skor ≥60)',
                    },
                    { id: 'elderly_dense', label: 'Yaşlı Nüfus Yoğun (≥%30)' },
                    {
                      id: 'coastal_pressure',
                      label: 'Hızlı Yapılaşma & Kıyı Baskısı',
                    },
                    {
                      id: 'service_critical',
                      label: 'Sağlık / Eğitim Erişimi Kritik',
                    },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setQuickFilter(item.id as QuickRiskFilter)
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                        quickFilter === item.id
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-semibold text-slate-500">
                    Sırala:
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Mahalle kartlarını sırala"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="vulnerability_desc">
                      Dinamik Kırılganlık Skoru (Yüksek → Düşük)
                    </option>
                    <option value="population_desc">
                      Toplam Nüfus (Büyük → Küçük)
                    </option>
                    <option value="pop_change_desc">
                      5 Yıllık Nüfus Artış Oranı (%)
                    </option>
                    <option value="elderly_desc">
                      65+ Yaşlı Nüfus Oranı (%)
                    </option>
                    <option value="builtup_change_desc">
                      5 Yıllık Yapılaşma Artışı (%)
                    </option>
                    <option value="health_access_desc">
                      Ambulans / Sağlık Erişim Süresi (Dk)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cards Count & Reset Banner if filtered */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>
                Gösterilen: <strong>{filteredNeighborhoods.length}</strong> /{' '}
                {KANDIRA_NEIGHBORHOODS.length} Kandıra Mahallesi ({selectedYear}{' '}
                verileriyle)
              </span>
              {(searchQuery ||
                selectedZone !== 'all' ||
                quickFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedZone('all');
                    setQuickFilter('all');
                  }}
                  className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Filtreleri Temizle
                </button>
              )}
            </div>

            {/* Responsive Cards Grid */}
            {filteredNeighborhoods.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredNeighborhoods.map((neighborhood) => (
                  <NeighborhoodCard
                    key={neighborhood.id}
                    neighborhood={neighborhood}
                    selectedYear={selectedYear}
                    weights={weights}
                    isSelected={detailNeighborhood?.id === neighborhood.id}
                    isCompared={comparedIds.includes(neighborhood.id)}
                    onSelect={(n) => setDetailNeighborhood(n)}
                    onOpenMap={handleOpenOnMap}
                    onToggleCompare={handleToggleCompare}
                    onPrintReport={handlePrintNeighborhood}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  Arama ve filtre kriterlerinize uygun mahalle bulunamadı.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedZone('all');
                    setQuickFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-500"
                >
                  Tüm Mahalleleri Göster
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: H3 ALTIGEN HARİTA SEKMESİ */}
        {activeTab === 'h3-harita' && (
          <div className="space-y-4">
            {/* Quick Jump Strip for Kandıra Zones & Key Neighborhoods */}
            <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                  <Compass className="w-4 h-4 text-sky-600" />
                  Hızlı Odak Noktaları:
                </span>
                {[
                  'akdurak',
                  'orhan',
                  'kefken',
                  'kincilli',
                  'cebeci',
                  'bagirganli',
                  'babali',
                  'kaymaz',
                  'kirkarmut',
                  'karaagac',
                  'sarniclar',
                  'deliveli',
                ].map((id) => {
                  const target = KANDIRA_NEIGHBORHOODS.find((n) => n.id === id);
                  if (!target) return null;
                  const active = mapFocusedNeighborhood?.id === target.id;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setMapFocusedNeighborhood(target)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        active
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {target.name}
                    </button>
                  );
                })}
              </div>

              {mapFocusedNeighborhood && (
                <button
                  type="button"
                  onClick={() => setDetailNeighborhood(mapFocusedNeighborhood)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {mapFocusedNeighborhood.name} Karnesini Aç
                </button>
              )}
            </div>

            {/* Interactive MapLibre + H3 Hexagon Canvas */}
            <H3MapView
              neighborhoods={KANDIRA_NEIGHBORHOODS}
              selectedYear={selectedYear}
              weights={weights}
              selectedNeighborhood={mapFocusedNeighborhood}
              onSelectNeighborhood={(n) => setMapFocusedNeighborhood(n)}
              onOpenDetailDrawer={(n) => setDetailNeighborhood(n)}
            />
          </div>
        )}

        {/* TAB 3: KARŞILAŞTIRMA MODU */}
        {activeTab === 'karsilastirma' && (
          <ComparisonView
            neighborhoods={comparedNeighborhoods}
            allNeighborhoods={KANDIRA_NEIGHBORHOODS}
            selectedYear={selectedYear}
            weights={weights}
            onAddNeighborhood={handleAddCompare}
            onRemoveNeighborhood={handleRemoveCompare}
            onSelectDetail={(n) => setDetailNeighborhood(n)}
          />
        )}

        {/* TAB 4: BÖLGESEL & SEKTÖREL SENTEZ */}
        {activeTab === 'bolgesel-analiz' && (
          <div className="space-y-6">
            {/* 4 Zone Synthesis Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {(
                [
                  'merkez',
                  'kiyi_turizm',
                  'kirsal_tarim',
                  'kirsal_orman',
                ] as NeighborhoodZone[]
              ).map((zoneKey) => {
                const zb = districtMetrics.zoneBreakdown[zoneKey];
                const zoneColors: Record<NeighborhoodZone, string> = {
                  merkez: 'border-sky-500/30 bg-sky-500/5',
                  kiyi_turizm: 'border-cyan-500/30 bg-cyan-500/5',
                  kirsal_tarim: 'border-amber-500/30 bg-amber-500/5',
                  kirsal_orman: 'border-emerald-500/30 bg-emerald-500/5',
                };
                return (
                  <div
                    key={zoneKey}
                    className={`p-5 rounded-2xl border ${zoneColors[zoneKey]} bg-white shadow-sm space-y-3 tabular-nums`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        {ZONE_LABELS[zoneKey]}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                        {zb.count} Mahalle
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <div className="text-[11px] text-slate-500">
                          Toplam Nüfus
                        </div>
                        <div className="text-base font-extrabold text-slate-900">
                          {zb.population.toLocaleString('tr-TR')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">
                          Ort. 65+ Yaşlı
                        </div>
                        <div className="text-base font-extrabold text-amber-700">
                          %{zb.avgElderlyPct}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500">
                          Öncelik Skoru
                        </div>
                        <div className="text-base font-extrabold text-rose-600">
                          {zb.avgVulnerability}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedZone(zoneKey);
                        setActiveTab('mahalle-kartlari');
                      }}
                      className="w-full py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    >
                      Bu Kuşaktaki Mahalleleri İncele →
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Priority Ranking Table */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-extrabold font-display text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-rose-500" />
                    Kandıra Yatırım & Müdahale Öncelik Sıralaması (İlk 12 Mahalle •{' '}
                    {selectedYear})
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Politika ağırlıklarına göre yaşlı nüfus, sosyal yardım, sağlık/eğitim
                    erişim süresi ve arazi baskısı bileşik sıralaması.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWeightDrawerOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 inline-flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Ağırlıkları Değiştir
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2.5 px-3 font-bold">Sıra</th>
                      <th className="py-2.5 px-3 font-bold">Mahalle</th>
                      <th className="py-2.5 px-3 font-bold">Bölgesel Kuşak</th>
                      <th className="py-2.5 px-3 font-bold">Nüfus ({selectedYear})</th>
                      <th className="py-2.5 px-3 font-bold">65+ Yaşlı %</th>
                      <th className="py-2.5 px-3 font-bold">Sosyal Yrd. Hane</th>
                      <th className="py-2.5 px-3 font-bold">Ambulans / Okul</th>
                      <th className="py-2.5 px-3 font-bold">Yapılaşma Artışı</th>
                      <th className="py-2.5 px-3 font-bold">Öncelik Skoru</th>
                      <th className="py-2.5 px-3 font-bold text-right">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topPriorityNeighborhoods.map((n, index) => {
                      const yd = getYearData(n, selectedYear);
                      const score = calculateDynamicVulnerabilityScore(
                        n,
                        weights,
                        selectedYear
                      );
                      return (
                        <tr
                          key={n.id}
                          className="hover:bg-slate-50/90 transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                            #{index + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {n.name}{' '}
                            <span className="font-mono text-[10px] text-slate-400">
                              ({n.code})
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {n.zoneLabel}
                          </td>
                          <td className="py-2.5 px-3 font-semibold">
                            {yd.total.toLocaleString('tr-TR')}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-amber-700">
                            %{yd.elderly65PlusPct.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3">
                            {n.vulnerableGroups.socialAssistanceHouseholds} hane
                          </td>
                          <td className="py-2.5 px-3">
                            {yd.healthAccessMin} dk / {yd.educationAccessMin} dk
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-rose-600">
                            +{n.landUse.imperviousSurfaceChangePct}%
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-lg font-extrabold bg-rose-500/12 text-rose-700">
                              {score.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailNeighborhood(n)}
                              className="px-2.5 py-1 rounded-lg font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100"
                            >
                              Karne
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenOnMap(n)}
                              className="px-2.5 py-1 rounded-lg font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200"
                            >
                              H3 Harita
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SLIDE-OVER DETAIL DRAWER & PRINT REPORT */}
      <NeighborhoodDetailDrawer
        neighborhood={detailNeighborhood}
        selectedYear={selectedYear}
        weights={weights}
        onClose={() => setDetailNeighborhood(null)}
        onFocusOnMap={handleOpenOnMap}
      />

      {/* POLICY WEIGHT SIMULATOR DRAWER */}
      <WeightSimulatorDrawer
        weights={weights}
        onChangeWeights={setWeights}
        isOpen={isWeightDrawerOpen}
        onClose={() => setIsWeightDrawerOpen(false)}
      />
    </div>
  );
}

export default App;
