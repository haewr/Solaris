import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Zap,
  Calendar,
  DollarSign,
  Clock,
  ShieldCheck,
  ChevronRight,
  ArrowDownRight,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Sliders,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import {
  FinancialSimulation,
  NasaPowerClimatologyData,
  DegradationProfile,
} from '../../types/nativeSolaris';
import {
  simulationService,
  DEFAULT_NORECO_II_TARIFF_PHP,
  PHILIPPINES_TURNKEY_COST_PER_KWP_PHP,
} from '../../services/simulationService';
import { degradationService } from '../../services/degradationService';

interface SimulationTabProps {
  nasaData: NasaPowerClimatologyData | null;
  recommendedKwp: number;
  isAirplaneMode: boolean;
  onNavigateToSettings: () => void;
}

export const SimulationTab: React.FC<SimulationTabProps> = ({
  nasaData,
  recommendedKwp,
  isAirplaneMode,
  onNavigateToSettings,
}) => {
  // Navigation between Results page and Configure Parameters page
  const [activePage, setActivePage] = useState<'results' | 'parameters'>('results');

  const [systemSizeKwp, setSystemSizeKwp] = useState<number>(recommendedKwp || 3.5);
  const [tariffPhp, setTariffPhp] = useState<number>(DEFAULT_NORECO_II_TARIFF_PHP);
  const [years, setYears] = useState<number>(25);
  const [simulation, setSimulation] = useState<FinancialSimulation | null>(null);
  const [degradationProfile, setDegradationProfile] = useState<DegradationProfile | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showFullTable, setShowFullTable] = useState(false);

  const TIMEFRAME_PRESETS = [5, 10, 15, 20, 25, 30];

  // Sync recommended system size if user navigated from siting tab
  useEffect(() => {
    if (recommendedKwp > 0 && Math.abs(systemSizeKwp - recommendedKwp) > 1.0) {
      setSystemSizeKwp(recommendedKwp);
    }
  }, [recommendedKwp]);

  // Load degradation profile and calculate simulation
  useEffect(() => {
    loadAndSimulate();
  }, [systemSizeKwp, tariffPhp, years, nasaData]);

  const loadAndSimulate = async () => {
    setIsCalculating(true);
    try {
      const profile = await degradationService.getProfile();
      setDegradationProfile(profile);

      // Fallback NASA data if not yet loaded
      const activeNasa: NasaPowerClimatologyData = nasaData || {
        annualDailyKwhM2: 5.08,
        monthlyDailyKwhM2: {},
        annualAvgTempC: 26.23,
        monthlyAvgTempC: {},
        source: 'NASA POWER Dumaguete Climatology Baseline',
        queryCoordinates: { lat: 9.3068, lng: 123.3054 },
        fetchedAt: Date.now(),
      };

      const result = await simulationService.runSimulation(
        systemSizeKwp,
        activeNasa,
        profile,
        tariffPhp,
        years
      );
      setSimulation(result);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-4 pb-6" id="solaris-simulation-tab">
      {/* Top Page Switcher Segment */}
      <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
        <button
          onClick={() => setActivePage('results')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activePage === 'results'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Simulation Results</span>
        </button>
        <button
          onClick={() => setActivePage('parameters')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activePage === 'parameters'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Parameters & Timeframe</span>
        </button>
      </div>

      {/* =========================================================================
          PAGE 1: RESULTS AT TOP (Dedicated Page)
         ========================================================================= */}
      {activePage === 'results' && simulation && (
        <div className="space-y-4">
          {/* Quick Context & Timeframe Banner at Top */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                    {simulation.simulationYears}-Year Simulation Results
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {simulation.systemSizeKwp.toFixed(1)} kWp • ₱{tariffPhp}/kWh NORECO II
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActivePage('parameters')}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center gap-1 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Adjust</span>
              </button>
            </div>

            {/* Timeframe Quick Pills directly on results page */}
            <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Simulation Timeframe:
                </span>
                <span className="font-bold text-indigo-700 font-mono">
                  {years} Years Horizon
                </span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {TIMEFRAME_PRESETS.map((y) => (
                  <button
                    key={y}
                    onClick={() => setYears(y)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                      years === y
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {y} Yrs
                  </button>
                ))}
              </div>
            </div>

            {/* Lifetime Total Banner */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                  {simulation.simulationYears}-Year Net Financial Benefit
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                  Net Cash Profit
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-emerald-400">₱</span>
                <span className="text-3xl font-black font-['Space_Grotesk'] text-emerald-400 tracking-tight">
                  {simulation.net25YearBenefitPhp.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Installation Cost:</span>
                  <strong>₱{simulation.estimatedTurnkeyCostPhp.toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Gross {simulation.simulationYears}-Yr Savings:
                  </span>
                  <strong>₱{simulation.cumulativeSavingsPhp25Yr.toLocaleString()}</strong>
                </div>
              </div>
            </div>

            {/* Key KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Payback Period */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  System Payback Period
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-['Space_Grotesk'] text-emerald-700">
                    {simulation.simplePaybackYears <= simulation.simulationYears
                      ? simulation.simplePaybackYears
                      : `>${simulation.simulationYears}`}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">Years</span>
                </div>
                <p className="text-[10px] text-emerald-800/80 font-medium">
                  {simulation.simplePaybackYears <= simulation.simulationYears
                    ? '100% Capital Recovery Achieved'
                    : 'Beyond Selected Timeframe'}
                </p>
              </div>

              {/* Monthly Bill Savings */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Monthly Bill Savings (Yr 1)
                </span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xs font-bold text-slate-600">₱</span>
                  <span className="text-2xl font-black font-['Space_Grotesk'] text-slate-900">
                    {simulation.monthlyBillSavingsPhp.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">/mo</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  ₱{simulation.annualBillSavingsPhpYear1.toLocaleString()} / year
                </p>
              </div>
            </div>

            {/* Annual Generation & Panel count */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Installed Hardware
                </span>
                <span className="font-bold text-slate-800">
                  {simulation.panelCount} Modern Panels
                </span>
                <p className="text-[10px] text-slate-400">450W Monocrystalline PV</p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">
                  Degradation Applied
                </span>
                <span className="font-bold text-slate-800">
                  {simulation.annualDegradationPercent}% / yr compound
                </span>
                <p className="text-[10px] text-slate-400">Tropical Heat & Cloud Derated</p>
              </div>
            </div>

            {/* Cashflow Progression Toggle */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => setShowFullTable(!showFullTable)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors"
              >
                <span>
                  {showFullTable
                    ? `Hide ${simulation.simulationYears}-Year Cashflow Table`
                    : `View ${simulation.simulationYears}-Year Cashflow Breakdown`}
                </span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${showFullTable ? 'rotate-90' : ''}`}
                />
              </button>

              {showFullTable && (
                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 sticky top-0 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-2">Year</th>
                        <th className="p-2">Yield (kWh)</th>
                        <th className="p-2">Savings (₱)</th>
                        <th className="p-2">Net Cashflow (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono">
                      {simulation.yearlyCashflows.map((flow) => (
                        <tr
                          key={flow.year}
                          className={flow.netCashflowPhp >= 0 ? 'bg-emerald-50/40' : 'bg-white'}
                        >
                          <td className="p-2 font-bold text-slate-700">Yr {flow.year}</td>
                          <td className="p-2 text-slate-600">{flow.productionKwh.toLocaleString()}</td>
                          <td className="p-2 text-slate-800">₱{flow.savingsPhp.toLocaleString()}</td>
                          <td
                            className={`p-2 font-bold ${
                              flow.netCashflowPhp >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            ₱{flow.netCashflowPhp.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bottom Button to Modify Setup */}
            <div className="pt-2">
              <button
                onClick={() => setActivePage('parameters')}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center justify-center gap-2 transition-colors"
              >
                <Sliders className="w-4 h-4" />
                <span>Configure Custom Timeframe & Parameters</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PAGE 2: PARAMETERS & TIMEFRAME CONFIGURATION
         ========================================================================= */}
      {activePage === 'parameters' && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Simulation Parameters & Timeframe
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Dumaguete NORECO II
            </span>
          </div>

          {/* 1. Custom Timeframe Selector */}
          <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Custom Simulation Timeframe
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Financial projection & degradation horizon
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-['Space_Grotesk'] text-indigo-700">
                  {years}
                </span>
                <span className="text-xs font-bold text-indigo-600 ml-1">Years</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={years}
              onChange={(e) => setYears(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TIMEFRAME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setYears(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    years === preset
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset} Years
                </button>
              ))}
            </div>
          </div>

          {/* 2. System Size Slider */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">System Capacity</span>
                <span className="text-[10px] text-slate-500 font-medium">
                  ~{Math.ceil((systemSizeKwp * 1000) / 450)} Monocrystalline Panels (450W)
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-black font-['Space_Grotesk'] text-indigo-700">
                  {systemSizeKwp.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-indigo-600 ml-1">kWp</span>
              </div>
            </div>

            <input
              type="range"
              min="1.0"
              max="15.0"
              step="0.5"
              value={systemSizeKwp}
              onChange={(e) => setSystemSizeKwp(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />

            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>1.0 kWp (Micro)</span>
              <span>5.0 kWp (Standard Home)</span>
              <span>15.0 kWp (Estate)</span>
            </div>
          </div>

          {/* 3. Electricity Tariff & Turnkey benchmark */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">
                Grid Tariff (₱/kWh)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₱</span>
                <input
                  type="number"
                  min="5"
                  max="30"
                  step="0.05"
                  value={tariffPhp}
                  onChange={(e) => setTariffPhp(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <span className="text-[9px] text-slate-400 block">NORECO II residential average</span>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 block">Installation Cost Benchmark</label>
              <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                ₱{PHILIPPINES_TURNKEY_COST_PER_KWP_PHP.toLocaleString()} / kWp
              </div>
              <span className="text-[9px] text-slate-400 block">Philippine industry installed</span>
            </div>
          </div>

          {/* 4. Degradation link callout */}
          {degradationProfile && (
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 block">
                  Coupled Panel Aging & Degradation (Step 5)
                </span>
                <span className="text-[11px] text-indigo-900 font-medium">
                  Annual Rate: <strong>{degradationProfile.annualDegradationRatePercent}%/year</strong> (Installed {degradationProfile.installationDate})
                </span>
              </div>
              <button
                onClick={onNavigateToSettings}
                className="text-[11px] font-bold text-indigo-700 underline hover:text-indigo-900 shrink-0 ml-2"
              >
                Adjust
              </button>
            </div>
          )}

          {/* Action button to switch to Results page */}
          <div className="pt-2">
            <button
              onClick={() => setActivePage('results')}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>View Simulation Results</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

