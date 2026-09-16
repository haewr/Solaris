import React from 'react';
import { X, HelpCircle, ShieldCheck, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SolarMathCalculation, NasaPowerClimatologyData, RoofDimensions } from '../../types/nativeSolaris';

interface WhyThisEstimateModalProps {
  math: SolarMathCalculation;
  nasaData: NasaPowerClimatologyData;
  roof: RoofDimensions;
  onClose: () => void;
}

export const WhyThisEstimateModal: React.FC<WhyThisEstimateModalProps> = ({
  math,
  nasaData,
  roof,
  onClose,
}) => {
  const { deratingFactors, confidenceInterval } = math;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white text-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Why this estimate?</h3>
              <p className="text-[11px] text-slate-500 font-medium">Mathematical derivation & validation citations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all"
            aria-label="Close why this estimate modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Core Formula Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-indigo-300 uppercase">Core Physical Formula</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full font-mono">Standard Photovoltaic Model</span>
            </div>
            <div className="text-xl font-mono font-bold text-amber-300 text-center py-1">
              E = A × r × H × PR
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed text-center">
              Where <strong>E</strong> is daily energy yield (kWh), <strong>A</strong> is roof area, <strong>r</strong> is module efficiency, <strong>H</strong> is real solar irradiance, and <strong>PR</strong> is performance ratio.
            </p>
          </div>

          {/* Formula Variable Breakdown */}
          <div className="space-y-2.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Variables Applied to Your Home</h4>
            
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div>
                  <strong className="text-slate-800 font-semibold block">A — Usable Roof Area: {math.areaM2} m²</strong>
                  <span className="text-[11px] text-slate-500">
                    Calculated from your roof inputs ({roof.widthMeters}m × {roof.lengthMeters}m), discounting setbacks and roof pitch.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div>
                  <strong className="text-slate-800 font-semibold block">r — Module Efficiency: {(math.panelEfficiencyRatio * 100).toFixed(1)}%</strong>
                  <span className="text-[11px] text-slate-500">
                    Standard rated efficiency for Tier-1 monocrystalline PERC/TOPCon silicon modules under STC (1,000 W/m²).
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-indigo-900 font-bold block">H — Real Solar Irradiance: {math.solarIrradianceDailyKwhM2} kWh/m²/day</strong>
                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded text-[9px] font-bold">REAL SATELLITE</span>
                  </div>
                  <span className="text-[11px] text-indigo-800 leading-relaxed block mt-0.5">
                    Fetched directly from NASA POWER Climatology (MERRA-2/SYN1DEG satellite observation) for Dumaguete City coordinates ({nasaData.queryCoordinates.lat.toFixed(3)}°N, {nasaData.queryCoordinates.lng.toFixed(3)}°E).
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between">
                <div>
                  <strong className="text-slate-800 font-semibold block">PR — Performance Ratio: {(math.performanceRatio * 100).toFixed(1)}%</strong>
                  <span className="text-[11px] text-slate-500 block mb-1.5">
                    System efficiency factor accounting for real-world environmental and electrical losses:
                  </span>
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 pl-1 border-l-2 border-slate-300">
                    <div>• Inverter Conversion: {(deratingFactors.inverterEfficiency * 100).toFixed(1)}%</div>
                    <div>• Wiring & Mismatch: {(deratingFactors.wiringLosses * 100).toFixed(1)}%</div>
                    <div>• Soiling & Dust: {(deratingFactors.soilingAndDust * 100).toFixed(1)}%</div>
                    <div>• Tropical Temp Derating: {(deratingFactors.temperatureDerating * 100).toFixed(1)}% (at avg {nasaData.annualAvgTempC}°C)</div>
                    <div>• Tilt/Azimuth Alignment: {(deratingFactors.orientationTiltMismatch * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Confidence & Margin-of-Error Disclosure */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <h5 className="font-bold text-xs text-amber-900">Empirical Confidence Interval: ±{confidenceInterval.percentageMargin}%</h5>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Based on empirical ground-validation literature, satellite estimates in tropical coastal climates have an expected uncertainty range:
            </p>
            <div className="flex items-center justify-around bg-white/80 p-2.5 rounded-xl border border-amber-200/80 font-mono text-xs">
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">Conservative (-10.4%)</span>
                <strong className="text-amber-800 font-bold">{confidenceInterval.lowAnnualKwh.toLocaleString()} kWh/yr</strong>
              </div>
              <div className="text-slate-300 text-lg">|</div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">Nominal Estimate</span>
                <strong className="text-indigo-700 font-bold">{math.annualEnergyKwh.toLocaleString()} kWh/yr</strong>
              </div>
              <div className="text-slate-300 text-lg">|</div>
              <div className="text-center">
                <span className="text-[10px] text-slate-500 block">Favorable (+10.4%)</span>
                <strong className="text-emerald-700 font-bold">{confidenceInterval.highAnnualKwh.toLocaleString()} kWh/yr</strong>
              </div>
            </div>
            
            <div className="pt-1 flex items-start gap-1.5 text-[10px] text-amber-900/80">
              <BookOpen className="w-3.5 h-3.5 shrink-0 text-amber-700 mt-0.5" />
              <span>
                <strong>Cited Literature:</strong> {confidenceInterval.literatureCitation}
              </span>
            </div>
          </div>
        </div>

        {/* Footer close */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs active:scale-[0.98] transition-all"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
