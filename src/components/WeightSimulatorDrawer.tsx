import React from 'react';
import {
  Sliders,
  X,
  RotateCcw,
  HeartPulse,
  Users,
  GraduationCap,
  Building2,
  HandHeart,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { VulnerabilityWeights } from '../types/kandira';
import { DEFAULT_VULNERABILITY_WEIGHTS } from '../data/kandiraNeighborhoods';

interface WeightSimulatorDrawerProps {
  weights: VulnerabilityWeights;
  onChangeWeights: (w: VulnerabilityWeights) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface PolicyPreset {
  id: string;
  label: string;
  subtitle: string;
  weights: VulnerabilityWeights;
}

const POLICY_PRESETS: PolicyPreset[] = [
  {
    id: 'balanced',
    label: 'Dengeli Karar Destek (Varsayılan)',
    subtitle: 'Yaşlı nüfus, sosyal yardım, sağlık/eğitim erişimi ve arazi baskısı dengeli dağılım',
    weights: { ...DEFAULT_VULNERABILITY_WEIGHTS },
  },
  {
    id: 'rural_elderly',
    label: 'Kırsal Yaşlı & Sağlık Erişimi Odaklı',
    subtitle: '65+ yalnız yaşayan yaşlılar ve mobil sağlık/ambulans erişim süresine öncelik verir',
    weights: {
      elderlyWeight: 42,
      socialAidWeight: 18,
      healthAccessWeight: 30,
      educationAccessWeight: 5,
      landPressureWeight: 5,
    },
  },
  {
    id: 'coastal_land',
    label: 'Kıyı Turizm & İmar Baskısı Odaklı',
    subtitle: 'Yazlık nüfus çarpanı, yeni yapı ruhsatları ve geçirimsiz yüzey artışına öncelik verir',
    weights: {
      elderlyWeight: 10,
      socialAidWeight: 10,
      healthAccessWeight: 15,
      educationAccessWeight: 15,
      landPressureWeight: 50,
    },
  },
  {
    id: 'social_edu',
    label: 'Sosyal Yardım & Taşımalı Eğitim Odaklı',
    subtitle: 'Sosyal destek alan haneler, mevsimlik tarım işçileri ve okul erişim süresine odaklanır',
    weights: {
      elderlyWeight: 15,
      socialAidWeight: 40,
      healthAccessWeight: 10,
      educationAccessWeight: 30,
      landPressureWeight: 5,
    },
  },
];

const WEIGHT_FIELDS: Array<{
  key: keyof VulnerabilityWeights;
  title: string;
  metricSource: string;
  colorClass: string;
  barBgClass: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'elderlyWeight',
    title: '65+ Yaşlı Nüfus Yoğunluğu',
    metricSource: 'ADNKS 65+ yaş oranı (%10–%44 aralığı normalize)',
    colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
    barBgClass: 'bg-rose-500',
    icon: <Users className="w-4 h-4 text-rose-600" />,
  },
  {
    key: 'socialAidWeight',
    title: 'Sosyal Yardım & Hane Kırılganlığı',
    metricSource: 'Sosyal destek alan hane oranı, engelli ve mevsimlik tarım duyarlılığı',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    barBgClass: 'bg-amber-500',
    icon: <HandHeart className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'healthAccessWeight',
    title: 'Sağlık Hizmetine Erişim Süresi',
    metricSource: 'ASM / Devlet Hastanesi mesafesi ve ambulans ortalama varış süresi (dk)',
    colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
    barBgClass: 'bg-teal-500',
    icon: <HeartPulse className="w-4 h-4 text-teal-600" />,
  },
  {
    key: 'educationAccessWeight',
    title: 'Eğitim Erişimi & Taşımalı Öğrenci',
    metricSource: 'Okul erişim süresi (dk) ve taşımalı eğitim kapsamındaki öğrenci yoğunluğu',
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    barBgClass: 'bg-indigo-500',
    icon: <GraduationCap className="w-4 h-4 text-indigo-600" />,
  },
  {
    key: 'landPressureWeight',
    title: 'Arazi Değişimi & Yazlık Nüfus Baskısı',
    metricSource: '5 yıllık yapılaşma artışı (%) ve yaz mevsimi nüfus çarpanı altyapı yükü',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    barBgClass: 'bg-emerald-500',
    icon: <Building2 className="w-4 h-4 text-emerald-600" />,
  },
];

export const WeightSimulatorDrawer: React.FC<WeightSimulatorDrawerProps> = ({
  weights,
  onChangeWeights,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const totalRaw =
    weights.elderlyWeight +
    weights.socialAidWeight +
    weights.healthAccessWeight +
    weights.educationAccessWeight +
    weights.landPressureWeight;

  const safeTotal = totalRaw > 0 ? totalRaw : 1;

  const getNormalizedPct = (val: number) => Math.round((val / safeTotal) * 100);

  const handleSliderChange = (key: keyof VulnerabilityWeights, value: number) => {
    onChangeWeights({
      ...weights,
      [key]: value,
    });
  };

  const isPresetMatch = (preset: VulnerabilityWeights) =>
    preset.elderlyWeight === weights.elderlyWeight &&
    preset.socialAidWeight === weights.socialAidWeight &&
    preset.healthAccessWeight === weights.healthAccessWeight &&
    preset.educationAccessWeight === weights.educationAccessWeight &&
    preset.landPressureWeight === weights.landPressureWeight;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 mt-0.5">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Kırılganlık Endeksi Ağırlık Simülatörü
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  Canlı H3 Hesaplama
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Karar destek önceliklerinize göre bileşik kırılganlık katsayılarını değiştirin; H3 altıgen harita ve mahalle sıralaması anında güncellenir.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Normalized Distribution Bar */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Normalize Ağırlık Dağılımı (%100)
              </span>
              <span className="text-xs font-mono text-slate-500">
                Toplam Puan: {totalRaw}
              </span>
            </div>

            <div className="h-3 w-full rounded-full overflow-hidden flex bg-slate-200 gap-0.5 p-0.5">
              {WEIGHT_FIELDS.map((field) => {
                const pct = (weights[field.key] / safeTotal) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={field.key}
                    style={{ width: `${pct}%` }}
                    className={`h-full ${field.barBgClass} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                    title={`${field.title}: %${Math.round(pct)}`}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-5 gap-1.5 mt-3">
              {WEIGHT_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="text-center px-1.5 py-1 rounded-lg bg-white border border-slate-200/80"
                >
                  <div className="text-[11px] font-mono font-bold text-slate-800">
                    %{getNormalizedPct(weights[field.key])}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate">
                    {field.title.split(' ')[0]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4 Policy Presets */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Hazır Politika Senaryoları (4 Senaryo)
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {POLICY_PRESETS.map((preset) => {
                const active = isPresetMatch(preset.weights);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onChangeWeights({ ...preset.weights })}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      active
                        ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-500/15'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {preset.label}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {preset.subtitle}
                      </p>
                    </div>
                    {active && (
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Individual Weight Sliders (0 to 50) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Alt Endeks Katsayıları (0 – 50)
              </h3>
              <button
                type="button"
                onClick={() => onChangeWeights({ ...DEFAULT_VULNERABILITY_WEIGHTS })}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Varsayılana Sıfırla</span>
              </button>
            </div>

            {WEIGHT_FIELDS.map((field) => {
              const rawVal = weights[field.key];
              const normPct = getNormalizedPct(rawVal);

              return (
                <div
                  key={field.key}
                  className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${field.colorClass}`}>
                        {field.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {field.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {field.metricSource}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                        %{normPct}
                      </span>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Katsayı: {rawVal}/50
                      </div>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={rawVal}
                    onChange={(e) =>
                      handleSliderChange(field.key, Number(e.target.value))
                    }
                    className="w-full accent-teal-700 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            Değişiklikler tüm <strong className="text-slate-700">H3 altıgenlerine</strong> ve mahalle kartlarına gerçek zamanlı uygulanır.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shrink-0"
          >
            Simülasyonu Uygula
          </button>
        </div>
      </aside>
    </div>
  );
};

export default WeightSimulatorDrawer;
