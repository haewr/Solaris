export type BuildingSource = 'open_buildings' | 'microsoft_buildings' | 'osm_buildings' | 'user_manual' | 'map_assisted';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'manual';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [lng, lat] pairs
}

export interface BuildingFootprint {
  id: string;
  geometry: GeoJSONPolygon;
  center: GeoPoint;
  areaM2: number;
  confidence: number;
  source: BuildingSource;
  sourceId?: string;
  address?: string;
  name?: string;
}

export type RoofTiltCategory = 'flat' | 'slight' | 'medium' | 'steep' | 'custom';
export type RoofOrientationCategory = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'unknown';

export interface RoofConfiguration {
  buildingAreaM2?: number;
  usableAreaM2: number;
  usableRatio: number; // e.g. 0.75 for 75%
  tiltDeg: number;
  tiltCategory: RoofTiltCategory;
  azimuthDeg: number; // 0=North, 90=East, 180=South, 270=West
  orientationCategory: RoofOrientationCategory;
  geometrySource: BuildingSource | 'installer_specs' | 'google_solar_optional';
  confidence: ConfidenceLevel;
}

export interface SystemConfiguration {
  systemCapacityKwp: number;
  panelCount: number;
  panelWattage: number; // e.g. 420 W
  inverterCapacityKw: number;
  moduleEfficiency: number; // e.g. 0.21 (21%)
  temperatureCoefficient: number; // e.g. -0.0035 (-0.35%/°C)
  systemLossesPercent: number; // e.g. 13.5%
  configurationSource: 'known_specs' | 'panel_count' | 'roof_derived' | 'manual';
  customLosses?: {
    soiling: number;
    shading: number;
    wiring: number;
    mismatch: number;
    availability: number;
    inverterEfficiency: number;
  };
}

export interface HourlyWeather {
  hour: number;
  timeStr: string;
  timestamp: string;
  ghi: number; // W/m2 Global Horizontal Irradiance
  dni: number; // W/m2 Direct Normal Irradiance
  dhi: number; // W/m2 Diffuse Horizontal Irradiance
  temperatureC: number;
  windSpeedMps: number;
  cloudCoverPercent: number;
  weatherCode: number;
  weatherDescription: string;
}

export interface SolarPosition {
  elevationDeg: number;
  zenithDeg: number;
  azimuthDeg: number;
  solarTimeHours: number;
}

export interface WeatherDataPayload {
  geohash: string;
  lat: number;
  lng: number;
  forecastDate: string;
  provider: 'open_meteo' | 'open_meteo_cache' | 'tropical_climatology';
  fetchedAt: string;
  expiresAt: string;
  hourly: HourlyWeather[];
}

export interface HourlySolarOutput {
  hour: number;
  timeStr: string;
  timestamp: string;
  solarZenithDeg: number;
  solarAzimuthDeg: number;
  solarElevationDeg: number;
  poaIrradianceWm2: number; // Plane of Array Irradiance
  cellTemperatureC: number;
  dcPowerKw: number;
  acPowerKw: number;
  isClipping: boolean;
  cloudCover: number;
}

export interface SolarForecast {
  date: string;
  predictedKwh: number;
  range: {
    lowKwh: number;
    highKwh: number;
  };
  confidence: ConfidenceLevel;
  systemSizeKwp: number;
  estimatedNowKw: number;
  peakHourKw: number;
  peakHourStr: string;
  modelVersion: string; // 'solaris-pv-v1'
  hourly: HourlySolarOutput[];
  weeklyForecast: {
    date: string;
    dayName: string;
    predictedKwh: number;
    weatherDesc: string;
    icon: string;
    tempMax: number;
    cloudCover: number;
  }[];
  monthlyEstimateKwh: {
    month: string;
    kwh: number;
    avgDailyKwh: number;
  }[];
  annualPotentialMwh: number;
  co2SavedKgAnnual: number;
  estimatedSavingsPhpAnnual?: number;
}

export interface Assessment {
  id: string;
  lat: number;
  lng: number;
  address: string;
  locality?: string;
  building?: BuildingFootprint;
  roof: RoofConfiguration;
  system: SystemConfiguration;
  forecast: SolarForecast;
  setupMethod: 'existing_system' | 'map_assisted' | 'manual' | 'auto';
  createdAt: string;
  claimed: boolean;
  notes?: string;
}

export interface SavedRoofProfile {
  id: string;
  name: string;
  assessmentId: string;
  lat: number;
  lng: number;
  address: string;
  systemCapacityKwp: number;
  panelCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnergySnapshot {
  timestamp: string;
  receivedAt: string;
  solarProductionKw: number | null;
  batterySocPercent: number | null;
  batteryFlowKw: number | null; // negative = charging, positive = discharging
  gridFlowKw: number | null; // positive = importing, negative = exporting
  homeConsumptionKw: number | null;
  sourceProvider: string;
  sourceDeviceId?: string;
  quality: 'live' | 'stale' | 'estimated';
}

export type BatteryDispatchStrategy = 'self_consumption' | 'tou_arbitrage' | 'backup_resilience';

export interface BatterySystemConfig {
  enabled: boolean;
  capacityKwh: number;
  maxPowerKw: number;
  roundTripEfficiency: number; // e.g. 0.90 (90%)
  minSocPercent: number; // e.g. 15%
  strategy: BatteryDispatchStrategy;
}

export interface TariffConfig {
  type: 'flat' | 'tou';
  currency: 'PHP' | 'USD' | 'EUR' | 'AUD' | 'GBP';
  currencySymbol: string;
  flatRate: number;
  peakRate: number;
  offPeakRate: number;
  exportFeedInTariff: number; // rate paid for exporting to grid
  peakHours: number[]; // e.g. [14, 15, 16, 17, 18, 19, 20, 21]
}

export interface BatteryHourlyDispatch {
  hour: number;
  timeStr: string;
  solarGenerationKw: number;
  homeLoadKw: number;
  solarToLoadKw: number;
  solarToBatteryKw: number;
  solarToGridKw: number;
  batteryToLoadKw: number;
  gridToLoadKw: number;
  batterySocPercent: number;
  batteryFlowKw: number;
  gridFlowKw: number;
}

export interface FinancialRoiMetrics {
  totalCapex: number;
  solarCapex: number;
  batteryCapex: number;
  annualSolarGenerationKwh: number;
  annualDirectSavings: number;
  annualExportEarnings: number;
  annualTotalFinancialBenefit: number;
  paybackPeriodYears: number;
  roi25YearPercent: number;
  npv25Year: number;
  lcoePerKwh: number;
  gridParityPrice: number;
  lifetimeCo2TonsSaved: number;
  cashflows: Array<{
    year: number;
    solarGenerationKwh: number;
    annualSavings: number;
    netCumulativeCashflow: number;
    degradedCapacityRatio: number;
  }>;
}

export interface HardwareGatewayConnection {
  id: string;
  brand: 'enphase' | 'solaredge' | 'fronius' | 'victron' | 'sma' | 'sunspec_modbus' | 'home_assistant' | 'csv_upload';
  name: string;
  status: 'online' | 'standby' | 'simulated';
  endpointOrSerial: string;
  inverterModel?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  lastHeartbeat: string;
  currentPowerAcKw: number;
  dailyYieldKwh: number;
  gridFrequencyHz: number;
  gridVoltageV: number;
  inverterTempC: number;
  efficiencyPercent: number;
}

export interface HistoricalComparisonRecord {
  date: string;
  dayLabel: string;
  expectedKwh: number;
  actualKwh: number;
  performanceRatio: number;
  irradianceGhi: number;
  weatherCondition: string;
  varianceNote: string;
}

