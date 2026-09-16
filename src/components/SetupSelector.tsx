import React from 'react';
import { Cpu, Home, Wand2, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { BuildingFootprint } from '../types/solaris';

interface SetupSelectorProps {
  selectedBuilding: BuildingFootprint | null;
  onSelectPath: (path: 'existing_system' | 'map_assisted' | 'auto') => void;
  onChooseDifferentProperty: () => void;
}

export const SetupSelector: React.FC<SetupSelectorProps> = ({
  selectedBuilding,
  onSelectPath,
  onChooseDifferentProperty,
}) => {
  return (
    <div className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6" id="solaris-setup-selector">
      {/* Property Confirmation Card */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Selected Property
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
              {selectedBuilding?.source.replace('_', ' ').toUpperCase() || 'OPEN FOOTPRINT'}
            </span>
          </div>
          <p className="text-base font-bold text-slate-900 line-clamp-1">
            {selectedBuilding?.name || selectedBuilding?.address || 'Target Building Location'}
          </p>
          <p className="text-xs text-slate-500">
            Total footprint area: <strong className="text-slate-800 font-semibold">{selectedBuilding?.areaM2 || 180} m²</strong> • Confidence:{' '}
            <strong className="text-emerald-700 font-semibold">{Math.round((selectedBuilding?.confidence || 0.9) * 100)}%</strong>
          </p>
        </div>

        <button
          onClick={onChooseDifferentProperty}
          className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all border border-slate-200 shadow-2xs shrink-0"
        >
          Choose another building
        </button>
      </div>

      {/* Three First-Class Paths Prompt */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-['Space_Grotesk'] mb-1">
          How would you like to set up your solar property?
        </h2>
        <p className="text-xs text-slate-500">
          Solaris supports all three paths without requiring an account or proprietary subscriptions.
        </p>
      </div>

      {/* Path Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Path 1: Existing System */}
        <button
          id="btn-path-existing"
          onClick={() => onSelectPath('existing_system')}
          className="group relative text-left p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              I already know my system
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              For existing solar owners. Enter system kWp or panel count to forecast expected generation.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 pt-1">
            <span>Enter specs</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Path 2: Map-assisted roof */}
        <button
          id="btn-path-map-assisted"
          onClick={() => onSelectPath('map_assisted')}
          className="group relative text-left p-5 rounded-2xl bg-white hover:bg-indigo-50/30 border-2 border-indigo-600 transition-all flex flex-col justify-between space-y-4 shadow-md shadow-indigo-100"
        >
          <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wide shadow-xs">
            Recommended
          </div>
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
              <Home className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Estimate using my roof
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Visually select usable roof area, compass direction, and roof slope with intuitive selectors.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 pt-1">
            <span>Setup roof</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Path 3: Automatic analysis */}
        <button
          id="btn-path-auto"
          onClick={() => onSelectPath('auto')}
          className="group relative text-left p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
              <Wand2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              Automatic analysis
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Instant calculation using open building geometry and smart regional tropical defaults.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 pt-1">
            <span>Instant estimate</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
};
