/**
 * Step 3 — Simulation Module Service
 * Reuses Step 2 real NASA POWER solar irradiance data + Step 5 degradation module
 * Computes monthly savings, 25-year degraded cashflows, and payback period for Dumaguete City
 * Results are cached in Step 1 encrypted storage and available offline.
 */

import {
  FinancialSimulation,
  NasaPowerClimatologyData,
  DegradationProfile,
} from '../types/nativeSolaris';
import { encryptedStorage } from './encryptedStorageService';

// Dumaguete City NORECO II (Negros Oriental II Electric Cooperative) residential tariff benchmark
export const DEFAULT_NORECO_II_TARIFF_PHP = 12.15; // ₱12.15 per kWh residential average
export const PHILIPPINES_TURNKEY_COST_PER_KWP_PHP = 48000; // ~₱48,000 / kWp installed benchmark

export class SimulationService {
  /**
   * Runs the financial simulation integrating real NASA irradiance and compound degradation
   */
  async runSimulation(
    systemSizeKwp: number,
    nasaData: NasaPowerClimatologyData,
    degradationProfile: DegradationProfile,
    gridTariffPhp: number = DEFAULT_NORECO_II_TARIFF_PHP,
    simulationYears: number = 25,
    costPerKwpPhp: number = PHILIPPINES_TURNKEY_COST_PER_KWP_PHP
  ): Promise<FinancialSimulation> {
    // 1. Calculate baseline Year 1 generation from real NASA irradiance:
    // Daily Peak Sun Hours (PSH) = nasaData.annualDailyKwhM2 (kWh/m²/day)
    // System PR ~0.787
    const pshDaily = nasaData.annualDailyKwhM2;
    const pr = 0.787; // Temperature and wiring derated performance ratio
    const year1DailyKwh = systemSizeKwp * pshDaily * pr;
    const year1AnnualKwh = year1DailyKwh * 365.25;

    // 2. Capital cost estimate (using user-defined or default cost per kWp)
    const effectiveCostPerKwp = costPerKwpPhp > 0 ? costPerKwpPhp : PHILIPPINES_TURNKEY_COST_PER_KWP_PHP;
    const estimatedTurnkeyCostPhp = Math.round(systemSizeKwp * effectiveCostPerKwp);
    const panelCount = Math.ceil((systemSizeKwp * 1000) / 450); // 450W modern panels

    // 3. 25-Year cashflow projection with annual degradation from Step 5
    const annualDegradationRate = degradationProfile.annualDegradationRatePercent / 100;
    const yearlyCashflows: FinancialSimulation['yearlyCashflows'] = [];

    let cumulativeSavingsPhp = 0;
    let simplePaybackYears = 0;
    let paybackFound = false;

    for (let y = 1; y <= simulationYears; y++) {
      // Annual output accounting for degradation
      const degradedRetention = Math.pow(1 - annualDegradationRate, y - 1);
      const productionKwh = Math.round(year1AnnualKwh * degradedRetention);
      
      // Tariff escalation assumption (historical Philippines inflation ~2.5% to 3.0%/yr)
      const escalatedTariff = gridTariffPhp * Math.pow(1.025, y - 1);
      const savingsPhp = Math.round(productionKwh * escalatedTariff);

      cumulativeSavingsPhp += savingsPhp;
      const netCashflowPhp = cumulativeSavingsPhp - estimatedTurnkeyCostPhp;

      if (!paybackFound && netCashflowPhp >= 0) {
        // Linear interpolation for exact fractional payback
        const previousNet = netCashflowPhp - savingsPhp;
        const fractionNeeded = Math.abs(previousNet) / savingsPhp;
        simplePaybackYears = Math.round(((y - 1) + fractionNeeded) * 10) / 10;
        paybackFound = true;
      }

      yearlyCashflows.push({
        year: y,
        productionKwh,
        savingsPhp,
        cumulativeSavingsPhp,
        netCashflowPhp,
      });
    }

    if (!paybackFound) {
      simplePaybackYears = simulationYears + 1;
    }

    const year1Savings = yearlyCashflows[0]?.savingsPhp || 0;
    const monthlyBillSavingsPhp = Math.round(year1Savings / 12);
    const net25YearBenefitPhp = cumulativeSavingsPhp - estimatedTurnkeyCostPhp;

    const simulation: FinancialSimulation = {
      systemSizeKwp,
      panelCount,
      estimatedTurnkeyCostPhp,
      costPerKwpPhp: effectiveCostPerKwp,
      gridTariffPhpPerKwh: gridTariffPhp,
      annualDegradationPercent: degradationProfile.annualDegradationRatePercent,
      simulationYears,
      monthlyBillSavingsPhp,
      annualBillSavingsPhpYear1: year1Savings,
      cumulativeSavingsPhp25Yr: cumulativeSavingsPhp,
      simplePaybackYears,
      net25YearBenefitPhp,
      yearlyCashflows,
    };

    // Cache simulation in Step 1 encrypted storage for offline access
    const cacheKey = `simulation_${systemSizeKwp}kwp_${gridTariffPhp.toFixed(2)}_${effectiveCostPerKwp}_${simulationYears}yr`;
    await encryptedStorage.setItem(cacheKey, simulation, 'simulation', 30 * 24 * 60 * 60 * 1000);

    return simulation;
  }

  /**
   * Retrieves previously cached simulation from Step 1 encrypted storage (offline mode)
   */
  async getCachedSimulation(
    systemSizeKwp: number,
    gridTariffPhp: number
  ): Promise<FinancialSimulation | null> {
    const cacheKey = `simulation_${systemSizeKwp}kwp_${gridTariffPhp.toFixed(2)}`;
    const cached = await encryptedStorage.getItem<FinancialSimulation>(cacheKey);
    return cached ? cached.data : null;
  }
}

export const simulationService = new SimulationService();
