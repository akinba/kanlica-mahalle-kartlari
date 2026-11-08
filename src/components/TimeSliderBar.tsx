import React, { useEffect, useState } from 'react';
import { Calendar, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { SurveyYear } from '../types/kandira';

interface TimeSliderBarProps {
  selectedYear: SurveyYear;
  onChangeYear: (year: SurveyYear) => void;
}

const SURVEY_YEARS: SurveyYear[] = [2021, 2022, 2023, 2024, 2025];

const YEAR_CAPTIONS: Record<SurveyYear, { badge: string; desc: string }> = {
  2021: {
    badge: 'Baz Yılı',
    desc: 'ADNKS temel referans yılı ve arazi örtüsü başlangıç envanteri',
  },
  2022: {
    badge: 'Kıyı Hareketliliği',
    desc: 'Pandemi sonrası ikinci konut ve kıyı yerleşim talebinde ilk ivme',
  },
  2023: {
    badge: 'Demografik Dönüşüm',
    desc: 'İç kesimlerde yaşlanma oranı artışı ve kıyı aksında yeni ruhsatlar',
  },
  2024: {
    badge: 'Altyapı & Erişim',
    desc: 'Mobil sağlık rotaları, fiber altyapı ve taşımalı eğitim iyileştirmeleri',
  },
  2025: {
    badge: 'Güncel Projeksiyon',
    desc: 'Güncel 5 yıllık kümülatif değişim ve H3 kırılganlık sentezi',
  },
};

export const TimeSliderBar: React.FC<TimeSliderBarProps> = ({
  selectedYear,
  onChangeYear,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      const currentIndex = SURVEY_YEARS.indexOf(selectedYear);
      const nextIndex = (currentIndex + 1) % SURVEY_YEARS.length;
      onChangeYear(SURVEY_YEARS[nextIndex]);
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isPlaying, selectedYear, onChangeYear]);

  const currentIdx = SURVEY_YEARS.indexOf(selectedYear);
  const progressPct = (currentIdx / (SURVEY_YEARS.length - 1)) * 100;

  const handleStep = (delta: number) => {
    setIsPlaying(false);
    const nextIdx = Math.min(
      SURVEY_YEARS.length - 1,
      Math.max(0, currentIdx + delta)
    );
    onChangeYear(SURVEY_YEARS[nextIdx]);
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-sm px-4 py-3 transition-all">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Title & Play Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              isPlaying
                ? 'bg-amber-600 text-white hover:bg-amber-700 ring-2 ring-amber-200'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
            title="5 yıllık zaman serisini otomatik oynat/durdur"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Durdur</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>5 Yıllık Değişimi Oynat</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              disabled={currentIdx === 0}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition"
              title="Önceki Yıl"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsPlaying(false);
                onChangeYear(2025);
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-white transition flex items-center gap-1"
              title="2025 Güncel Yıla Dön"
            >
              <RotateCcw className="w-3 h-3" />
              <span>2025</span>
            </button>
            <button
              type="button"
              onClick={() => handleStep(1)}
              disabled={currentIdx === SURVEY_YEARS.length - 1}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-35 disabled:hover:bg-transparent transition"
              title="Sonraki Yıl"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
            <Calendar className="w-4 h-4 text-teal-700 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 font-mono">
                  {selectedYear}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  {YEAR_CAPTIONS[selectedYear].badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">
                {YEAR_CAPTIONS[selectedYear].desc}
              </p>
            </div>
          </div>
        </div>

        {/* Right: 5-Year Interactive Stepper */}
        <div className="flex-1 max-w-xl">
          <div className="relative pt-1 pb-0.5">
            {/* Track Line */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-600 via-emerald-500 to-amber-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Year Nodes */}
            <div className="relative flex items-center justify-between">
              {SURVEY_YEARS.map((year) => {
                const isSelected = year === selectedYear;
                const isPast = year < selectedYear;
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      onChangeYear(year);
                    }}
                    className={`group relative flex flex-col items-center focus:outline-none px-2 py-1 rounded-xl transition-all ${
                      isSelected ? 'scale-105' : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold border-2 transition-all shadow-sm ${
                        isSelected
                          ? 'bg-slate-900 text-white border-amber-400 ring-4 ring-amber-400/20'
                          : isPast
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-300 group-hover:border-slate-400'
                      }`}
                    >
                      {String(year).slice(2)}
                    </div>
                    <span
                      className={`mt-1 text-xs font-mono tracking-tight transition-colors ${
                        isSelected
                          ? 'font-bold text-slate-900'
                          : 'font-medium text-slate-500 group-hover:text-slate-800'
                      }`}
                    >
                      {year}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rightmost badge: Δ 2021-2025 */}
        <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>2021–2025 Zaman Serisi Aktif</span>
        </div>
      </div>
    </div>
  );
};

export default TimeSliderBar;
