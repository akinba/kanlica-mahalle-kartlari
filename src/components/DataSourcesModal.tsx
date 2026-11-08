import React, { useEffect } from 'react';
import {
  X,
  Database,
  ExternalLink,
  ShieldCheck,
  Layers,
  FileText,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { OFFICIAL_DATA_SOURCES } from '../data/dataSources';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-sources-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="data-sources-title"
                className="text-base sm:text-lg font-bold text-slate-900"
              >
                Veri Kaynakları & Metodoloji
              </h2>
              <p className="text-xs text-slate-500">
                Kandıra Mahalle Kartları & H3 Mekansal Karar Destek Sistemi Veri Dayanakları
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Methodology Card */}
          <div className="p-4 rounded-xl bg-sky-50/80 border border-sky-200/80 flex items-start gap-3">
            <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-700">
              <div className="font-bold text-sky-900 text-xs">
                Mekansal Modelleme ve Çok Kriterli İndeksleme Metodolojisi
              </div>
              <p className="leading-relaxed text-[11.5px] text-slate-600">
                Bu platform; <strong>TÜİK ADNKS</strong> mahalle nüfus istatistiklerini,{' '}
                <strong>HDX Kontur Population 400m H3 Resolution 8</strong> mikro altıgen ızgarasıyla
                birleştirerek mekansallaştırır. İdari sınırlar, sağlık ve eğitim erişim süreleri{' '}
                <strong>OpenStreetMap</strong> ve kamu kurumları açık verileriyle kalibre edilmiştir.
              </p>
            </div>
          </div>

          {/* Data Sources Grid */}
          <div className="space-y-3">
            {OFFICIAL_DATA_SOURCES.map((src) => (
              <div
                key={src.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 hover:shadow-xs transition flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{src.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {src.badge}
                    </span>
                  </div>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200/80 transition"
                  >
                    <span>Resmi Kaynağı Aç</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="font-semibold text-slate-800 text-[11.5px]">
                  {src.title}
                </div>

                <p className="text-slate-600 text-[11px] leading-relaxed">
                  {src.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kurum: <strong>{src.provider}</strong></span>
                  </div>
                  <div className="text-slate-400 font-mono">
                    {src.updateFrequency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tüm veriler açık veri lisansları (CC BY 4.0 / ODbL / Resmi İstatistik) ile uyumludur.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
