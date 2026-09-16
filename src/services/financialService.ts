import {
  TariffConfig,
  FinancialRoiMetrics,
  BatterySystemConfig,
  SystemConfiguration,
  SolarForecast,
} from '../types/solaris';
import { BatterySimulationResult } from './batteryDispatchService';

export const defaultTariffConfig: TariffConfig = {
  type: 'tou',
  currency: 'PHP',
  currencySymbol: '₱',
  flatRate: 12.50, // 12.50 PHP/kWh default
  peakRate: 15.80, // 15.80 PHP/kWh peak
  offPeakRate: 9.20, // 9.20 PHP/kWh off-peak
  exportFeedInTariff: 6.50, // 6.50 PHP/kWh net metering compensation
  peakHours: [14, 15, 16, 17, 18, 19, 20, 21], // 2 PM to 9 PM
};

export interface FinancialInputOptions {
  solarCostPerWp?: number; // e.g. 50 PHP/Wp (~$0.90 USD/Wp)
  batteryCostPerKwh?: number; // e.g. 20,000 PHP/kWh (~$350 USD/kWh)
  discountRate?: number; // e.g. 0.06 (6%)
  annualGridInflationRate?: number; // e.g. 0.04 (4% electricity inflation/yr)
  annualSolarDegradation?: number; // e.g. 0.005 (0.5%/yr degradation)
}

export function calculateFinancialRoi(
  system: SystemConfiguration,
  forecast: SolarForecast,
  batterySimulation: BatterySimulationResult,
  tariff: TariffConfig = defaultTariffConfig,
  options: FinancialInputOptions = {}
): FinancialRoiMetrics {
  const isPhp = tariff.currency === 'PHP';
  const defaultSolarWpCost = isPhp ? 48.0 : 0.95; // 48 PHP/Wp or $0.95/Wp
  const defaultBatteryKwhCost = isPhp ? 22000 : 400; // 22,000 PHP/kWh or $400/kWh

  const solarCostPerWp = options.solarCostPerWp ?? defaultSolarWpCost;
  const batteryCostPerKwh = options.batteryCostPerKwh ?? defaultBatteryKwhCost;
  const discountRate = options.discountRate ?? 0.05; // 5% discount rate
  const annualInflation = options.annualGridInflationRate ?? 0.035; // 3.5% grid rate inflation
  const annualDegradation = options.annualSolarDegradation ?? 0.005; // 0.5% degradation per year

  // System Capex
  const solarCapacityWp = system.systemCapacityKwp * 1000;
  const solarCapex = Math.round(solarCapacityWp * solarCostPerWp);
  const batteryCapacityKwh = batterySimulation.config.enabled ? batterySimulation.config.capacityKwh : 0;
  const batteryCapex = Math.round(batteryCapacityKwh * batteryCostPerKwh);
  const totalCapex = solarCapex + batteryCapex;

  // Annual Generation & Yield
  const annualSolarGenerationKwh = forecast.annualPotentialMwh * 1000;

  // Compute daily financial benefit from hourly dispatch
  let dailyDirectSavings = 0;
  let dailyExportEarnings = 0;

  batterySimulation.hourly.forEach((hour) => {
    const isPeak = tariff.peakHours.includes(hour.hour);
    const importRate = tariff.type === 'tou' ? (isPeak ? tariff.peakRate : tariff.offPeakRate) : tariff.flatRate;

    // Direct onsite consumed solar + battery offsets retail electricity cost
    const onsiteUsedKwh = hour.solarToLoadKw + hour.batteryToLoadKw;
    dailyDirectSavings += onsiteUsedKwh * importRate;

    // Exported solar gets feed-in tariff credit
    const exportedKwh = hour.solarToGridKw;
    dailyExportEarnings += exportedKwh * tariff.exportFeedInTariff;
  });

  const annualDirectSavings = Math.round(dailyDirectSavings * 365);
  const annualExportEarnings = Math.round(dailyExportEarnings * 365);
  const annualTotalBenefit = annualDirectSavings + annualExportEarnings;

  // 25-Year Cashflow analysis
  const cashflows: Array<{
    year: number;
    solarGenerationKwh: number;
    annualSavings: number;
    netCumulativeCashflow: number;
    degradedCapacityRatio: number;
  }> = [];

  let cumulativeCashflow = -totalCapex;
  let paybackPeriodYears = 25;
  let paybackFound = false;

  for (let year = 1; year <= 25; year++) {
    const degradationFactor = Math.pow(1 - annualDegradation, year - 1);
    const inflationFactor = Math.pow(1 + annualInflation, year - 1);

    const yearGenerationKwh = Math.round(annualSolarGenerationKwh * degradationFactor);
    // Savings scale with tariff inflation and panel output
    const yearSavings = Math.round(annualTotalBenefit * degradationFactor * inflationFactor);

    cumulativeCashflow += yearSavings;

    if (!paybackFound && cumulativeCashflow >= 0) {
      // Linear interpolation for fractional payback year
      const prevCumulative = cumulativeCashflow - yearSavings;
      const fraction = Math.abs(prevCumulative) / yearSavings;
      paybackPeriodYears = Math.round((year - 1 + fraction) * 10) / 10;
      paybackFound = true;
    }

    cashflows.push({
      year,
      solarGenerationKwh: yearGenerationKwh,
      annualSavings: yearSavings,
      netCumulativeCashflow: Math.round(cumulativeCashflow),
      degradedCapacityRatio: Math.round(degradationFactor * 100) / 100,
    });
  }

  if (!paybackFound) {
    paybackPeriodYears = Math.max(25, Math.round((totalCapex / Math.max(1, annualTotalBenefit)) * 10) / 10);
  }

  // Net Present Value (NPV)
  let npv = -totalCapex;
  cashflows.forEach((cf) => {
    npv += cf.annualSavings / Math.pow(1 + discountRate, cf.year);
  });

  // Levelized Cost of Electricity (LCOE)
  let totalDiscountedGeneration = 0;
  cashflows.forEach((cf) => {
    totalDiscountedGeneration += cf.solarGenerationKwh / Math.pow(1 + discountRate, cf.year);
  });
  // Lifetime O&M cost approx 1% of capex / year
  const lifetimeOmDiscounted = Array.from({ length: 25 }, (_, i) => (totalCapex * 0.01) / Math.pow(1 + discountRate, i + 1)).reduce((a, b) => a + b, 0);
  const lcoe = totalDiscountedGeneration > 0 ? (totalCapex + lifetimeOmDiscounted) / totalDiscountedGeneration : 0;

  const total25YearSavings = cashflows.reduce((acc, c) => acc + c.annualSavings, 0);
  const roi25YearPercent = totalCapex > 0 ? Math.round(((total25YearSavings - totalCapex) / totalCapex) * 100) : 0;
  const lifetimeCo2Tons = Math.round((annualSolarGenerationKwh * 25 * 0.70) / 1000); // 0.70 kg CO2/kWh grid factor

  return {
    totalCapex,
    solarCapex,
    batteryCapex,
    annualSolarGenerationKwh: Math.round(annualSolarGenerationKwh),
    annualDirectSavings,
    annualExportEarnings,
    annualTotalFinancialBenefit: annualTotalBenefit,
    paybackPeriodYears,
    roi25YearPercent,
    npv25Year: Math.round(npv),
    lcoePerKwh: Math.round(lcoe * 100) / 100,
    gridParityPrice: tariff.type === 'tou' ? tariff.peakRate : tariff.flatRate,
    lifetimeCo2TonsSaved: lifetimeCo2Tons,
    cashflows,
  };
}
