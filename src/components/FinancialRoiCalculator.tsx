import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  PiggyBank,
  Zap,
  Calendar,
  Percent,
  Sliders,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Leaf,
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
import { Assessment, TariffConfig } from '../types/solaris';
import { calculateFinancialRoi, defaultTariffConfig } from '../services/financialService';
import { simulateBatteryDispatch, defaultBatteryConfig } from '../services/batteryDispatchService';

interface FinancialRoiCalculatorProps {
  assessment: Assessment;
}

export const FinancialRoiCalculator: React.FC<FinancialRoiCalculatorProps> = ({ assessment }) => {
  const [tariff, setTariff] = useState<TariffConfig>(defaultTariffConfig);
  const [hasBattery, setHasBattery] = useState<boolean>(true);
  const [batteryKwh, setBatteryKwh] = useState<number>(10.0);

  const [solarWpCost, setSolarWpCost] = useState<number>(tariff.currency === 'PHP' ? 48.0 : 0.95);
  const [batteryKwhCost, setBatteryKwhCost] = useState<number>(tariff.currency === 'PHP' ? 22000 : 400);

  const batterySim = useMemo(() => {
    return simulateBatteryDispatch(assessment.forecast.hourly, {
      ...defaultBatteryConfig,
      enabled: hasBattery,
      capacityKwh: batteryKwh,
    });
  }, [assessment.forecast.hourly, hasBattery, batteryKwh]);

  const roi = useMemo(() => {
    return calculateFinancialRoi(
      assessment.system,
      assessment.forecast,
      batterySim,
      tariff,
      {
        solarCostPerWp: solarWpCost,
        batteryCostPerKwh: batteryKwhCost,
      }
    );
  }, [assessment.system, assessment.forecast, batterySim, tariff, solarWpCost, batteryKwhCost]);

  const currencySymbols: Record<string, string> = {
    PHP: '₱',
    USD: '$',
    EUR: '€',
    AUD: 'A$',
    GBP: '£',
  };

  const handleCurrencyChange = (newCurr: TariffConfig['currency']) => {
    const isPhp = newCurr === 'PHP';
    setTariff({
      ...tariff,
      currency: newCurr,
      currencySymbol: currencySymbols[newCurr] || '$',
      flatRate: isPhp ? 12.50 : 0.22,
      peakRate: isPhp ? 15.80 : 0.32,
      offPeakRate: isPhp ? 9.20 : 0.14,
      exportFeedInTariff: isPhp ? 6.50 : 0.08,
    });
    setSolarWpCost(isPhp ? 48.0 : 0.95);
    setBatteryKwhCost(isPhp ? 22000 : 400);
  };

  return (
    <div className="w-full space-y-6" id="financial-roi-calculator">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                PHASE 3 TARIFF & PAYBACK ENGINE
              </span>
              <span className="text-xs text-slate-500 font-medium">25-Year LCOE & NPV Model</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-['Space_Grotesk']">
              Financial ROI & 25-Year Payback Analysis
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Transparent investment modeling with Time-of-Use tariffs, feed-in credits, 0.5%/yr degradation decay, and Levelized Cost of Electricity (LCOE).
            </p>
          </div>

          {/* Currency Switcher */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            {(['PHP', 'USD', 'EUR', 'AUD'] as const).map((curr) => (
              <button
                key={curr}
                onClick={() => handleCurrencyChange(curr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  tariff.currency === curr
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {curr} ({currencySymbols[curr]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Estimated Payback */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Estimated Payback Period
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-['Space_Grotesk']">
              {roi.paybackPeriodYears}
            </span>
            <span className="text-xs font-bold text-slate-500">Years</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Break-even point including system degradation
          </p>
        </div>

        {/* Metric 2: Annual Savings */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Annual Direct Benefit
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 font-['Space_Grotesk']">
              {tariff.currencySymbol}{roi.annualTotalFinancialBenefit.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-slate-500">/ yr</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {tariff.currencySymbol}{roi.annualDirectSavings.toLocaleString()} bill offset + {tariff.currencySymbol}{roi.annualExportEarnings.toLocaleString()} export
          </p>
        </div>

        {/* Metric 3: LCOE Cost per kWh */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Solar LCOE (Cost/kWh)
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 font-['Space_Grotesk']">
              {tariff.currencySymbol}{roi.lcoePerKwh}
            </span>
            <span className="text-xs font-bold text-slate-500">/ kWh</span>
          </div>
          <p className="text-[11px] text-slate-500">
            vs {tariff.currencySymbol}{roi.gridParityPrice}/kWh grid retail (Grid Parity)
          </p>
        </div>

        {/* Metric 4: 25-Year Net ROI */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            25-Yr Net Present Value
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-['Space_Grotesk']">
              {tariff.currencySymbol}{roi.npv25Year.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            {roi.roi25YearPercent}% cumulative ROI over 25 years
          </p>
        </div>
      </div>

      {/* 25-Year Cumulative Cash Flow Chart */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-['Space_Grotesk']">
              25-Year Cumulative Net Financial Return
            </h3>
            <p className="text-xs text-slate-500">
              Initial Capex investment ({tariff.currencySymbol}{roi.totalCapex.toLocaleString()}) vs compounding energy savings & feed-in income.
            </p>
          </div>
        </div>

        <div className="h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={roi.cashflows} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} unit=" yr" stroke="#cbd5e1" />
              <YAxis
                unit={` ${tariff.currencySymbol}`}
                tick={{ fontSize: 11, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl text-xs space-y-1.5 border border-slate-700 backdrop-blur-sm min-w-[210px]">
                        <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex justify-between">
                          <span>Year {label}</span>
                          <span className="text-slate-300">Cap: {(data.degradedCapacityRatio * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Annual Savings:</span>
                          <strong className="text-emerald-400 font-bold">{tariff.currencySymbol}{data.annualSavings.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Cumulative Net:</span>
                          <strong className={data.netCumulativeCashflow >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {tariff.currencySymbol}{data.netCumulativeCashflow.toLocaleString()}
                          </strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Generation:</span>
                          <span className="text-slate-200">{data.solarGenerationKwh.toLocaleString()} kWh</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="annualSavings" name={`Annual Savings (${tariff.currencySymbol})`} fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="netCumulativeCashflow"
                name={`Cumulative Cashflow (${tariff.currencySymbol})`}
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 3, fill: '#10b981' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Cost & Tariff Configuration Inputs */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" />
              Adjust Tariff & Capex Parameters
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTariff({ ...tariff, type: tariff.type === 'tou' ? 'flat' : 'tou' })}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 font-bold text-[11px] text-slate-700 shadow-2xs hover:bg-slate-100"
              >
                Mode: {tariff.type === 'tou' ? 'Time-Of-Use (TOU)' : 'Flat Rate'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                {tariff.type === 'tou' ? 'Peak Tariff Rate' : 'Flat Electricity Rate'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={tariff.type === 'tou' ? tariff.peakRate : tariff.flatRate}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 1;
                    setTariff(tariff.type === 'tou' ? { ...tariff, peakRate: val } : { ...tariff, flatRate: val });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-medium">{tariff.currencySymbol}/kWh</span>
              </div>
            </div>

            {tariff.type === 'tou' && (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Off-Peak Tariff Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={tariff.offPeakRate}
                    onChange={(e) => setTariff({ ...tariff, offPeakRate: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-medium">{tariff.currencySymbol}/kWh</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Installation Cost / Wp
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={solarWpCost}
                  onChange={(e) => setSolarWpCost(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-medium">{tariff.currencySymbol}/Wp</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Excess Power Sold (Net Metering)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={tariff.exportFeedInTariff}
                  onChange={(e) => setTariff({ ...tariff, exportFeedInTariff: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-medium">{tariff.currencySymbol}/kWh</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
