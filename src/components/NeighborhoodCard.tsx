import React from 'react';
import { latLngToCell } from 'h3-js';
import {
  Users,
  HeartPulse,
  GraduationCap,
  Trees,
  Sun,
  MapPin,
  Printer,
  Scale,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Ambulance,
  Bus,
  Check,
  Hexagon,
  ExternalLink,
} from 'lucide-react';
import {
  NeighborhoodData,
  NeighborhoodZone,
  SurveyYear,
  VulnerabilityWeights,
} from '../types/kandira';
import {
  calculateDynamicVulnerabilityScore,
  getYearData,
} from '../utils/h3SpatialEngine';
import { MINI_SOURCE_LINKS } from '../data/dataSources';

interface NeighborhoodCardProps {
  neighborhood: NeighborhoodData;
  selectedYear: SurveyYear;
  weights: VulnerabilityWeights;
  isSelected: boolean;
  isCompared: boolean;
  onSelect: (n: NeighborhoodData) => void;
  onOpenMap: (n: NeighborhoodData) => void;
  onToggleCompare: (n: NeighborhoodData) => void;
  onPrintReport: (n: NeighborhoodData) => void;
}

const ZONE_BADGE_STYLES: Record<
  NeighborhoodZone,
  { bg: string; text: string; dot: string; shortLabel: string }
> = {
  merkez: {
    bg: 'bg-sky-500/10 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-500/20',
    text: 'text-sky-700 dark:text-sky-300',
    dot: 'bg-sky-500',
    shortLabel: 'Merkez Kentsel',
  },
  kiyi_turizm: {
    bg: 'bg-cyan-500/10 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border-cyan-500/20',
    text: 'text-cyan-700 dark:text-cyan-300',
    dot: 'bg-cyan-500',
    shortLabel: 'Kıyı & Turizm',
  },
  kirsal_tarim: {
    bg: 'bg-amber-500/10 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/20',
    text: 'text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500',
    shortLabel: 'Tarım & Fındık',
  },
  kirsal_orman: {
    bg: 'bg-emerald-500/10 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/20',
    text: 'text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-600',
    shortLabel: 'Kırsal Orman',
  },
};

function getVulnerabilityBadge(score: number) {
  if (score >= 65) {
    return {
      label: 'Kritik Öncelik',
      className:
        'bg-rose-500/12 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-500/30',
      barColor: 'bg-rose-500',
    };
  }
  if (score >= 50) {
    return {
      label: 'Yüksek Risk',
      className:
        'bg-amber-500/12 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border-amber-500/30',
      barColor: 'bg-amber-500',
    };
  }
  if (score >= 35) {
    return {
      label: 'Orta İzlem',
      className:
        'bg-sky-500/12 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-500/30',
      barColor: 'bg-sky-500',
    };
  }
  return {
    label: 'Düşük Risk',
    className:
      'bg-emerald-500/12 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/30',
    barColor: 'bg-emerald-500',
  };
}

function getTrendBadge(trend: 'gelisti' | 'sabit' | 'kritik') {
  switch (trend) {
    case 'gelisti':
      return {
        label: 'Gelişti',
        className:
          'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-500/20',
      };
    case 'sabit':
      return {
        label: 'Sabit',
        className:
          'bg-slate-500/10 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300 border-slate-500/20',
      };
    case 'kritik':
      return {
        label: 'Kritik',
        className:
          'bg-rose-500/10 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-500/20',
      };
  }
}

export const NeighborhoodCard: React.FC<NeighborhoodCardProps> = ({
  neighborhood,
  selectedYear,
  weights,
  isSelected,
  isCompared,
  onSelect,
  onOpenMap,
  onToggleCompare,
  onPrintReport,
}) => {
  const [lng, lat] = neighborhood.coordinates;
  const h3Res8 = latLngToCell(lat, lng, 8);

  const currentYearData = getYearData(neighborhood, selectedYear);
  const data2021 = getYearData(neighborhood, 2021);
  const data2025 = getYearData(neighborhood, 2025);

  const popChange5YrPct = Number(
    (((data2025.total - data2021.total) / Math.max(1, data2021.total)) * 100).toFixed(1)
  );
  const isPopGrowing = popChange5YrPct >= 0;

  const vulnerabilityScore = calculateDynamicVulnerabilityScore(
    neighborhood,
    weights,
    selectedYear
  );
  const vulnBadge = getVulnerabilityBadge(vulnerabilityScore);
  const zoneStyle = ZONE_BADGE_STYLES[neighborhood.zone];

  // Build SVG Sparkline points for 2021-2025 population
  const pops = neighborhood.yearlyData.map((d) => d.total);
  const minPop = Math.min(...pops);
  const maxPop = Math.max(...pops);
  const popRange = Math.max(1, maxPop - minPop);
  const sparkWidth = 108;
  const sparkHeight = 28;

  const sparkPoints = neighborhood.yearlyData
    .map((d, idx) => {
      const x = (idx / (neighborhood.yearlyData.length - 1)) * (sparkWidth - 8) + 4;
      const y =
        sparkHeight - 4 - ((d.total - minPop) / popRange) * (sparkHeight - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const selectedYearIndex = neighborhood.yearlyData.findIndex(
    (d) => d.year === selectedYear
  );
  const activePointIndex = selectedYearIndex >= 0 ? selectedYearIndex : 4;
  const activePointX =
    (activePointIndex / (neighborhood.yearlyData.length - 1)) * (sparkWidth - 8) + 4;
  const activePointY =
    sparkHeight -
    4 -
    ((neighborhood.yearlyData[activePointIndex].total - minPop) / popRange) *
      (sparkHeight - 8);

  const elderlyCountSelectedYear = Math.round(
    (currentYearData.total * currentYearData.elderly65PlusPct) / 100
  );

  const healthTrendBadge = getTrendBadge(neighborhood.services.health.trend5Yr);
  const eduTrendBadge = getTrendBadge(neighborhood.services.education.trend5Yr);

  return (
    <article
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md ${
        isSelected
          ? 'border-sky-500 ring-2 ring-sky-500/20 dark:border-sky-400'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Header */}
      <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {neighborhood.code}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${zoneStyle.bg}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${zoneStyle.dot}`} />
                {zoneStyle.shortLabel}
              </span>
              <span
                title="Merkez H3 Çözünürlük 8 Hücre İndeksi"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[10px]"
              >
                <Hexagon className="w-2.5 h-2.5 text-sky-500" />
                {h3Res8.slice(0, 9)}…
              </span>
            </div>

            <h3
              onClick={() => onSelect(neighborhood)}
              className="mt-1.5 text-lg font-bold font-display text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 cursor-pointer truncate"
            >
              {neighborhood.name} Mahallesi
            </h3>
          </div>

          {/* Dynamic Vulnerability Score Badge */}
          <div className="flex flex-col items-end shrink-0">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold tabular-nums ${vulnBadge.className}`}
              title="Politika Ağırlıklı Dinamik Kırılganlık ve Öncelik Skoru (0-100)"
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{vulnerabilityScore.toFixed(1)}</span>
            </div>
            <span className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
              {vulnBadge.label}
            </span>
          </div>
        </div>

        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {neighborhood.summary}
        </p>
      </div>

      {/* Section 1: Demografik Değişim (2021-2025) */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-sky-500" />
            Demografik Değişim ({selectedYear})
          </span>
          {currentYearData.summerPopulationMultiplier >= 1.5 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25 tabular-nums">
              <Sun className="w-3 h-3 text-amber-500" />
              Yazın {currentYearData.summerPopulationMultiplier.toFixed(1)}x (
              {Math.round(
                currentYearData.total * currentYearData.summerPopulationMultiplier
              ).toLocaleString('tr-TR')}
              )
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-display text-slate-900 dark:text-white tabular-nums">
                {currentYearData.total.toLocaleString('tr-TR')}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold tabular-nums ${
                  isPopGrowing
                    ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/12 text-rose-700 dark:text-rose-300'
                }`}
                title={`2021 (${data2021.total.toLocaleString('tr-TR')}) → 2025 (${data2025.total.toLocaleString('tr-TR')}) 5 Yıllık Nüfus Değişimi`}
              >
                {isPopGrowing ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {isPopGrowing ? `+${popChange5YrPct}%` : `${popChange5YrPct}%`}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
              2021: {data2021.total.toLocaleString('tr-TR')} → 2025:{' '}
              {data2025.total.toLocaleString('tr-TR')} kişi
            </div>
          </div>

          {/* 5-Year Inline SVG Sparkline */}
          <div className="flex flex-col items-end">
            <svg
              width={sparkWidth}
              height={sparkHeight}
              className="overflow-visible"
              aria-label="5 Yıllık Nüfus Eğilimi"
            >
              <polyline
                fill="none"
                stroke={isPopGrowing ? '#10B981' : '#F43F5E'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparkPoints}
              />
              <circle
                cx={activePointX}
                cy={activePointY}
                r="3.5"
                className={
                  isPopGrowing
                    ? 'fill-emerald-500 stroke-white dark:stroke-slate-900'
                    : 'fill-rose-500 stroke-white dark:stroke-slate-900'
                }
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              2021 — 2025 Trendi
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Kırılgan Gruplar */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Kırılgan Gruplar & Sosyal İzlem
          </span>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums">
            Kronik Takip: ~{neighborhood.vulnerableGroups.chronicIllnessFollowupEst} kişi
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              65+ Yaşlı Oranı
            </div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                %{currentYearData.elderly65PlusPct.toFixed(1)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                ({elderlyCountSelectedYear} kişi)
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-amber-700 dark:text-amber-400 font-medium tabular-nums">
              Yalnız Yaşayan: ~{neighborhood.vulnerableGroups.elderlyLivingAloneEst}
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              0-14 Çocuk & Sosyal Destek
            </div>
            <div className="mt-0.5 flex items-baseline justify-between">
              <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                %{currentYearData.youth0To14Pct.toFixed(1)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Sosyal Yrd: {neighborhood.vulnerableGroups.socialAssistanceHouseholds} hane
              </span>
            </div>
            <div className="mt-0.5 text-[10px] text-sky-700 dark:text-sky-400 font-medium tabular-nums">
              {neighborhood.vulnerableGroups.seasonalAgriculturalWorkers > 0
                ? `Mevsimlik İşçi: ~${neighborhood.vulnerableGroups.seasonalAgriculturalWorkers}`
                : `Engelli Destek: ${neighborhood.vulnerableGroups.disabilitySupportHouseholds} hane`}
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Coğrafi & Arazi Değişimi */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Trees className="w-3.5 h-3.5 text-emerald-600" />
            Arazi & Yapılaşma ({selectedYear})
          </span>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 truncate max-w-[190px]">
            {neighborhood.landUse.changeCategory}
          </span>
        </div>

        {/* Stacked Horizontal Bar */}
        <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 p-0.5 gap-0.5">
          <div
            style={{ width: `${currentYearData.forestPct}%` }}
            className="bg-emerald-600 rounded-l-full transition-all duration-300"
            title={`Orman: %${currentYearData.forestPct}`}
          />
          <div
            style={{ width: `${currentYearData.agriculturePct}%` }}
            className="bg-amber-500 transition-all duration-300"
            title={`Tarım & Fındık: %${currentYearData.agriculturePct}`}
          />
          <div
            style={{ width: `${currentYearData.builtUpPct}%` }}
            className="bg-rose-500 rounded-r-full transition-all duration-300"
            title={`Yapılaşma: %${currentYearData.builtUpPct}`}
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            Orman %{currentYearData.forestPct.toFixed(0)}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Tarım %{currentYearData.agriculturePct.toFixed(0)}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Yapı %{currentYearData.builtUpPct.toFixed(1)} (
            <span className="text-rose-600 dark:text-rose-400">
              +{neighborhood.landUse.imperviousSurfaceChangePct}%
            </span>
            )
          </span>
        </div>
      </div>

      {/* Section 4: Sağlık, Eğitim ve Altyapı */}
      <div className="px-4 py-3 flex-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Health */}
          <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                Sağlık
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${healthTrendBadge.className}`}
              >
                {healthTrendBadge.label}
              </span>
            </div>
            <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
              <div className="flex items-center justify-between">
                <span>ASM / Hekim:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {neighborhood.services.health.asmCount} /{' '}
                  {neighborhood.services.health.familyPhysicians}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1">
                  <Ambulance className="w-3 h-3 text-slate-400" />
                  Ambulans:
                </span>
                <span
                  className={`font-bold ${
                    currentYearData.healthAccessMin >= 16
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {currentYearData.healthAccessMin} dk
                </span>
              </div>
            </div>
          </div>

          {/* Education */}
          <div className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
                Eğitim
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${eduTrendBadge.className}`}
              >
                {eduTrendBadge.label}
              </span>
            </div>
            <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
              <div className="flex items-center justify-between">
                <span>Okul (İÖ/Lise):</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {neighborhood.services.education.primaryMiddleCount} /{' '}
                  {neighborhood.services.education.highSchoolCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1">
                  <Bus className="w-3 h-3 text-slate-400" />
                  Taşımalı:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {neighborhood.services.education.bussedStudentsCount} öğr.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mini Data Source Links Strip */}
      <div className="px-4 py-1.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 flex items-center justify-between gap-1.5 flex-wrap text-[10px] text-slate-400">
        <span className="font-semibold text-slate-400">Kaynak:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {MINI_SOURCE_LINKS.map((src) => (
            <a
              key={src.id}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              title={src.fullLabel}
              className="inline-flex items-center gap-0.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition underline decoration-slate-300"
            >
              <span>{src.shortLabel}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 bg-slate-50/60 dark:bg-slate-900/60 rounded-b-2xl">
        <button
          type="button"
          onClick={() => onSelect(neighborhood)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          Detaylı Karne
        </button>

        <button
          type="button"
          onClick={() => onOpenMap(neighborhood)}
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          title="H3 Haritada Odakla"
        >
          <MapPin className="w-3.5 h-3.5 text-sky-500" />
          H3 Harita
        </button>

        <button
          type="button"
          onClick={() => onToggleCompare(neighborhood)}
          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            isCompared
              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-500'
              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
          }`}
          title="Kıyaslama Listesine Ekle / Çıkar"
        >
          {isCompared ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Scale className="w-3.5 h-3.5 text-slate-500" />
          )}
          Kıyasla
        </button>

        <button
          type="button"
          onClick={() => onPrintReport(neighborhood)}
          className="inline-flex items-center justify-center p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
          title="Mahalle Karnesini Yazdır / PDF İndir"
          aria-label="Mahalle Karnesini Yazdır"
        >
          <Printer className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
};
