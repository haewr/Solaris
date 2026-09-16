import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Sun,
  Battery,
  BatteryCharging,
  Zap,
  Home,
  ArrowRight,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { EnergySnapshot, Assessment } from '../types/solaris';

interface LiveTelemetrySimulatorProps {
  assessment: Assessment | null;
  onClose: () => void;
}

export const LiveTelemetrySimulator: React.FC<LiveTelemetrySimulatorProps> = ({
  assessment,
  onClose,
}) => {
  const estimatedNow = assessment?.forecast.estimatedNowKw || 3.8;
  const expectedTodayKwh = assessment?.forecast.predictedKwh || 21.4;

  // Simulator controls
  const [solarProductionKw, setSolarProductionKw] = useState<number>(3.65);
  const [homeConsumptionKw, setHomeConsumptionKw] = useState<number>(1.85);
  const [batterySoc, setBatterySoc] = useState<number>(78);
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState<number>(10.0);
  const [isTelemetryStale, setIsTelemetryStale] = useState<boolean>(false);
  const [staleMinutes, setStaleMinutes] = useState<number>(14);

  // Derive flows according to signed convention:
  // Net solar surplus = solarProductionKw - homeConsumptionKw
  // If surplus > 0: battery charges (negative batteryFlowKw) or grid exports (negative gridFlowKw)
  // If deficit > 0: battery discharges (positive batteryFlowKw) or grid imports (positive gridFlowKw)
  const netSurplus = solarProductionKw - homeConsumptionKw;

  let batteryFlowKw = 0;
  let gridFlowKw = 0;

  if (netSurplus >= 0) {
    if (batterySoc < 100) {
      // Charge battery up to 3.0 kW max charge rate
      batteryFlowKw = -Math.min(3.0, netSurplus);
      gridFlowKw = -(netSurplus - Math.abs(batteryFlowKw)); // export remainder
    } else {
      batteryFlowKw = 0;
      gridFlowKw = -netSurplus; // 100% export
    }
  } else {
    const deficit = Math.abs(netSurplus);
    if (batterySoc > 15) {
      batteryFlowKw = Math.min(3.5, deficit); // discharge
      gridFlowKw = deficit - batteryFlowKw; // import remainder
    } else {
      batteryFlowKw = 0;
      gridFlowKw = deficit; // 100% import
    }
  }

  // Performance ratio
  const performanceRatio = estimatedNow > 0 ? Math.round((solarProductionKw / estimatedNow) * 100) : 100;
  const actualAccumulatedToday = Math.round(expectedTodayKwh * (performanceRatio / 100) * 10) / 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" id="hardware-telemetry-modal">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-7 space-y-6 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                  Live Hardware Telemetry Engine
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  PHASE 2 PREVIEW
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Real-time inverter, battery & smart meter telemetry with signed flow conventions
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

        {/* Fundamental Data Rule Callout */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs">
            <span className="font-bold text-slate-900">Fundamental Data Rule</span>
            <p className="text-slate-600">
              Solaris strictly distinguishes <strong>EXPECTED / ESTIMATED</strong> from <strong>ACTUAL / LIVE</strong>. Solar forecast outputs are never mislabeled as live hardware telemetry.
            </p>
          </div>
        </div>

        {/* Stale Telemetry Warning Banner (if simulated) */}
        {isTelemetryStale ? (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>
                <strong>Last measured:</strong> {solarProductionKw} kW • Updated {staleMinutes} minutes ago
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
              STALE TELEMETRY
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-medium">Live hardware feed connected • Updated just now</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold uppercase tracking-wider">
              LIVE TELEMETRY
            </span>
          </div>
        )}

        {/* Live vs Expected Comparison Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Live Production
            </span>
            <div className="text-xl font-black text-emerald-600 font-['Space_Grotesk']">
              {solarProductionKw.toFixed(2)} kW
            </div>
            <p className="text-[11px] text-slate-400">From Inverter Gateway</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              Estimated Now
            </span>
            <div className="text-xl font-black text-indigo-600 font-['Space_Grotesk']">
              {estimatedNow.toFixed(2)} kW
            </div>
            <p className="text-[11px] text-slate-400">From pvlib Physical Model</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
              System Performance
            </span>
            <div className="text-xl font-black text-slate-900 font-['Space_Grotesk']">
              {performanceRatio}%
            </div>
            <p className="text-[11px] text-emerald-600 font-semibold">
              {performanceRatio >= 90 ? 'Performing normally' : 'Minor shade / cloud'}
            </p>
          </div>
        </div>

        {/* Interactive Energy Flow Diagram */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Real-time Energy Flow Network</span>
            <span className="text-[11px] text-slate-400">Standard Sign Conventions</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {/* Node 1: Solar */}
            <div className="p-3 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-1">
              <Sun className="w-5 h-5 mx-auto text-amber-500 animate-spin-slow" />
              <span className="text-[11px] font-bold text-slate-700 block">Solar Array</span>
              <strong className="text-sm font-black text-amber-600 block">
                {solarProductionKw.toFixed(2)} kW
              </strong>
              <span className="text-[10px] text-amber-700 font-medium">Generating</span>
            </div>

            {/* Node 2: Home */}
            <div className="p-3 rounded-2xl bg-white border border-sky-200 shadow-2xs space-y-1">
              <Home className="w-5 h-5 mx-auto text-sky-500" />
              <span className="text-[11px] font-bold text-slate-700 block">Home Load</span>
              <strong className="text-sm font-black text-sky-600 block">
                {homeConsumptionKw.toFixed(2)} kW
              </strong>
              <span className="text-[10px] text-sky-700 font-medium">Consuming</span>
            </div>

            {/* Node 3: Battery */}
            <div className="p-3 rounded-2xl bg-white border border-emerald-200 shadow-2xs space-y-1">
              {batteryFlowKw < 0 ? (
                <BatteryCharging className="w-5 h-5 mx-auto text-emerald-500" />
              ) : (
                <Battery className="w-5 h-5 mx-auto text-emerald-500" />
              )}
              <span className="text-[11px] font-bold text-slate-700 block">
                Battery ({batterySoc}%)
              </span>
              <strong className="text-sm font-black text-emerald-600 block">
                {batteryFlowKw.toFixed(2)} kW
              </strong>
              <span className="text-[10px] text-emerald-700 font-medium">
                {batteryFlowKw < 0 ? 'Charging (-)' : batteryFlowKw > 0 ? 'Discharging (+)' : 'Idle'}
              </span>
            </div>

            {/* Node 4: Grid */}
            <div className="p-3 rounded-2xl bg-white border border-indigo-200 shadow-2xs space-y-1">
              <Zap className="w-5 h-5 mx-auto text-indigo-500" />
              <span className="text-[11px] font-bold text-slate-700 block">Grid Link</span>
              <strong className="text-sm font-black text-indigo-600 block">
                {gridFlowKw.toFixed(2)} kW
              </strong>
              <span className="text-[10px] text-indigo-700 font-medium">
                {gridFlowKw < 0 ? 'Exporting (-)' : gridFlowKw > 0 ? 'Importing (+)' : 'Balanced'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Simulator Tuning Controls */}
        <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              Interactive Telemetry Test Sliders
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                checked={isTelemetryStale}
                onChange={(e) => setIsTelemetryStale(e.target.checked)}
                className="accent-indigo-600"
              />
              <span>Simulate Stale Gateway</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                <span>Inverter Solar Output:</span>
                <strong className="text-slate-900 font-bold">{solarProductionKw.toFixed(2)} kW</strong>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.1"
                value={solarProductionKw}
                onChange={(e) => setSolarProductionKw(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                <span>Household Consumption:</span>
                <strong className="text-slate-900 font-bold">{homeConsumptionKw.toFixed(2)} kW</strong>
              </div>
              <input
                type="range"
                min="0.2"
                max="6"
                step="0.1"
                value={homeConsumptionKw}
                onChange={(e) => setHomeConsumptionKw(parseFloat(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Close */}
        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
