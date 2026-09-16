import { HardwareGatewayConnection, EnergySnapshot } from '../types/solaris';

export const supportedGatewayPresets: Array<{
  brand: HardwareGatewayConnection['brand'];
  name: string;
  description: string;
  defaultPortOrEndpoint: string;
  iconType: string;
}> = [
  {
    brand: 'enphase',
    name: 'Enphase Envoy / IQ Gateway',
    description: 'Direct local API via envoy.local or Envoy Token Auth (v7+ firmware)',
    defaultPortOrEndpoint: 'https://envoy.local/production.json',
    iconType: 'zap',
  },
  {
    brand: 'solaredge',
    name: 'SolarEdge Monitoring API',
    description: 'Cloud REST API with Site API Key and Site ID',
    defaultPortOrEndpoint: 'https://monitoringapi.solaredge.com/site/{siteId}/overview',
    iconType: 'activity',
  },
  {
    brand: 'fronius',
    name: 'Fronius Solar.web API / Datamanager',
    description: 'Local Solar API (GetPowerFlowRealtimeData.fcgi)',
    defaultPortOrEndpoint: 'http://fronius.local/solar_api/v1/GetPowerFlowRealtimeData.fcgi',
    iconType: 'sun',
  },
  {
    brand: 'victron',
    name: 'Victron Venus OS / Color Control GX',
    description: 'Local MQTT or Modbus-TCP VRM interface',
    defaultPortOrEndpoint: 'mqtt://venus.local:1883',
    iconType: 'battery',
  },
  {
    brand: 'sma',
    name: 'SMA Sunny Boy / Speedwire',
    description: 'WebConnect Speedwire & SMA Data Manager',
    defaultPortOrEndpoint: 'http://sma-inverter.local/dyn/getDashValues.json',
    iconType: 'shield',
  },
  {
    brand: 'sunspec_modbus',
    name: 'SunSpec Modbus TCP Gateway',
    description: 'IEEE 1547 compliant industrial inverter registers over Port 502',
    defaultPortOrEndpoint: 'tcp://192.168.1.120:502',
    iconType: 'server',
  },
  {
    brand: 'home_assistant',
    name: 'Home Assistant Webhook / WebSocket',
    description: 'Stream sensor.solar_power, sensor.battery_soc, sensor.grid_power',
    defaultPortOrEndpoint: 'http://homeassistant.local:8123/api/states',
    iconType: 'home',
  },
  {
    brand: 'csv_upload',
    name: 'CSV Interval Telemetry Import',
    description: 'Drag & drop inverter 15-minute generation logs or utility smart meter CSV',
    defaultPortOrEndpoint: 'local_csv_file',
    iconType: 'file',
  },
];

export function createSimulatedGateway(
  brand: HardwareGatewayConnection['brand'] = 'enphase',
  systemCapacityKwp: number = 6.0
): HardwareGatewayConnection {
  const brandInfo = supportedGatewayPresets.find((p) => p.brand === brand) || supportedGatewayPresets[0];

  return {
    id: `gw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    brand,
    name: brandInfo.name,
    status: 'online',
    endpointOrSerial: brandInfo.defaultPortOrEndpoint,
    inverterModel: `${brand.toUpperCase()}-ST7000-PLUS`,
    serialNumber: `SN-${Math.floor(10000000 + Math.random() * 90000000)}`,
    firmwareVersion: 'v4.19.2-prod',
    lastHeartbeat: new Date().toISOString(),
    currentPowerAcKw: Math.round(systemCapacityKwp * 0.72 * 100) / 100,
    dailyYieldKwh: Math.round(systemCapacityKwp * 4.2 * 10) / 10,
    gridFrequencyHz: 60.02,
    gridVoltageV: 231.4,
    inverterTempC: 44.8,
    efficiencyPercent: 97.4,
  };
}

export function parseInverterCsvData(csvText: string): Array<{
  timestamp: string;
  solarKw: number;
  consumptionKw: number;
  batterySoc: number;
}> {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const results: Array<{
    timestamp: string;
    solarKw: number;
    consumptionKw: number;
    batterySoc: number;
  }> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length >= 2) {
      const timestamp = cols[0] || `Hour ${i}`;
      const solarKw = parseFloat(cols[1]) || 0;
      const consumptionKw = parseFloat(cols[2]) || 1.2;
      const batterySoc = parseFloat(cols[3]) || 75;

      results.push({
        timestamp,
        solarKw: Math.max(0, solarKw),
        consumptionKw: Math.max(0, consumptionKw),
        batterySoc: Math.min(100, Math.max(0, batterySoc)),
      });
    }
  }

  return results;
}
