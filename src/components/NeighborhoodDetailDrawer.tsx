import React from 'react';
import { latLngToCell } from 'h3-js';
import {
  X,
  Printer,
  MapPin,
  Users,
  HeartPulse,
  GraduationCap,
  Trees,
  AlertTriangle,
  Sparkles,
  Hexagon,
  Wifi,
  Droplets,
  Bus,
  ShieldCheck,
  Ambulance,
  Building2,
  Mountain,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import {
  NeighborhoodData,
  SurveyYear,
  VulnerabilityWeights,
} from '../types/kandira';
import {
  calculateDynamicVulnerabilityScore,
  getYearData,
} from '../utils/h3SpatialEngine';

interface NeighborhoodDetailDrawerProps {
  neighborhood: NeighborhoodData | null;
  selectedYear: SurveyYear;
  weights: VulnerabilityWeights;
  onClose: () => void;
  onFocusOnMap: (n: NeighborhoodData) => void;
}

export const NeighborhoodDetailDrawer: React.FC<NeighborhoodDetailDrawerProps> = ({
  neighborhood,
  selectedYear,
  weights,
  onClose,
  onFocusOnMap,
}) => {
  if (!neighborhood) return null;

  const [lng, lat] = neighborhood.coordinates;
  const h3Res7 = latLngToCell(lat, lng, 7);
  const h3Res8 = latLngToCell(lat, lng, 8);

  const currentYearData = getYearData(neighborhood, selectedYear);
  const data2021 = getYearData(neighborhood, 2021);
  const data2025 = getYearData(neighborhood, 2025);

  const popChange5YrPct = Number(
    (((data2025.total - data2021.total) / Math.max(1, data2021.total)) * 100).toFixed(1)
  );
  const vulnerabilityScore = calculateDynamicVulnerabilityScore(
    neighborhood,
    weights,
    selectedYear
  );

  // Build SVG 5-year dual chart coordinates
  const chartW = 520;
  const chartH = 140;
  const padX = 36;
  const padY = 22;
  const pops = neighborhood.yearlyData.map((d) => d.total);
  const minPop = Math.min(...pops);
  const maxPop = Math.max(...pops);
  const popSpan = Math.max(1, maxPop - minPop);

  const chartNodes = neighborhood.yearlyData.map((d, idx) => {
    const x =
      padX + (idx / (neighborhood.yearlyData.length - 1)) * (chartW - padX * 2);
    const y =
      chartH - padY - ((d.total - minPop) / popSpan) * (chartH - padY * 2);
    return { ...d, x, y };
  });

  const linePath = chartNodes
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${chartNodes[chartNodes.length - 1].x.toFixed(
    1
  )} ${chartH - padY} L ${chartNodes[0].x.toFixed(1)} ${chartH - padY} Z`;

  const waterStatusLabels: Record<
    NeighborhoodData['services']['infrastructure']['drinkingWaterStatus'],
    { label: string; color: string }
  > = {
    iyilestirildi: {
      label: 'İyileştirildi (Yeni Şebeke)',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    yeterli: {
      label: 'Yeterli & Dengeli',
      color: 'text-sky-600 dark:text-sky-400',
    },
    yaz_basinc_sorunu: {
      label: 'Yaz Aylarında Basınç Sorunu',
      color: 'text-amber-600 dark:text-amber-400',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="flex-1 no-print" onClick={onClose} />

      <aside
        aria-label={`${neighborhood.name} Mahallesi Detaylı Karnesi`}
        className="print-sheet relative w-full max-w-4xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 h-full overflow-y-auto shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-sky-500 font-mono text-xs font-bold">
                  {neighborhood.code}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                  {neighborhood.zoneLabel}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <Hexagon className="w-3 h-3 text-sky-500" />
                  H3-R8: {h3Res8}
                </span>
              </div>

              <h2 className="mt-1.5 text-2xl font-extrabold font-display text-slate-900 dark:text-white">
                {neighborhood.name} Mahallesi Karnesi
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-slate-400" />
                  {lat.toFixed(4)}°K, {lng.toFixed(4)}°D
                </span>
                <span className="inline-flex items-center gap-1">
                  <Mountain className="w-3.5 h-3.5 text-slate-400" />
                  Rakım: {neighborhood.elevationM} m
                </span>
                <span>Yüzölçümü: {neighborhood.areaKm2} km²</span>
                <span>Kandıra Merkez: {neighborhood.distanceToCenterKm} km</span>
                <span className="font-mono text-[11px]">H3-R7: {h3Res7}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 no-print">
              <button
                type="button"
                onClick={() => {
                  onFocusOnMap(neighborhood);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <MapPin className="w-4 h-4 text-sky-500" />
                H3 Haritada Göster
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                PDF / Karne Yazdır
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <div className="p-6 space-y-6">
          {/* Executive Summary Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Mekansal Karakter & Özet Değerlendirme
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {neighborhood.summary}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div>
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Dinamik Öncelik Skoru ({selectedYear})
                </div>
                <div className="text-2xl font-extrabold font-display text-rose-600 dark:text-rose-400 tabular-nums">
                  {vulnerabilityScore.toFixed(1)}{' '}
                  <span className="text-xs font-normal text-slate-400">/ 100</span>
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-500/80" />
            </div>
          </div>

          {/* BÖLÜM 1: SON 5 YIL NÜFUS & DEMOGRAFİK DÖNÜŞÜM (2021-2025) */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-base font-bold font-display flex items-center gap-2 text-slate-900 dark:text-white">
                <Users className="w-5 h-5 text-sky-500" />
                Bölüm 1: Son 5 Yıl Nüfus ve Demografik Dönüşüm (2021–2025)
              </h3>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums bg-sky-500/10 text-sky-700 dark:text-sky-300">
                5 Yıllık Değişim: {popChange5YrPct >= 0 ? `+${popChange5YrPct}%` : `${popChange5YrPct}%`}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* SVG Trend Chart */}
              <div className="lg:col-span-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  Yıllık Toplam Nüfus Seyri (2021–2025)
                </div>
                <svg
                  viewBox={`0 0 ${chartW} ${chartH}`}
                  className="w-full h-36 overflow-visible"
                >
                  <defs>
                    <linearGradient id="popGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0284C7" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#0284C7" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#popGrad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#0284C7"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {chartNodes.map((pt) => (
                    <g key={pt.year}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={pt.year === selectedYear ? 6 : 4}
                        className={
                          pt.year === selectedYear
                            ? 'fill-amber-500 stroke-white dark:stroke-slate-900'
                            : 'fill-sky-600 stroke-white dark:stroke-slate-900'
                        }
                        strokeWidth="2"
                      />
                      <text
                        x={pt.x}
                        y={pt.y - 10}
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-slate-700 dark:fill-slate-200 font-mono"
                      >
                        {pt.total.toLocaleString('tr-TR')}
                      </text>
                      <text
                        x={pt.x}
                        y={chartH - 4}
                        textAnchor="middle"
                        className="text-[11px] fill-slate-400 font-mono"
                      >
                        {pt.year}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Multi-column Year-by-Year Table */}
              <div className="lg:col-span-7 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2 px-2 font-semibold">Yıl</th>
                      <th className="py-2 px-2 font-semibold">Toplam Nüfus</th>
                      <th className="py-2 px-2 font-semibold">Erkek / Kadın</th>
                      <th className="py-2 px-2 font-semibold">65+ Yaşlı %</th>
                      <th className="py-2 px-2 font-semibold">0-14 Çocuk %</th>
                      <th className="py-2 px-2 font-semibold">Net Göç (‰)</th>
                      <th className="py-2 px-2 font-semibold">Yaz Nüfusu (Tah.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {neighborhood.yearlyData.map((row) => {
                      const isCurrent = row.year === selectedYear;
                      const summerPop = Math.round(
                        row.total * row.summerPopulationMultiplier
                      );
                      return (
                        <tr
                          key={row.year}
                          className={
                            isCurrent
                              ? 'bg-sky-500/10 font-semibold text-slate-900 dark:text-white'
                              : 'text-slate-700 dark:text-slate-300'
                          }
                        >
                          <td className="py-2 px-2 font-mono font-bold">{row.year}</td>
                          <td className="py-2 px-2 font-bold">
                            {row.total.toLocaleString('tr-TR')}
                          </td>
                          <td className="py-2 px-2 text-slate-500 dark:text-slate-400">
                            {row.male.toLocaleString('tr-TR')} /{' '}
                            {row.female.toLocaleString('tr-TR')}
                          </td>
                          <td className="py-2 px-2">%{row.elderly65PlusPct.toFixed(1)}</td>
                          <td className="py-2 px-2">%{row.youth0To14Pct.toFixed(1)}</td>
                          <td
                            className={`py-2 px-2 font-semibold ${
                              row.netMigrationPermille >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {row.netMigrationPermille >= 0
                              ? `+${row.netMigrationPermille.toFixed(1)}‰`
                              : `${row.netMigrationPermille.toFixed(1)}‰`}
                          </td>
                          <td className="py-2 px-2 font-semibold text-amber-700 dark:text-amber-400">
                            {summerPop.toLocaleString('tr-TR')} ({row.summerPopulationMultiplier}x)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* BÖLÜM 2: KIRILGAN GRUPLAR & SOSYAL RİSK ANALİZİ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <h3 className="text-base font-bold font-display flex items-center gap-2 text-slate-900 dark:text-white mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Bölüm 2: Kırılgan Gruplar ve Sosyal Risk Analizi
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  65+ Yaşlı Nüfus
                </div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  {neighborhood.vulnerableGroups.elderly65PlusCount} kişi
                </div>
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Oran: %{neighborhood.vulnerableGroups.elderly65PlusPct}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Yalnız Yaşayan Yaşlı
                </div>
                <div className="mt-1 text-lg font-extrabold text-rose-600 dark:text-rose-400">
                  ~{neighborhood.vulnerableGroups.elderlyLivingAloneEst} kişi
                </div>
                <div className="text-[11px] text-slate-500">Evde bakım öncelikli</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  0-14 Yaş Çocuk
                </div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  {neighborhood.vulnerableGroups.children0To14Count} çocuk
                </div>
                <div className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
                  Oran: %{neighborhood.vulnerableGroups.children0To14Pct}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sosyal Yardım Alan
                </div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  {neighborhood.vulnerableGroups.socialAssistanceHouseholds} hane
                </div>
                <div className="text-[11px] text-slate-500">
                  Engelli Destek: {neighborhood.vulnerableGroups.disabilitySupportHouseholds} hane
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Kronik Hasta İzlem
                </div>
                <div className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  ~{neighborhood.vulnerableGroups.chronicIllnessFollowupEst} kişi
                </div>
                <div className="text-[11px] text-slate-500">Düzenli ilaç/kontrol</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mevsimlik Tarım İşçisi
                </div>
                <div className="mt-1 text-lg font-extrabold text-amber-700 dark:text-amber-400">
                  {neighborhood.vulnerableGroups.seasonalAgriculturalWorkers} kişi
                </div>
                <div className="text-[11px] text-slate-500">Fındık hasat dönemi</div>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1.5">
                Tespit Edilen Saha Risk Faktörleri:
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                {neighborhood.vulnerableGroups.riskFactors.map((rf, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                    <span>{rf}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* BÖLÜM 3: COĞRAFİ ARAZİ KULLANIMI & YAPILAŞMA DEĞİŞİMİ (2021 vs 2025) */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h3 className="text-base font-bold font-display flex items-center gap-2 text-slate-900 dark:text-white">
                <Trees className="w-5 h-5 text-emerald-600" />
                Bölüm 3: Coğrafi Arazi Kullanımı ve Yapılaşma Değişimi (2021 vs 2025)
              </h3>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {neighborhood.landUse.changeCategory}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 tabular-nums">
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Orman Örtüsü Değişimi
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">
                    2021: %{neighborhood.landUse.forestPct2021} (
                    {(neighborhood.areaKm2 * neighborhood.landUse.forestPct2021).toFixed(1)} ha)
                  </span>
                  <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                    2025: %{neighborhood.landUse.forestPct2025} (
                    {(neighborhood.areaKm2 * neighborhood.landUse.forestPct2025).toFixed(1)} ha)
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-emerald-950/10 dark:bg-emerald-950 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full"
                    style={{ width: `${neighborhood.landUse.forestPct2025}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Tarım & Fındık Alanları
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">
                    2021: %{neighborhood.landUse.agricultureHazelnutPct2021} (
                    {(
                      neighborhood.areaKm2 * neighborhood.landUse.agricultureHazelnutPct2021
                    ).toFixed(1)}{' '}
                    ha)
                  </span>
                  <span className="text-lg font-extrabold text-amber-700 dark:text-amber-400">
                    2025: %{neighborhood.landUse.agricultureHazelnutPct2025} (
                    {(
                      neighborhood.areaKm2 * neighborhood.landUse.agricultureHazelnutPct2025
                    ).toFixed(1)}{' '}
                    ha)
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-amber-950/10 dark:bg-amber-950 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${neighborhood.landUse.agricultureHazelnutPct2025}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20">
                <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                  Yapılaşma & Geçirimsiz Yüzey
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-sm text-slate-500">
                    2021: %{neighborhood.landUse.builtUpPct2021} (
                    {(neighborhood.areaKm2 * neighborhood.landUse.builtUpPct2021).toFixed(1)} ha)
                  </span>
                  <span className="text-lg font-extrabold text-rose-600 dark:text-rose-400">
                    2025: %{neighborhood.landUse.builtUpPct2025} (
                    {(neighborhood.areaKm2 * neighborhood.landUse.builtUpPct2025).toFixed(1)} ha, +
                    {neighborhood.landUse.imperviousSurfaceChangePct}%)
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-rose-950/10 dark:bg-rose-950 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, neighborhood.landUse.builtUpPct2025)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>
                  Baskın Arazi Dokusu:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {neighborhood.landUse.dominantLandCover}
                  </strong>
                </span>
              </div>
              <div className="font-mono font-semibold text-rose-600 dark:text-rose-400">
                Son 5 Yıl Yeni Yapı Ruhsatı: {neighborhood.landUse.newBuildingPermits5Yr} adet
              </div>
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              {neighborhood.landUse.observations.map((obs, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* BÖLÜM 4: SAĞLIK, EĞİTİM VE ALTYAPI KARNESİ */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-slate-900">
            <h3 className="text-base font-bold font-display flex items-center gap-2 text-slate-900 dark:text-white mb-4">
              <HeartPulse className="w-5 h-5 text-rose-500" />
              Bölüm 4: Sağlık, Eğitim ve Altyapı Gelişim Karnesi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs tabular-nums">
              {/* Health Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <Ambulance className="w-4 h-4 text-rose-500" />
                    Sağlık Erişimi
                  </span>
                  <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    {neighborhood.services.health.trend5Yr}
                  </span>
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>ASM / Aile Hekimi:</span>
                    <strong>
                      {neighborhood.services.health.asmCount} ASM /{' '}
                      {neighborhood.services.health.familyPhysicians} Hekim
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Eczane Sayısı:</span>
                    <strong>{neighborhood.services.health.pharmacyCount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Ambulans Erişim Süresi:</span>
                    <strong className="text-rose-600 dark:text-rose-400">
                      {currentYearData.healthAccessMin} dk
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Mobil Sağlık Ziyareti:</span>
                    <strong>
                      Ayda {neighborhood.services.health.mobileHealthVisitPerMonth} kez
                    </strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">
                    Son Dönem Yatırımları:
                  </div>
                  {neighborhood.services.health.recentInvestments.map((inv, i) => (
                    <div key={i} className="text-[11px] text-slate-600 dark:text-slate-400">
                      • {inv}
                    </div>
                  ))}
                </div>
              </div>

              {/* Education Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-sky-500" />
                    Eğitim & Okullaşma
                  </span>
                  <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    {neighborhood.services.education.trend5Yr}
                  </span>
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Anaokulu / İlk-Orta / Lise:</span>
                    <strong>
                      {neighborhood.services.education.kindergartenCount} /{' '}
                      {neighborhood.services.education.primaryMiddleCount} /{' '}
                      {neighborhood.services.education.highSchoolCount}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Taşımalı Öğrenci:</span>
                    <strong>
                      {neighborhood.services.education.bussedStudentsCount} öğrenci
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Öğretmen Başına Öğrenci:</span>
                    <strong>{neighborhood.services.education.studentPerTeacher}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Bilişim / İnternet Lab:</span>
                    <strong>
                      {neighborhood.services.education.internetLabAvailable ? 'Var' : 'Yok'}
                    </strong>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/70">
                  <div className="text-[11px] font-semibold text-slate-500 mb-1">
                    Son Dönem Yatırımları:
                  </div>
                  {neighborhood.services.education.recentInvestments.map((inv, i) => (
                    <div key={i} className="text-[11px] text-slate-600 dark:text-slate-400">
                      • {inv}
                    </div>
                  ))}
                </div>
              </div>

              {/* Infrastructure Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Teknik Altyapı & Afet Direnci
                </div>
                <div className="space-y-2 text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-sky-500" />
                      Fiber Genişbant:
                    </span>
                    <strong>%{neighborhood.services.infrastructure.fiberBroadbandPct}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5 text-sky-500" />
                      İçme Suyu:
                    </span>
                    <strong
                      className={
                        waterStatusLabels[
                          neighborhood.services.infrastructure.drinkingWaterStatus
                        ].color
                      }
                    >
                      {
                        waterStatusLabels[
                          neighborhood.services.infrastructure.drinkingWaterStatus
                        ].label
                      }
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Bus className="w-3.5 h-3.5 text-amber-500" />
                      Toplu Taşıma:
                    </span>
                    <strong>
                      Günde {neighborhood.services.infrastructure.publicTransportDailyTrips}{' '}
                      sefer
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Afet Toplanma Alanı:
                    </span>
                    <strong>
                      {neighborhood.services.infrastructure.disasterAssemblyAreas} nokta
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BÖLÜM 5: KARAR DESTEK & YATIRIM ÖNCELİK ÖNERİLERİ */}
          <section className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5">
            <h3 className="text-base font-bold font-display flex items-center gap-2 text-sky-900 dark:text-sky-300 mb-3">
              <Sparkles className="w-5 h-5 text-sky-500" />
              Bölüm 5: Karar Destek ve Yatırım Öncelik Önerileri
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {neighborhood.priorityRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-sky-500/20 shadow-sm flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200"
                >
                  <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-medium">{rec}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
};
