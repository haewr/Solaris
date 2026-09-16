import React, { useState, useMemo } from 'react';
import {
  Battery,
  BatteryCharging,
  Zap,
  Home,
  Shield,
  Clock,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { Assessment, BatterySystemConfig, BatteryDispatchStrategy } from '../types/solaris';
import { simulateBatteryDispatch, defaultBatteryConfig } from '../services/batteryDispatchService';

interface BatteryStorageSimulatorProps {
  assessment: Assessment;
}

export const BatteryStorageSimulator: React.FC<BatteryStorageSimulatorProps> = ({ assessment }) => {
  const [config, setConfig] = useState<BatterySystemConfig>({
    ...defaultBatteryConfig,
    capacityKwh: 10.0,
    maxPowerKw: 5.0,
  });

  const [loadMultiplier, setLoadMultiplier] = useState<number>(1.0);

  const simulation = useMemo(() => {
    return simulateBatteryDispatch(assessment.forecast.hourly, config, loadMultiplier);
  }, [assessment.forecast.hourly, config, loadMultiplier]);

  const presetBatteries = [
    { name: 'Compact Home (5 kWh)', capacity: 5.0, power: 3.0, desc: 'Nighttime lights & essential loads' },
    { name: 'Standard (10 kWh)', capacity: 10.0, power: 5.0, desc: 'Full overnight load coverage' },
    { name: 'High-Capacity (13.5 kWh)', capacity: 13.5, power: 7.0, desc: 'Tesla Powerwall / LFP equivalent' },
    { name: 'Resilience Pro (20 kWh)', capacity: 20.0, power: 10.0, desc: 'Whole-home multi-day backup' },
  ];

  return (
    <div className="w-full space-y-6" id="battery-storage-simulator">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                PHASE 3 INTELLIGENT DISPATCH
              </span>
              <span className="text-xs text-slate-500 font-medium">BESS Simulation Engine</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-['Space_Grotesk']">
              Battery Storage & Energy Dispatch Simulator
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Model lithium battery charging cycles, grid peak shaving, and calculate your true off-grid solar self-reliance percentage with real-time signed energy power flows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 accent-indigo-600"
              />
              <span>Enable Battery Simulation</span>
            </label>
          </div>
        </div>

        {/* Battery Presets */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          {presetBatteries.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                setConfig({
                  ...config,
                  enabled: true,
                  capacityKwh: preset.capacity,
                  maxPowerKw: preset.power,
                })
              }
              className={`p-3.5 rounded-2xl text-left border transition-all ${
                config.enabled && config.capacityKwh === preset.capacity
                  ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <strong className="text-xs font-bold text-slate-900">{preset.name}</strong>
                <span className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {preset.capacity} kWh
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* KPI Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Metric 1: Solar Independence */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Solar Self-Reliance
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-['Space_Grotesk']">
              {simulation.solarIndependencePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Of total household load covered by solar + battery
          </p>
        </div>

        {/* Metric 2: Self Consumption Rate */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Self-Consumption Rate
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-['Space_Grotesk']">
              {simulation.selfConsumptionRatePercent}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Solar energy utilized on-site vs exported to grid
          </p>
        </div>

        {/* Metric 3: Critical Backup Hours */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Blackout Resilience
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-['Space_Grotesk']">
              ~{simulation.backupHoursCriticalLoad} hrs
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Continuous runtime for critical loads (fridge, lights, WiFi)
          </p>
        </div>

        {/* Metric 4: Daily Energy Flow */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Battery Throughput
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-['Space_Grotesk']">
              {simulation.batteryDischargedToLoadKwh}
            </span>
            <span className="text-xs font-bold text-slate-500">kWh/day</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {simulation.dailyEquivalentCycles} full equivalent cycles daily
          </p>
        </div>
      </div>

      {/* Main 24-Hour Interactive Dispatch Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-['Space_Grotesk']">
              24-Hour Battery Charge & Load Dispatch Curve
            </h3>
            <p className="text-xs text-slate-500">
              Live simulation of solar generation, battery charging/discharging, household consumption, and grid import/export.
            </p>
          </div>

          {/* Strategy Selector */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setConfig({ ...config, strategy: 'self_consumption' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                config.strategy === 'self_consumption'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Self-Consumption
            </button>
            <button
              onClick={() => setConfig({ ...config, strategy: 'tou_arbitrage' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                config.strategy === 'tou_arbitrage'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              TOU Arbitrage
            </button>
            <button
              onClick={() => setConfig({ ...config, strategy: 'backup_resilience' })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                config.strategy === 'backup_resilience'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Resilience Reserve
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={simulation.hourly} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="timeStr" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis
                yAxisId="power"
                unit=" kW"
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <YAxis
                yAxisId="soc"
                orientation="right"
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#10b981' }}
                stroke="#10b981"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-sm min-w-[200px]">
                        <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex justify-between items-center">
                          <span>{label}</span>
                          <span className="text-emerald-400 font-black">SoC: {data.batterySocPercent}%</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Solar Output:</span>
                          <strong className="text-amber-400 font-bold">{data.solarGenerationKw} kW</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Home Consumption:</span>
                          <strong className="text-sky-400 font-bold">{data.homeLoadKw} kW</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Battery Flow:</span>
                          <strong className={data.batteryFlowKw < 0 ? 'text-emerald-400 font-bold' : 'text-emerald-300 font-bold'}>
                            {data.batteryFlowKw < 0 ? `Charging (${Math.abs(data.batteryFlowKw)} kW)` : data.batteryFlowKw > 0 ? `Discharging (${data.batteryFlowKw} kW)` : 'Idle'}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Grid Flow:</span>
                          <strong className={data.gridFlowKw > 0 ? 'text-rose-400 font-bold' : data.gridFlowKw < 0 ? 'text-indigo-400 font-bold' : 'text-slate-400'}>
                            {data.gridFlowKw > 0 ? `Import (+${data.gridFlowKw} kW)` : data.gridFlowKw < 0 ? `Export (${data.gridFlowKw} kW)` : 'Balanced'}
                          </strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Area
                yAxisId="power"
                type="monotone"
                dataKey="solarGenerationKw"
                name="Solar Output (kW)"
                stroke="#f59e0b"
                fill="url(#solarGrad)"
                strokeWidth={2}
              />
              <Area
                yAxisId="power"
                type="monotone"
                dataKey="homeLoadKw"
                name="Home Consumption (kW)"
                stroke="#0284c7"
                fill="url(#loadGrad)"
                strokeWidth={2}
              />
              <Line
                yAxisId="soc"
                type="monotone"
                dataKey="batterySocPercent"
                name="Battery SoC (%)"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Custom Tuning Controls */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Fine-Tune Battery Parameters
            </span>
            <span className="text-[11px] text-slate-500 font-medium">LFP (Lithium Iron Phosphate) Chem</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Usable Capacity:</span>
                <strong className="text-indigo-600 font-bold">{config.capacityKwh} kWh</strong>
              </div>
              <input
                type="range"
                min="2.5"
                max="30.0"
                step="0.5"
                value={config.capacityKwh}
                onChange={(e) => setConfig({ ...config, capacityKwh: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Inverter Max Power:</span>
                <strong className="text-indigo-600 font-bold">{config.maxPowerKw} kW</strong>
              </div>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.5"
                value={config.maxPowerKw}
                onChange={(e) => setConfig({ ...config, maxPowerKw: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Household Load Scale:</span>
                <strong className="text-indigo-600 font-bold">{(loadMultiplier * 100).toFixed(0)}% ({Math.round(simulation.totalHomeConsumedKwh)} kWh/day)</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={loadMultiplier}
                onChange={(e) => setLoadMultiplier(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
