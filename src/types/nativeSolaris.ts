/**
 * Native Solaris TypeScript Type Definitions
 * Designed for Dumaguete City, Philippines solar assessment
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  accuracyMeters?: number;
  timestamp: number;
  source: 'gps' | 'manual_pinpoint' | 'manual_address';
  addressName: string;
}

export interface RoofDimensions {
  mode: 'dimensions' | 'area';
  widthMeters: number;
  lengthMeters: number;
  totalAreaM2: number;
  usableAreaM2: number; // e.g. 75% usable accounting for setback, vents, shading
  tiltDegrees: number; // 0 to 90
  azimuthDegrees: number; // 0 = North, 90 = East, 180 = South, 270 = West
  orientationName: string;
}

export interface NasaPowerClimatologyData {
  annualDailyKwhM2: number; // ALLSKY_SFC_SW_DWN ANN
  monthlyDailyKwhM2: Record<string, number>; // JAN to DEC
  annualAvgTempC: number; // T2M ANN
  monthlyAvgTempC: Record<string, number>;
  source: string;
  queryCoordinates: { lat: number; lng: number };
  fetchedAt: number;
}

export interface SolarMathCalculation {
  formula: string; // E = A * r * H * PR
  areaM2: number; // A
  panelEfficiencyRatio: number; // r (e.g. 0.20)
  solarIrradianceDailyKwhM2: number; // H (from NASA POWER)
  performanceRatio: number; // PR (e.g. 0.78)
  
  // PR derating breakdown
  deratingFactors: {
    inverterEfficiency: number; // ~0.96
    wiringLosses: number; // ~0.98
    soilingAndDust: number; // ~0.97
    temperatureDerating: number; // based on NASA POWER T2M in Dumaguete (~0.89)
    orientationTiltMismatch: number; // ~0.97
  };

  // Outputs
  dailyEnergyKwh: number;
  monthlyEnergyKwh: number;
  annualEnergyKwh: number;
  recommendedSystemSizeKwp: number;
  
  // Accuracy & confidence disclosure from real literature
  confidenceInterval: {
    percentageMargin: number; // ±10.4% based on Stackhouse et al. & White et al.
    lowAnnualKwh: number;
    highAnnualKwh: number;
    literatureCitation: string;
  };
}

export interface DegradationProfile {
  installationDate: string; // ISO date YYYY-MM-DD
  annualDegradationRatePercent: number; // e.g. 0.7% for tropical climate, 0.5% standard
  literatureCitation: string;
  systemAgeYears: number;
  degradationRetentionFactor: number; // e.g. 0.965 for 5 years at 0.7%/yr
}

export interface FinancialSimulation {
  systemSizeKwp: number;
  panelCount: number;
  estimatedTurnkeyCostPhp: number;
  gridTariffPhpPerKwh: number; // NORECO II default ~12.15 PHP
  annualDegradationPercent: number;
  simulationYears: number; // 1 to 25
  monthlyBillSavingsPhp: number;
  annualBillSavingsPhpYear1: number;
  cumulativeSavingsPhp25Yr: number;
  simplePaybackYears: number;
  net25YearBenefitPhp: number;
  yearlyCashflows: Array<{
    year: number;
    productionKwh: number;
    savingsPhp: number;
    cumulativeSavingsPhp: number;
    netCashflowPhp: number;
  }>;
}

export interface ForecastSolarPayload {
  watts: Record<string, number>;
  watt_hours_period: Record<string, number>;
  watt_hours: Record<string, number>;
  watt_hours_day: Record<string, number>;
  meta: {
    latitude: number;
    longitude: number;
    place: string;
    timezone: string;
    rateLimitRemaining: number;
    rateLimitLimit: number;
  };
  fetchedAt: number;
}

export interface InverterHardwareConnection {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  brand: 'enphase' | 'solaredge' | 'victron' | 'sma' | 'modbus_tcp' | 'none';
  gatewayIpOrHost?: string;
  apiKey?: string;
  lastSuccessfulPing?: number;
  errorMessage?: string;
}

export interface CacheEntryMeta {
  key: string;
  category: 'siting' | 'simulation' | 'live' | 'settings';
  timestamp: number;
  ttlMs: number;
  expiresAt: number;
  sizeBytes: number;
  lastAccessedAt: number;
}

export interface EncryptedCacheStore {
  version: number;
  salt: string; // Hex salt for PBKDF2
  entries: Record<string, {
    iv: string; // Hex IV for AES-GCM
    cipherText: string; // Base64 encrypted payload
    meta: CacheEntryMeta;
  }>;
  totalSizeBytes: number;
}

export interface AppSettings {
  deviceLockEnabled: boolean;
  lockPasscode?: string;
  biometricSupported: boolean;
  locationPermissionGranted: boolean;
  locationRevokedAt?: number;
  platformTheme: 'android' | 'ios';
  airplaneModeSimulated: boolean;
  electricityTariffPhp: number;
  defaultDegradationPercent: number;
  autoLockMinutes: number;
}
