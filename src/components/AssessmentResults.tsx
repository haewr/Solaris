import React, { useState } from 'react';
import {
  Sun,
  Zap,
  TrendingUp,
  HelpCircle,
  Sliders,
  Bookmark,
  Share2,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Info,
  Clock,
  CloudSun,
  Activity,
  DollarSign,
  Leaf,
  Battery,
  FileText,
  Radio,
  Cpu,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import confetti from 'canvas-confetti';
import { Assessment } from '../types/solaris';
import { BatteryStorageSimulator } from './BatteryStorageSimulator';
import { FinancialRoiCalculator } from './FinancialRoiCalculator';
import { HistoricalTrackingView } from './HistoricalTrackingView';

interface AssessmentResultsProps {
  assessment: Assessment;
  onOpenWhyModal: () => void;
  onOpenAdjustModal: () => void;
  onOpenHardwareModal: () => void;
  onOpenAuditReportModal: () => void;
  onSaveProfile: () => void;
  isSaved: boolean;
}

export type AssessmentModuleView = 'forecast' | 'battery' | 'financials' | 'historical';

export const AssessmentResults: React.FC<AssessmentResultsProps> = ({
  assessment,
  onOpenWhyModal,
  onOpenAdjustModal,
  onOpenHardwareModal,
  onOpenAuditReportModal,
  onSaveProfile,
  isSaved,
}) => {
  const { forecast, system, roof, address, setupMethod } = assessment;
  const [activeModule, setActiveModule] = useState<AssessmentModuleView>('forecast');
  const [activeTab, setActiveTab] = useState<'hourly' | 'weekly' | 'monthly'>('hourly');

  const handleSaveClick = () => {
    onSaveProfile();
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#f59e0b', '#10b981', '#38bdf8', '#fbbf24'],
    });
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(assessment, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `solaris_assessment_${assessment.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="w-full space-y-6" id="solaris-assessment-results">
      {/* Property & Provenance Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              {setupMethod.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-500">
              Model: <strong className="text-slate-800 font-semibold">{forecast.modelVersion}</strong>
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {forecast.confidence.toUpperCase()} CONFIDENCE
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-1">{address}</h2>
          <p className="text-xs text-slate-500">
            Roof Tilt: <strong className="text-slate-800 font-semibold">{roof.tiltDeg}°</strong> • Facing:{' '}
            <strong className="text-slate-800 font-semibold">{roof.orientationCategory} ({roof.azimuthDeg}°)</strong> • Usable Area:{' '}
            <strong className="text-slate-800 font-semibold">{roof.usableAreaM2} m²</strong>
          </p>
        </div>

        {/* Save & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            id="btn-hardware-gateway-trigger"
            onClick={onOpenHardwareModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-600" />
            <span>Hardware Gateway</span>
          </button>

          <button
            id="btn-audit-report-trigger"
            onClick={onOpenAuditReportModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>Audit Report</span>
          </button>

          <button
            id="btn-adjust-system-trigger"
            onClick={onOpenAdjustModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            <span>Adjust</span>
          </button>

          <button
            id="btn-save-system-claim"
            onClick={handleSaveClick}
            disabled={isSaved}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isSaved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5 fill-white" />}
            <span>{isSaved ? 'Saved' : 'Save System'}</span>
          </button>
        </div>
      </div>

      {/* Module Navigation Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveModule('forecast')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeModule === 'forecast'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sun className="w-4 h-4" />
          <span>Solar Generation Forecast</span>
        </button>

        <button
          onClick={() => setActiveModule('battery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeModule === 'battery'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Battery className="w-4 h-4" />
          <span>Battery Storage (BESS)</span>
        </button>

        <button
          onClick={() => setActiveModule('financials')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeModule === 'financials'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Financial ROI & 25-Yr Payback</span>
        </button>

        <button
          onClick={() => setActiveModule('historical')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeModule === 'historical'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Historical Drift & PR</span>
        </button>
      </div>

      {/* View Module 1: Core Solar Forecast */}
      {activeModule === 'forecast' && (
        <div className="space-y-6">
          {/* Primary KPI Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Metric 1: System Size */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Estimated System Size
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sun className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-['Space_Grotesk']">
                  {forecast.systemSizeKwp}
                </span>
                <span className="text-xs font-bold text-slate-500">kWp DC</span>
              </div>
              <p className="text-[11px] text-slate-500">
                ~{system.panelCount} panels ({system.panelWattage}W)
              </p>
            </div>

            {/* Metric 2: Expected Generation Today */}
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  Expected Today
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-indigo-700 font-['Space_Grotesk']">
                  {forecast.predictedKwh}
                </span>
                <span className="text-xs font-bold text-indigo-600">kWh</span>
              </div>
              <p className="text-[11px] text-indigo-900/80 font-medium">
                Likely range: {forecast.range.lowKwh}–{forecast.range.highKwh} kWh
              </p>
            </div>

            {/* Metric 3: Estimated Power Now */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Estimated Now
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-['Space_Grotesk']">
                  {forecast.estimatedNowKw}
                </span>
                <span className="text-xs font-bold text-slate-500">kW AC</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Peak: {forecast.peakHourKw} kW @ {forecast.peakHourStr}
              </p>
            </div>

            {/* Metric 4: Annual Generation */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Estimated Yearly
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 font-['Space_Grotesk']">
                  {forecast.annualPotentialMwh}
                </span>
                <span className="text-xs font-bold text-slate-500">MWh/yr</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold">
                ~₱{(forecast.estimatedSavingsPhpAnnual || 0).toLocaleString()} / yr savings
              </p>
            </div>
          </div>

          {/* Interactive Forecast Visualizer Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
            {/* Forecast Tabs & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  id="tab-btn-hourly"
                  onClick={() => setActiveTab('hourly')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'hourly'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hourly Forecast
                </button>
                <button
                  id="tab-btn-weekly"
                  onClick={() => setActiveTab('weekly')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'weekly'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  7-Day Outlook
                </button>
                <button
                  id="tab-btn-monthly"
                  onClick={() => setActiveTab('monthly')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'monthly'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  12-Month Seasonality
                </button>
              </div>

              {/* Explainability Button */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-why-this-estimate"
                  onClick={onOpenWhyModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why this estimate?</span>
                </button>

                <button
                  onClick={handleExportJson}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                  title="Export Assessment JSON"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab View 1: Hourly Forecast Chart */}
            {activeTab === 'hourly' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Expected 24-Hour Solar Production Curve (kW AC vs Solar Radiation)</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> AC Output (kW)
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-sky-500 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> POA Irradiance (W/m²)
                    </span>
                  </div>
                </div>

                <div className="w-full h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={forecast.hourly}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="timeStr"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        interval={2}
                      />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="kW" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'acPowerKw') return [`${value} kW AC`, 'Expected AC Power'];
                          if (name === 'poaIrradianceWm2') return [`${value} W/m²`, 'POA Irradiance'];
                          if (name === 'cellTemperatureC') return [`${value} °C`, 'Cell Temp'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `Hour: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="acPowerKw"
                        stroke="#4f46e5"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#solarGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Tab View 2: 7-Day Outlook */}
            {activeTab === 'weekly' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Weather-adjusted daily energy forecast for the upcoming week:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-7 gap-2.5">
                  {forecast.weeklyForecast.map((day, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border text-center space-y-1.5 transition-all ${
                        idx === 0
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-900 shadow-2xs'
                          : 'bg-slate-50 border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <span className="text-xs font-bold block">{day.dayName}</span>
                      <CloudSun className="w-5 h-5 mx-auto text-amber-500 my-1" />
                      <span className="text-lg font-black text-slate-900 font-['Space_Grotesk'] block">
                        {day.predictedKwh}
                      </span>
                      <span className="text-[10px] text-slate-500 block font-medium">kWh</span>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{day.weatherDesc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab View 3: 12-Month Seasonality */}
            {activeTab === 'monthly' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Expected monthly solar production across tropical dry and monsoon seasons:
                </p>
                <div className="w-full h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={forecast.monthlyEstimateKwh}
                      margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} unit="kWh" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderColor: '#e2e8f0',
                          borderRadius: '12px',
                          color: '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                        }}
                        formatter={(val: any) => [`${val} kWh`, 'Monthly Production']}
                      />
                      <Bar dataKey="kwh" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Module 2: Battery Storage Simulator */}
      {activeModule === 'battery' && <BatteryStorageSimulator assessment={assessment} />}

      {/* View Module 3: Financial ROI Calculator */}
      {activeModule === 'financials' && <FinancialRoiCalculator assessment={assessment} />}

      {/* View Module 4: Historical Tracking View */}
      {activeModule === 'historical' && <HistoricalTrackingView assessment={assessment} />}
    </div>
  );
};
