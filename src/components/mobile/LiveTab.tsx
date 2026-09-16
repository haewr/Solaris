import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Radio,
  Clock,
  AlertTriangle,
  RefreshCw,
  Cpu,
  ShieldCheck,
  BatteryCharging,
  Layers,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import {
  ForecastSolarPayload,
  InverterHardwareConnection,
  LocationCoordinates,
  RoofDimensions,
  DegradationProfile,
} from '../../types/nativeSolaris';
import { forecastSolarService } from '../../services/forecastSolarService';
import { degradationService } from '../../services/degradationService';
import { HardwareGatewaySetupSheet } from './HardwareGatewaySetupSheet';

interface LiveTabProps {
  location: LocationCoordinates;
  roof: RoofDimensions;
  systemSizeKwp: number;
  isAirplaneMode: boolean;
}

export const LiveTab: React.FC<LiveTabProps> = ({
  location,
  roof,
  systemSizeKwp,
  isAirplaneMode,
}) => {
  const [forecastData, setForecastData] = useState<ForecastSolarPayload | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateStatus, setRateStatus] = useState(forecastSolarService.getRateLimitStatus());
  const [hardwareConnection, setHardwareConnection] = useState<InverterHardwareConnection>({
    status: 'disconnected',
    brand: 'none',
  });
  const [showGatewaySheet, setShowGatewaySheet] = useState(false);
  const [degProfile, setDegProfile] = useState<DegradationProfile | null>(null);

  // Load degradation profile on mount
  useEffect(() => {
    degradationService.getProfile().then(setDegProfile);
  }, []);

  // Set up 15-minute event-driven polling on mount / param changes
  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    forecastSolarService.startPolling(
      location.latitude,
      location.longitude,
      roof.tiltDegrees,
      roof.azimuthDegrees,
      systemSizeKwp || 3.5,
      (data, fromCache) => {
        setForecastData(data);
        setIsFromCache(fromCache);
        if (fromCache) {
          setCacheTimestamp(data.fetchedAt);
        }
        setIsLoading(false);
        setRateStatus(forecastSolarService.getRateLimitStatus());
      },
      (err) => {
        setErrorMessage(err.message);
        setIsLoading(false);
        setRateStatus(forecastSolarService.getRateLimitStatus());
      }
    );

    return () => {
      // Clean up event-driven polling and intervals when unmounting tab
      forecastSolarService.stopPolling();
    };
  }, [location.latitude, location.longitude, roof.tiltDegrees, roof.azimuthDegrees, systemSizeKwp, isAirplaneMode]);

  const handleManualRefresh = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await forecastSolarService.fetchForecast(
        location.latitude,
        location.longitude,
        roof.tiltDegrees,
        roof.azimuthDegrees,
        systemSizeKwp || 3.5,
        isAirplaneMode
      );
      setForecastData(res.data);
      setIsFromCache(res.fromCache);
      setCacheTimestamp(res.cacheTimestamp);
      setRateStatus(forecastSolarService.getRateLimitStatus());
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Find current estimated output from real forecast.solar watts map
  let currentWatts = 0;
  let todayTotalKwh = 0;
  let nextPeakTime = '';
  let maxWattsToday = 0;

  if (forecastData && forecastData.watts) {
    const nowIso = new Date();
    const currentHourStr = nowIso.toISOString().substring(0, 13); // "YYYY-MM-DDTHH"
    const todayDateStr = nowIso.toISOString().substring(0, 10);

    // Look up closest hour
    for (const [timeStr, val] of Object.entries(forecastData.watts)) {
      const watts = typeof val === 'number' ? val : Number(val) || 0;
      if (timeStr.startsWith(todayDateStr)) {
        if (watts > maxWattsToday) {
          maxWattsToday = watts;
          nextPeakTime = timeStr.substring(11, 16);
        }
      }
      if (timeStr.startsWith(currentHourStr)) {
        currentWatts = watts;
      }
    }

    // Daily total from watt_hours_day
    if (forecastData.watt_hours_day) {
      const wh = forecastData.watt_hours_day[todayDateStr] || Object.values(forecastData.watt_hours_day)[0] || 0;
      todayTotalKwh = Math.round((wh / 1000) * 10) / 10;
    }
  }

  return (
    <div className="space-y-4 pb-6" id="solaris-live-tab">
      {/* Offline Cached Warning Banner */}
      {isFromCache && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <div className="leading-tight">
            <strong>Showing Last Real Cached Reading</strong>
            <span className="block text-[10px] text-amber-700">
              Fetched from satellite {cacheTimestamp ? new Date(cacheTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier'}. No connection active.
            </span>
          </div>
        </div>
      )}

      {/* Strict Rate Limit Guard Banner (<= 12 calls/hour) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Live Satellite Polling (15-Min Cadence)
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              rateStatus.callsInPastHour >= 10
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {rateStatus.callsInPastHour} / {rateStatus.limitPerHour} calls/hr
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>Polling: 15-minute interval • Auto-sleep when backgrounded</span>
          <button
            onClick={handleManualRefresh}
            disabled={isLoading || !rateStatus.canCallNow}
            className="flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Querying...' : 'Poll Now'}</span>
          </button>
        </div>

        {!rateStatus.canCallNow && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium">
            Strict IP Rate Limit reached (12 calls/hr). Next call allowed in {rateStatus.secondsUntilNextAvailable}s.
          </div>
        )}
      </div>

      {/* Error state if API call failed and no cache */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5 text-xs">
          <strong className="block font-bold">API Connection Issue</strong>
          <p className="text-[11px] leading-relaxed text-rose-700">{errorMessage}</p>
        </div>
      )}

      {/* Live Physical Satellite Irradiance Output */}
      {forecastData && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Real Satellite Sky Generation
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>forecast.solar API</span>
            </span>
          </div>

          {/* Current Watts Display */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                Expected Instantaneous Power
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">
                {degProfile ? `Degradation Adj: ${(degProfile.degradationRetentionFactor * 100).toFixed(1)}%` : ''}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black font-['Space_Grotesk'] text-amber-300 tracking-tight">
                {currentWatts.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-amber-400">Watts</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Derived from high-resolution satellite atmospheric clearness models for {location.latitude.toFixed(3)}°N, {location.longitude.toFixed(3)}°E at {roof.tiltDegrees}° tilt.
            </p>
          </div>

          {/* Daily Total & Peak */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Energy Today
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-900">
                  {todayTotalKwh}
                </span>
                <span className="text-xs font-semibold text-slate-600">kWh</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Peak Expected Hour
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold font-['Space_Grotesk'] text-indigo-700">
                  {maxWattsToday}W
                </span>
                <span className="text-[10px] text-slate-500 font-mono">@{nextPeakTime || '12:00'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Honest Inverter Hardware Connection Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Physical Inverter Telemetry
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hardwareConnection.status === 'connected'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {hardwareConnection.status === 'connected' ? 'Gateway Linked' : 'No Device Connected'}
          </span>
        </div>

        {hardwareConnection.status === 'disconnected' ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <p className="text-slate-600 leading-relaxed text-[11px]">
              <strong>No on-premise inverter connected.</strong> Solaris does not fake or simulate inverter telemetry with artificial sliders. To view internal MPPT string voltages, inverter temperatures, or live AC feed-in, configure your gateway.
            </p>
            <button
              onClick={() => setShowGatewaySheet(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Connect Physical Gateway (Modbus / Envoy / SolarEdge)</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-emerald-900 font-bold">
                Linked: {hardwareConnection.brand.toUpperCase()}
              </strong>
              <span className="text-[10px] text-emerald-700 font-mono">
                Host: {hardwareConnection.gatewayIpOrHost || 'Cloud'}
              </span>
            </div>
            <button
              onClick={() => setShowGatewaySheet(true)}
              className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950"
            >
              Modify Gateway Settings
            </button>
          </div>
        )}
      </div>

      {/* Gateway Sheet Modal */}
      {showGatewaySheet && (
        <HardwareGatewaySetupSheet
          connection={hardwareConnection}
          onSaveConnection={(conn) => setHardwareConnection(conn)}
          onClose={() => setShowGatewaySheet(false)}
        />
      )}
    </div>
  );
};
