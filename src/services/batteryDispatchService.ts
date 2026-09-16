import {
  BatterySystemConfig,
  BatteryHourlyDispatch,
  HourlySolarOutput,
} from '../types/solaris';

export const defaultBatteryConfig: BatterySystemConfig = {
  enabled: true,
  capacityKwh: 10.0,
  maxPowerKw: 5.0,
  roundTripEfficiency: 0.90, // 90% round trip efficiency
  minSocPercent: 15, // 15% reserve buffer
  strategy: 'self_consumption',
};

// Typical residential daily consumption profile (kWh per hour baseline, scaled to ~15-25 kWh/day)
export const standardHomeLoadProfileKw: number[] = [
  0.45, 0.40, 0.38, 0.35, 0.38, 0.55, // 00:00 - 05:00 (Night idle)
  1.10, 1.65, 1.40, 0.95, 0.85, 0.90, // 06:00 - 11:00 (Morning prep)
  1.05, 1.20, 1.10, 0.95, 1.30, 1.85, // 12:00 - 17:00 (Afternoon)
  2.40, 2.80, 2.65, 2.10, 1.40, 0.75, // 18:00 - 23:00 (Evening peak: cooking, AC, lights)
];

export interface BatterySimulationResult {
  config: BatterySystemConfig;
  hourly: BatteryHourlyDispatch[];
  totalSolarGeneratedKwh: number;
  totalHomeConsumedKwh: number;
  solarSelfConsumedDirectKwh: number;
  solarStoredInBatteryKwh: number;
  batteryDischargedToLoadKwh: number;
  gridExportedKwh: number;
  gridImportedKwh: number;
  selfConsumptionRatePercent: number; // % of solar used on site
  solarIndependencePercent: number; // % of home load met by solar + battery
  dailyEquivalentCycles: number;
  backupHoursCriticalLoad: number; // hours of resilience at 1.0 kW critical load
}

export function simulateBatteryDispatch(
  solarHourly: HourlySolarOutput[],
  batteryConfig: BatterySystemConfig = defaultBatteryConfig,
  loadMultiplier: number = 1.0,
  peakHours: number[] = [14, 15, 16, 17, 18, 19, 20, 21]
): BatterySimulationResult {
  const { capacityKwh, maxPowerKw, roundTripEfficiency, minSocPercent, strategy } = batteryConfig;

  // Single-trip efficiency (square root of round trip efficiency)
  const chargeEfficiency = Math.sqrt(roundTripEfficiency);
  const dischargeEfficiency = Math.sqrt(roundTripEfficiency);

  const minEnergyKwh = (minSocPercent / 100) * capacityKwh;
  let currentEnergyKwh = capacityKwh * 0.40; // Initial 40% SoC at midnight

  const hourlyDispatches: BatteryHourlyDispatch[] = [];

  let totalSolar = 0;
  let totalHome = 0;
  let totalDirectSolar = 0;
  let totalBatteryCharged = 0;
  let totalBatteryDischarged = 0;
  let totalGridExport = 0;
  let totalGridImport = 0;

  solarHourly.forEach((hourData, idx) => {
    const hour = hourData.hour;
    const solarKw = hourData.acPowerKw;
    const homeLoadKw = (standardHomeLoadProfileKw[hour] || 0.8) * loadMultiplier;

    totalSolar += solarKw;
    totalHome += homeLoadKw;

    let solarToLoad = 0;
    let solarToBattery = 0;
    let solarToGrid = 0;
    let batteryToLoad = 0;
    let gridToLoad = 0;

    const isPeakHour = peakHours.includes(hour);

    // 1. Direct Solar to Load
    solarToLoad = Math.min(solarKw, homeLoadKw);
    const surplusSolar = solarKw - solarToLoad;
    const remainingLoad = homeLoadKw - solarToLoad;

    // 2. Battery Dispatch Logic
    if (batteryConfig.enabled && capacityKwh > 0) {
      if (strategy === 'self_consumption') {
        // Standard self-consumption: Store excess solar, discharge when load deficit
        if (surplusSolar > 0) {
          const maxChargePossible = Math.min(
            surplusSolar,
            maxPowerKw,
            (capacityKwh - currentEnergyKwh) / chargeEfficiency
          );
          solarToBattery = Math.max(0, maxChargePossible);
          currentEnergyKwh += solarToBattery * chargeEfficiency;
          solarToGrid = surplusSolar - solarToBattery;
        } else if (remainingLoad > 0) {
          const maxDischargePossible = Math.min(
            remainingLoad,
            maxPowerKw,
            (currentEnergyKwh - minEnergyKwh) * dischargeEfficiency
          );
          batteryToLoad = Math.max(0, maxDischargePossible);
          currentEnergyKwh -= batteryToLoad / dischargeEfficiency;
          gridToLoad = remainingLoad - batteryToLoad;
        }
      } else if (strategy === 'tou_arbitrage') {
        // Time-of-Use Arbitrage: Save battery for high-rate peak hours
        if (isPeakHour) {
          // Force discharge battery during peak hours to avoid expensive grid electricity
          if (remainingLoad > 0) {
            const maxDischargePossible = Math.min(
              remainingLoad,
              maxPowerKw,
              (currentEnergyKwh - minEnergyKwh) * dischargeEfficiency
            );
            batteryToLoad = Math.max(0, maxDischargePossible);
            currentEnergyKwh -= batteryToLoad / dischargeEfficiency;
            gridToLoad = remainingLoad - batteryToLoad;
          }
          if (surplusSolar > 0) {
            solarToGrid = surplusSolar; // During peak, export extra solar for higher feed-in credit
          }
        } else {
          // Off-peak: Charge battery with available solar
          if (surplusSolar > 0) {
            const maxChargePossible = Math.min(
              surplusSolar,
              maxPowerKw,
              (capacityKwh - currentEnergyKwh) / chargeEfficiency
            );
            solarToBattery = Math.max(0, maxChargePossible);
            currentEnergyKwh += solarToBattery * chargeEfficiency;
            solarToGrid = surplusSolar - solarToBattery;
          } else {
            // Do not discharge battery off-peak; preserve for peak window
            gridToLoad = remainingLoad;
          }
        }
      } else {
        // Backup resilience mode: maintain at least 60% SoC
        const backupMinSocKwh = capacityKwh * 0.65;
        if (surplusSolar > 0) {
          const maxChargePossible = Math.min(
            surplusSolar,
            maxPowerKw,
            (capacityKwh - currentEnergyKwh) / chargeEfficiency
          );
          solarToBattery = Math.max(0, maxChargePossible);
          currentEnergyKwh += solarToBattery * chargeEfficiency;
          solarToGrid = surplusSolar - solarToBattery;
        } else if (remainingLoad > 0) {
          const usableEnergyAboveBackup = Math.max(0, currentEnergyKwh - backupMinSocKwh);
          const maxDischargePossible = Math.min(
            remainingLoad,
            maxPowerKw,
            usableEnergyAboveBackup * dischargeEfficiency
          );
          batteryToLoad = Math.max(0, maxDischargePossible);
          currentEnergyKwh -= batteryToLoad / dischargeEfficiency;
          gridToLoad = remainingLoad - batteryToLoad;
        }
      }
    } else {
      // No battery enabled
      solarToGrid = surplusSolar;
      gridToLoad = remainingLoad;
    }

    // Clamp current energy
    currentEnergyKwh = Math.max(minEnergyKwh, Math.min(capacityKwh, currentEnergyKwh));
    const currentSoc = capacityKwh > 0 ? Math.round((currentEnergyKwh / capacityKwh) * 100) : 0;

    totalDirectSolar += solarToLoad;
    totalBatteryCharged += solarToBattery;
    totalBatteryDischarged += batteryToLoad;
    totalGridExport += solarToGrid;
    totalGridImport += gridToLoad;

    // Signed values: battery flow (negative = charging, positive = discharging)
    const batteryFlowKw = batteryToLoad > 0 ? batteryToLoad : -solarToBattery;
    // Signed values: grid flow (positive = importing, negative = exporting)
    const gridFlowKw = gridToLoad > 0 ? gridToLoad : -solarToGrid;

    hourlyDispatches.push({
      hour,
      timeStr: hourData.timeStr,
      solarGenerationKw: Math.round(solarKw * 100) / 100,
      homeLoadKw: Math.round(homeLoadKw * 100) / 100,
      solarToLoadKw: Math.round(solarToLoad * 100) / 100,
      solarToBatteryKw: Math.round(solarToBattery * 100) / 100,
      solarToGridKw: Math.round(solarToGrid * 100) / 100,
      batteryToLoadKw: Math.round(batteryToLoad * 100) / 100,
      gridToLoadKw: Math.round(gridToLoad * 100) / 100,
      batterySocPercent: currentSoc,
      batteryFlowKw: Math.round(batteryFlowKw * 100) / 100,
      gridFlowKw: Math.round(gridFlowKw * 100) / 100,
    });
  });

  const totalOnsiteSolarUsed = totalDirectSolar + totalBatteryCharged;
  const selfConsumptionRate = totalSolar > 0 ? Math.min(100, Math.round((totalOnsiteSolarUsed / totalSolar) * 100)) : 0;
  const solarIndependence = totalHome > 0 ? Math.min(100, Math.round(((totalDirectSolar + totalBatteryDischarged) / totalHome) * 100)) : 0;
  const dailyCycles = capacityKwh > 0 ? Math.round((totalBatteryDischarged / capacityKwh) * 100) / 100 : 0;
  const criticalLoadKw = 0.8; // e.g. fridge + WiFi + LED lighting
  const usableBatteryReserveKwh = capacityKwh * (1 - minSocPercent / 100);
  const backupHours = Math.round((usableBatteryReserveKwh / criticalLoadKw) * 10) / 10;

  return {
    config: batteryConfig,
    hourly: hourlyDispatches,
    totalSolarGeneratedKwh: Math.round(totalSolar * 10) / 10,
    totalHomeConsumedKwh: Math.round(totalHome * 10) / 10,
    solarSelfConsumedDirectKwh: Math.round(totalDirectSolar * 10) / 10,
    solarStoredInBatteryKwh: Math.round(totalBatteryCharged * 10) / 10,
    batteryDischargedToLoadKwh: Math.round(totalBatteryDischarged * 10) / 10,
    gridExportedKwh: Math.round(totalGridExport * 10) / 10,
    gridImportedKwh: Math.round(totalGridImport * 10) / 10,
    selfConsumptionRatePercent: selfConsumptionRate,
    solarIndependencePercent: solarIndependence,
    dailyEquivalentCycles: dailyCycles,
    backupHoursCriticalLoad: backupHours,
  };
}
