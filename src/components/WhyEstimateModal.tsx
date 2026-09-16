import React from 'react';
import { X, HelpCircle, CheckCircle2, ShieldCheck, Sun, Layers, Thermometer, Cpu, Database } from 'lucide-react';
import { Assessment } from '../types/solaris';

interface WhyEstimateModalProps {
  assessment: Assessment;
  onClose: () => void;
}

export const WhyEstimateModal: React.FC<WhyEstimateModalProps> = ({ assessment, onClose }) => {
  const { forecast, system, roof, building } = assessment;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" id="why-estimate-modal">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-7 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                Why this estimate?
              </h3>
              <p className="text-xs text-slate-500">
                Transparent physical solar modeling pipeline (pvlib physics engine)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Explainability Summary List */}
        <div className="space-y-3 text-xs sm:text-sm text-slate-700">
          <p className="text-xs text-slate-500 font-medium">
            Solaris computed your forecast using physical equations rather than crude static heuristics:
          </p>

          <div className="space-y-3">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                1
              </div>
              <div className="space-y-0.5">
                <strong className="text-slate-900 block text-xs sm:text-sm">Building Geometry & Usable Roof Area</strong>
                <p className="text-xs text-slate-500">
                  {roof.usableAreaM2} m² usable area derived from {building?.areaM2 || roof.usableAreaM2} m² footprint (Source:{' '}
                  <span className="text-slate-800 font-semibold">{roof.geometrySource}</span>). Supports ~{system.panelCount} modern monocrystalline panels.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                2
              </div>
              <div className="space-y-0.5">
                <strong className="text-slate-900 block text-xs sm:text-sm">Plane-of-Array (POA) Transposition</strong>
                <p className="text-xs text-slate-500">
                  Transposed solar radiation using roof tilt of <strong className="text-slate-800 font-semibold">{roof.tiltDeg}°</strong> and azimuth of{' '}
                  <strong className="text-slate-800 font-semibold">{roof.azimuthDeg}° ({roof.orientationCategory})</strong> with Hay-Davies diffuse sky model.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                3
              </div>
              <div className="space-y-0.5">
                <strong className="text-slate-900 block text-xs sm:text-sm">NOCT Module Thermal Derate Model</strong>
                <p className="text-xs text-slate-500">
                  Calculated cell operating temperature based on ambient temperature and wind cooling. Applied standard temperature coefficient of{' '}
                  <strong className="text-slate-800 font-semibold">-0.35%/°C</strong> above 25°C STC.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                4
              </div>
              <div className="space-y-0.5">
                <strong className="text-slate-900 block text-xs sm:text-sm">System Losses & Inverter Conversion</strong>
                <p className="text-xs text-slate-500">
                  Accounted for realistic combined losses totaling <strong className="text-slate-800 font-semibold">{system.systemLossesPercent}%</strong> (soiling, shading, wiring resistance, and inverter clipping at {system.inverterCapacityKw} kW AC).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Losses Breakdown Table */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
            System Loss Parameter Breakdown
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block text-[10px]">Dust & Soiling</span>
              <strong className="text-slate-900 font-bold">2.5%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block text-[10px]">Near Shading</span>
              <strong className="text-slate-900 font-bold">3.0%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block text-[10px]">DC/AC Wiring</span>
              <strong className="text-slate-900 font-bold">2.0%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block text-[10px]">Module Mismatch</span>
              <strong className="text-slate-900 font-bold">1.5%</strong>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 block text-[10px]">Inverter Efficiency</span>
              <strong className="text-slate-900 font-bold">2.5%</strong>
            </div>
            <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-200 shadow-2xs">
              <span className="text-indigo-700 block text-[10px] font-semibold">Total System Derate</span>
              <strong className="text-indigo-700 font-black">{system.systemLossesPercent}%</strong>
            </div>
          </div>
        </div>

        {/* Provenance & Cost Note */}
        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero paid API dependencies • Open Data Architecture</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-100"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
