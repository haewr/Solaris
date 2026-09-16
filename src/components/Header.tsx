import React from 'react';
import { Sun, ShieldCheck, Activity, BarChart2, Bookmark, RotateCcw, Zap, Smartphone, Monitor } from 'lucide-react';
import { SavedRoofProfile } from '../types/solaris';

interface HeaderProps {
  savedProfiles: SavedRoofProfile[];
  onSelectProfile: (profile: SavedRoofProfile) => void;
  onOpenTelemetry: () => void;
  onOpenObservability: () => void;
  onReset: () => void;
  activeProfileId?: string;
  hasAssessment: boolean;
  activeFormat?: 'phone' | 'tablet' | 'desktop';
  onChangeFormat?: (format: 'phone' | 'tablet' | 'desktop') => void;
}

export const Header: React.FC<HeaderProps> = ({
  savedProfiles,
  onSelectProfile,
  onOpenTelemetry,
  onOpenObservability,
  onReset,
  activeProfileId,
  hasAssessment,
  activeFormat = 'phone',
  onChangeFormat,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none" onClick={onReset} id="solaris-brand-logo">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-600 shadow-md shadow-indigo-200 flex items-center justify-center text-white transition-transform hover:scale-105 shrink-0">
            <Sun className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-['Space_Grotesk']">
                SOLARIS
              </h1>
              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
              Open Solar Potential & Generation
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Format Switcher */}
          {onChangeFormat && (
            <button
              onClick={() => onChangeFormat(activeFormat === 'phone' ? 'desktop' : 'phone')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
              title={activeFormat === 'phone' ? 'Switch to Full Screen View' : 'Switch to Phone View'}
            >
              {activeFormat === 'phone' ? (
                <>
                  <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden xs:inline text-[11px]">Full</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden xs:inline text-[11px]">Phone</span>
                </>
              )}
            </button>
          )}

          {/* Saved Profiles Switcher */}
          {savedProfiles.length > 0 && (
            <div className="relative">
              <select
                id="saved-profiles-dropdown"
                value={activeProfileId || ''}
                onChange={(e) => {
                  const prof = savedProfiles.find((p) => p.id === e.target.value);
                  if (prof) onSelectProfile(prof);
                }}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[110px] sm:max-w-[180px] truncate transition-colors shadow-xs"
              >
                <option value="" disabled>
                  Saved ({savedProfiles.length})
                </option>
                {savedProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.systemCapacityKwp} kWp)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Phase 2 Hardware Preview Button */}
          <button
            id="btn-telemetry-preview"
            onClick={onOpenTelemetry}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold transition-all shadow-xs"
            title="Preview Live Hardware Telemetry Engine"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Hardware</span>
            <span className="md:hidden">Live</span>
          </button>

          {/* Observability & Cost Metric Button */}
          <button
            id="btn-observability"
            onClick={onOpenObservability}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-all shadow-xs"
            title="System Observability, API costs & Cache stats"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Metrics</span>
          </button>

          {/* Reset / New Assessment */}
          {hasAssessment && (
            <button
              id="btn-new-assessment"
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-100"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
