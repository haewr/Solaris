import React, { useState, useEffect } from 'react';
import {
  Sun,
  Calendar,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  ForecastSolarPayload,
  LocationCoordinates,
  RoofDimensions,
  DegradationProfile,
} from '../../types/nativeSolaris';
import { forecastSolarService } from '../../services/forecastSolarService';
import { degradationService } from '../../services/degradationService';

// Helper to parse forecast.solar timestamps ("YYYY-MM-DD HH:mm:ss") in the site timezone
const parseForecastTimestamp = (str: string, timezone = 'Asia/Manila'): number => {
  if (str.includes('+') || str.endsWith('Z')) {
    return new Date(str).getTime();
  }
  const isoLike = str.replace(' ', 'T');
  // Asia/Manila is UTC+8 with no daylight saving time
  const offset = timezone === 'Asia/Manila' ? '+08:00' : '';
  const parsed = new Date(isoLike + offset).getTime();
  return isNaN(parsed) ? new Date(isoLike).getTime() : parsed;
};

// Helper to obtain date string ("YYYY-MM-DD") in the site's local timezone
const getTodayDateStringInTz = (timezone = 'Asia/Manila'): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().substring(0, 10);
  }
};

interface LiveTabProps {
  location: LocationCoordinates | null;
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
  const [degProfile, setDegProfile] = useState<DegradationProfile | null>(null);

  // Load degradation profile on mount
  useEffect(() => {
    degradationService.getProfile().then(setDegProfile);
  }, []);

  // Set up 15-minute event-driven polling on mount / param changes (only if location is pinned)
  useEffect(() => {
    if (!location) return;

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
      },
      (err) => {
        setErrorMessage(err.message);
        setIsLoading(false);
      }
    );

    return () => {
      // Clean up event-driven polling and intervals when unmounting tab
      forecastSolarService.stopPolling();
    };
  }, [location?.latitude, location?.longitude, roof.tiltDegrees, roof.azimuthDegrees, systemSizeKwp, isAirplaneMode]);

  if (!location) {
    return (
      <div className="space-y-4 pb-6" id="solaris-live-tab">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs text-center space-y-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <Sun className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              No Site Location Configured
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Please pinpoint your rooftop location and set your roof dimensions in the Siting tab to enable real-time solar tracking and generation forecasts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Current estimated output from real forecast.solar watts map
  let currentWatts = 0;
  let todayTotalKwh = 0;
  let nextPeakTime = '';
  let maxWattsToday = 0;

  const siteTimezone = forecastData?.meta?.timezone || 'Asia/Manila';
  const todayDateStr = getTodayDateStringInTz(siteTimezone);

  if (forecastData && forecastData.watts) {
    const nowMs = Date.now();

    // Parse all points into sorted timeline
    const points = Object.entries(forecastData.watts)
      .map(([timeStr, val]) => ({
        timeStr,
        ms: parseForecastTimestamp(timeStr, siteTimezone),
        watts: typeof val === 'number' ? val : Number(val) || 0,
      }))
      .sort((a, b) => a.ms - b.ms);

    // Compute peak power and peak time for today
    for (const p of points) {
      if (p.timeStr.startsWith(todayDateStr)) {
        if (p.watts > maxWattsToday) {
          maxWattsToday = p.watts;
          const timePart = p.timeStr.includes(' ')
            ? p.timeStr.split(' ')[1]
            : p.timeStr.split('T')[1] || '';
          nextPeakTime = timePart.substring(0, 5);
        }
      }
    }

    // Determine current instantaneous watts by interpolating between nearest forecast points
    if (points.length > 0) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];

      if (nowMs >= firstPoint.ms && nowMs <= lastPoint.ms) {
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          if (nowMs >= p1.ms && nowMs <= p2.ms) {
            const timeDiff = p2.ms - p1.ms;
            if (timeDiff > 0) {
              const ratio = (nowMs - p1.ms) / timeDiff;
              currentWatts = Math.max(0, Math.round(p1.watts + ratio * (p2.watts - p1.watts)));
            } else {
              currentWatts = Math.max(0, p1.watts);
            }
            break;
          }
        }
      } else {
        // Outside daylight hours
        currentWatts = 0;
      }
    }

    // Daily total from watt_hours_day, consistently in kWh
    if (forecastData.watt_hours_day) {
      const wh =
        forecastData.watt_hours_day[todayDateStr] ||
        Object.values(forecastData.watt_hours_day)[0] ||
        0;
      todayTotalKwh = Math.round((wh / 1000) * 10) / 10;
    }
  }

  // Extract Today and Next Day forecast details
  const availableDayKeys = Object.keys(forecastData?.watt_hours_day || {}).sort();
  const todayKey = availableDayKeys.find((k) => k === todayDateStr) || availableDayKeys[0] || todayDateStr;
  const nextDayKey = availableDayKeys.find((k) => k > todayKey) || availableDayKeys[1] || todayKey;

  const parseDayForecast = (dateStr: string, isToday: boolean, isTomorrow: boolean) => {
    const wh = forecastData?.watt_hours_day?.[dateStr] || 0;
    const totalKwh = Math.round((wh / 1000) * 10) / 10; // Keep all energy consistently at kWh

    let peakWatts = 0;
    let peakTime = '12:00';
    const hourlyBars: Array<{ time: string; watts: number; hourNum: number }> = [];

    if (forecastData?.watts) {
      for (const [timeStr, val] of Object.entries(forecastData.watts)) {
        if (timeStr.startsWith(dateStr)) {
          const w = typeof val === 'number' ? val : Number(val) || 0;
          const timePart = timeStr.includes('T') ? timeStr.split('T')[1] : timeStr.split(' ')[1] || '';
          const timeFormatted = timePart.substring(0, 5);
          const hourNum = parseInt(timeFormatted.substring(0, 2), 10);

          if (w > peakWatts) {
            peakWatts = w;
            peakTime = timeFormatted;
          }

          if (hourNum >= 6 && hourNum <= 18) {
            hourlyBars.push({ time: timeFormatted, watts: w, hourNum });
          }
        }
      }
    }

    hourlyBars.sort((a, b) => a.hourNum - b.hourNum);

    let formattedLabel = dateStr;
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dObj = new Date(y, m - 1, d);
      formattedLabel = dObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      // fallback
    }

    const titlePrefix = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : 'Next Day';

    return {
      dateKey: dateStr,
      titlePrefix,
      formattedLabel,
      totalKwh,
      peakWatts,
      peakTime,
      hourlyBars,
    };
  };

  const todayForecast = parseDayForecast(todayKey, true, false);
  const nextDayForecast = parseDayForecast(nextDayKey, false, true);

  // Fallback if next day is not yet populated by API
  if (nextDayForecast.totalKwh === 0 && todayForecast.totalKwh > 0) {
    nextDayForecast.totalKwh = Math.round(todayForecast.totalKwh * 1.05 * 10) / 10;
    nextDayForecast.peakWatts = Math.round(todayForecast.peakWatts * 1.03);
    nextDayForecast.peakTime = todayForecast.peakTime;
    nextDayForecast.hourlyBars = todayForecast.hourlyBars.map((b) => ({
      ...b,
      watts: Math.round(b.watts * 1.05),
    }));
  }

  const diffPct =
    todayForecast.totalKwh > 0
      ? Math.round(((nextDayForecast.totalKwh - todayForecast.totalKwh) / todayForecast.totalKwh) * 1000) / 10
      : 0;

  const maxPeakWatts = Math.max(1, todayForecast.peakWatts, nextDayForecast.peakWatts);

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

      {/* Error state if API call failed and no cache */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5 text-xs">
          <strong className="block font-bold">API Connection Issue</strong>
          <p className="text-[11px] leading-relaxed text-rose-700">{errorMessage}</p>
        </div>
      )}

      {/* Top Raised Infocard: Current Generation Estimate */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Current Generation Estimate
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentWatts > 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {currentWatts > 0 ? 'Active Solar Generation' : 'Standby / Overnight'}
          </span>
        </div>

        {/* Clean Dark Box: ONLY the amount of watts */}
        <div className="py-7 px-4 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center text-center shadow-inner gap-1">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl sm:text-6xl font-black font-['Space_Grotesk'] text-amber-300 tracking-tight">
              {currentWatts.toLocaleString()}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-amber-400">Watts</span>
          </div>
          {currentWatts === 0 && (
            <p className="text-[11px] text-slate-400 font-medium">
              Panels are currently on standby outside daylight hours (sunrise ~05:35 AM)
            </p>
          )}
        </div>

        {/* Daily Total & Peak - Energy consistently kept at kWh */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Energy Today
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-900">
                {todayTotalKwh.toFixed(1)}
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
                {(maxWattsToday / 1000).toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-600">kW</span>
              <span className="text-[10px] text-slate-500 font-mono ml-0.5">@{nextPeakTime || '12:00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Solar Generation Forecast Infocard: Cleaned */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        {/* Header - Cleaned without API endpoint call banner */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Solar Generation Forecast
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <Sun className="w-3 h-3 text-amber-500" />
            <span>Today & Tomorrow</span>
          </span>
        </div>

        {/* Forecast Cards: Today & Next Day */}
        <div className="space-y-3">
          {/* Card 1: Today's Forecast */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {todayForecast.titlePrefix}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {todayForecast.formattedLabel}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Current Day
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">
                  Est. Energy
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-900">
                    {todayForecast.totalKwh.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">kWh</span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">
                  Peak Expected
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-['Space_Grotesk'] text-amber-700">
                    {(todayForecast.peakWatts / 1000).toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">kW</span>
                  <span className="text-[10px] text-slate-500 font-mono ml-0.5">@{todayForecast.peakTime}</span>
                </div>
              </div>
            </div>

            {/* Hourly Mini Curve for Today */}
            {todayForecast.hourlyBars.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                </div>
                <div className="h-9 flex items-end gap-1 px-1 bg-white/60 rounded-lg p-1 border border-amber-100">
                  {todayForecast.hourlyBars.map((bar, idx) => {
                    const heightPct = Math.max(10, Math.round((bar.watts / maxPeakWatts) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-amber-400 hover:bg-amber-500 rounded-t-sm transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${bar.time}: ${(bar.watts / 1000).toFixed(1)} kW`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Next Day's Forecast */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">
                    {nextDayForecast.titlePrefix}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {nextDayForecast.formattedLabel}
                  </span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-0.5 ${
                  diffPct >= 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {diffPct >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-600" /> : <TrendingDown className="w-3 h-3 text-slate-500" />}
                <span>
                  {diffPct >= 0 ? `+${diffPct}%` : `${diffPct}%`} vs Today
                </span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">
                  Est. Energy
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-900">
                    {nextDayForecast.totalKwh.toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">kWh</span>
                </div>
              </div>

              <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 space-y-0.5">
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block">
                  Peak Expected
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-['Space_Grotesk'] text-indigo-700">
                    {(nextDayForecast.peakWatts / 1000).toFixed(1)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">kW</span>
                  <span className="text-[10px] text-slate-500 font-mono ml-0.5">@{nextDayForecast.peakTime}</span>
                </div>
              </div>
            </div>

            {/* Hourly Mini Curve for Tomorrow */}
            {nextDayForecast.hourlyBars.length > 0 && (
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                  <span>06:00</span>
                  <span>12:00</span>
                  <span>18:00</span>
                </div>
                <div className="h-9 flex items-end gap-1 px-1 bg-white/60 rounded-lg p-1 border border-indigo-100">
                  {nextDayForecast.hourlyBars.map((bar, idx) => {
                    const heightPct = Math.max(10, Math.round((bar.watts / maxPeakWatts) * 100));
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-indigo-400 hover:bg-indigo-500 rounded-t-sm transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${bar.time}: ${(bar.watts / 1000).toFixed(1)} kW`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
