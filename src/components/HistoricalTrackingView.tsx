import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Activity,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Sun,
  CloudSun,
  ShieldCheck,
  Zap,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import { Assessment, HistoricalComparisonRecord } from '../types/solaris';
import {
  generateHistoricalRecords,
  calculateSummaryHistoricalMetrics,
} from '../services/historicalTrackingService';

interface HistoricalTrackingViewProps {
  assessment: Assessment;
}

export const HistoricalTrackingView: React.FC<HistoricalTrackingViewProps> = ({ assessment }) => {
  const [daysCount, setDaysCount] = useState<number>(30);

  const historicalRecords = useMemo(() => {
    return generateHistoricalRecords(assessment.system, daysCount);
  }, [assessment.system, daysCount]);

  const summary = useMemo(() => {
    return calculateSummaryHistoricalMetrics(historicalRecords);
  }, [historicalRecords]);

  return (
    <div className="w-full space-y-6" id="historical-tracking-view">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 uppercase">
                PHASE 4 HISTORICAL DRIFT & AUDIT
              </span>
              <span className="text-xs text-slate-500 font-medium">Actual vs pvlib Expected Analysis</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-['Space_Grotesk']">
              Historical Performance & Degradation Tracking
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Compare actual measured inverter generation against pvlib physical estimates. Identify string soiling, partial shading, and thermal efficiency losses over time.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setDaysCount(7)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                daysCount === 7 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDaysCount(14)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                daysCount === 14 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setDaysCount(30)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                daysCount === 30 ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Days
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Mean Performance Ratio */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Mean Performance Ratio
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-['Space_Grotesk']">
              {summary.overallPr}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Actual vs expected physical energy ratio
          </p>
        </div>

        {/* Metric 2: Total Actual Generation */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Actual Measured Yield
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-['Space_Grotesk']">
              {summary.totalActualKwh}
            </span>
            <span className="text-xs font-bold text-slate-500">kWh</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Across past {daysCount} days period
          </p>
        </div>

        {/* Metric 3: Physical Forecast Model */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Expected Physical Target
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-['Space_Grotesk']">
              {summary.totalExpectedKwh}
            </span>
            <span className="text-xs font-bold text-slate-500">kWh</span>
          </div>
          <p className="text-[11px] text-slate-500">
            pvlib NOCT & POA transposed target
          </p>
        </div>

        {/* Metric 4: Weather Conditions */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Solar Weather Split
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-['Space_Grotesk']">
              {summary.sunnyDays} / {daysCount}
            </span>
            <span className="text-xs font-bold text-slate-500">Sunny</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {summary.cloudyDays} overcast or rainy days
          </p>
        </div>
      </div>

      {/* Actual vs Expected Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-['Space_Grotesk']">
              Daily Generation: Actual Inverter Output vs Expected Forecast
            </h3>
            <p className="text-xs text-slate-500">
              Gold bar = Expected physical model target; Emerald bar = Actual logged inverter yield.
            </p>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={historicalRecords} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis
                unit=" kWh"
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as HistoricalComparisonRecord;
                    return (
                      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-sm min-w-[220px]">
                        <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex justify-between">
                          <span>{data.date}</span>
                          <span className="text-emerald-400 font-black">PR: {data.performanceRatio}%</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Actual Output:</span>
                          <strong className="text-emerald-400 font-bold">{data.actualKwh} kWh</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Expected Target:</span>
                          <strong className="text-amber-400 font-bold">{data.expectedKwh} kWh</strong>
                        </div>
                        <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                          {data.weatherCondition} • {data.varianceNote}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="expectedKwh" name="Expected Forecast (kWh)" fill="#f59e0b" radius={[4, 4, 0, 0]} opacity={0.6} />
              <Bar dataKey="actualKwh" name="Actual Inverter Yield (kWh)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
