import React, { useState } from 'react';
import { latLngToCell } from 'h3-js';
import {
  Scale,
  Plus,
  X,
  Users,
  AlertTriangle,
  Trees,
  HeartPulse,
  Sparkles,
  FileText,
  Hexagon,
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

interface ComparisonViewProps {
  neighborhoods: NeighborhoodData[];
  allNeighborhoods: NeighborhoodData[];
  selectedYear: SurveyYear;
  weights: VulnerabilityWeights;
  onAddNeighborhood: (n: NeighborhoodData) => void;
  onRemoveNeighborhood: (id: string) => void;
  onSelectDetail: (n: NeighborhoodData) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  neighborhoods,
  allNeighborhoods,
  selectedYear,
  weights,
  onAddNeighborhood,
  onRemoveNeighborhood,
  onSelectDetail,
}) => {
  const [selectedToAddId, setSelectedToAddId] = useState<string>('');

  // If fewer than 2 neighborhoods are actively selected, provide default contrasting neighborhoods
  const activeComparisonList: NeighborhoodData[] =
    neighborhoods.length > 0
      ? neighborhoods
      : allNeighborhoods.slice(0, 3);

  const availableToAdd = allNeighborhoods.filter(
    (n) => !activeComparisonList.some((c) => c.id === n.id)
  );

  const handleAddSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedToAddId('');
    if (!val) return;
    const found = allNeighborhoods.find((n) => n.id === val);
    if (found) {
      onAddNeighborhood(found);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Control Header */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <Scale className="w-4 h-4" />
            Çok Boyutlu Mahalle Kıyaslama Matrisi ({selectedYear})
          </div>
          <h2 className="mt-1 text-xl font-extrabold font-display text-slate-900 dark:text-white">
            Kandıra Mahalleleri Yan Yana Karşılaştırma ({activeComparisonList.length} / 4)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Nüfus & göç, kırılgan gruplar, arazi değişimi, sağlık/eğitim erişimi ve dinamik
            öncelik skorlarını aynı ölçekte kıyaslayın.
          </p>
        </div>

        {/* Add Neighborhood Selector */}
        {activeComparisonList.length < 4 && (
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-500" />
            <select
              value={selectedToAddId}
              onChange={handleAddSelect}
              aria-label="Kıyaslamaya mahalle ekle"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">+ Kıyaslamaya Mahalle Ekle ({availableToAdd.length})</option>
              {availableToAdd.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name} ({n.zoneLabel})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Comparison Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {activeComparisonList.map((n) => {
          const yd = getYearData(n, selectedYear);
          const yd2021 = getYearData(n, 2021);
          const yd2025 = getYearData(n, 2025);
          const popChange5Yr = Number(
            (((yd2025.total - yd2021.total) / Math.max(1, yd2021.total)) * 100).toFixed(1)
          );
          const vulnScore = calculateDynamicVulnerabilityScore(n, weights, selectedYear);
          const [lng, lat] = n.coordinates;
          const h3Index = latLngToCell(lat, lng, 8);

          return (
            <div
              key={n.id}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-slate-400">
                      {n.code}
                    </span>
                    <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                      {n.zoneLabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold font-display text-slate-900 dark:text-white mt-0.5">
                    {n.name}
                  </h3>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-slate-500">
                    <Hexagon className="w-3 h-3 text-sky-500" />
                    {h3Index}
                  </div>
                </div>

                {neighborhoods.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onRemoveNeighborhood(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                    title="Kıyaslamadan Çıkar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="p-4 space-y-4 flex-1 text-xs tabular-nums">
                {/* 1. Öncelik Skoru */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                      Dinamik Öncelik Skoru
                    </span>
                    <span className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                      {vulnScore.toFixed(1)} / 100
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full transition-all duration-300"
                      style={{ width: `${vulnScore}%` }}
                    />
                  </div>
                </div>

                {/* 2. Nüfus & Göç */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-500" />
                    Nüfus & Mevsimsel Baskı ({selectedYear})
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Kış Nüfusu:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {yd.total.toLocaleString('tr-TR')} kişi
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">5 Yıllık Değişim:</span>
                    <span
                      className={`font-bold ${
                        popChange5Yr >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {popChange5Yr >= 0 ? `+${popChange5Yr}%` : `${popChange5Yr}%`}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Yaz Zirve Çarpanı:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {yd.summerPopulationMultiplier}x (~
                      {Math.round(yd.total * yd.summerPopulationMultiplier).toLocaleString(
                        'tr-TR'
                      )}
                      )
                    </span>
                  </div>
                </div>

                {/* 3. Kırılgan Gruplar */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Kırılgan Gruplar
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">65+ Yaşlı Oranı:</span>
                    <span className="font-bold">%{yd.elderly65PlusPct.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Yalnız Yaşayan Yaşlı:</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      ~{n.vulnerableGroups.elderlyLivingAloneEst} kişi
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Sosyal Yardım Alan:</span>
                    <span className="font-bold">
                      {n.vulnerableGroups.socialAssistanceHouseholds} hane
                    </span>
                  </div>
                </div>

                {/* 4. Arazi Değişimi */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Trees className="w-3.5 h-3.5 text-emerald-500" />
                    Arazi & Yapılaşma
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                    <div
                      style={{ width: `${yd.forestPct}%` }}
                      className="bg-emerald-600"
                    />
                    <div
                      style={{ width: `${yd.agriculturePct}%` }}
                      className="bg-amber-500"
                    />
                    <div
                      style={{ width: `${yd.builtUpPct}%` }}
                      className="bg-rose-500"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Orman %{yd.forestPct.toFixed(0)}</span>
                    <span>Tarım %{yd.agriculturePct.toFixed(0)}</span>
                    <span className="font-semibold text-rose-600">
                      Yapı %{yd.builtUpPct.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* 5. Sağlık & Eğitim Erişimi */}
                <div className="space-y-1.5">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                    Sağlık & Eğitim Erişimi
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Ambulans Erişimi:</span>
                    <span className="font-bold">{yd.healthAccessMin} dk</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Taşımalı Öğrenci:</span>
                    <span className="font-bold">
                      {n.services.education.bussedStudentsCount} öğr.
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Fiber Altyapı:</span>
                    <span className="font-bold">
                      %{n.services.infrastructure.fiberBroadbandPct}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => onSelectDetail(n)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Tam Mahalle Karnesini Aç
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
