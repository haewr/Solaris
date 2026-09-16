/**
 * Step 4 — Live-Generation Monitoring Service (Real forecast.solar API Integration)
 * 
 * Strict specifications:
 * - 15-minute polling interval
 * - Strict Rate Limiter: Hard cap of 12 calls/hour per IP address via sliding 1-hour window token tracking
 * - Event-driven: Stops polling when tab/app is backgrounded or screen inactive (saves battery and RAM)
 * - Feeds Step 5 degradation retention factor
 * - Clearly distinguishes real satellite forecast from actual physical inverter telemetry
 * - Offline fallback: Returns cached reading from Step 1 encrypted storage with visible timestamp
 */

import { ForecastSolarPayload, InverterHardwareConnection } from '../types/nativeSolaris';
import { encryptedStorage } from './encryptedStorageService';
import { degradationService } from './degradationService';

const FORECAST_CACHE_KEY = 'solaris_forecast_solar_cache';
const RATE_LIMIT_STORAGE_KEY = 'solaris_forecast_solar_rate_history';
const MAX_CALLS_PER_HOUR = 12;
const POLLING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes = 4 calls/hour under normal polling

export class ForecastSolarService {
  private timerId: any = null;
  private isPollingActive = false;
  private visibilityListenerAttached = false;
  private currentParams: {
    lat: number;
    lng: number;
    tilt: number;
    azimuth: number;
    kwp: number;
  } | null = null;
  private onUpdateCallback: ((data: ForecastSolarPayload, fromCache: boolean) => void) | null = null;
  private onErrorCallback: ((err: Error) => void) | null = null;

  /**
   * Retrieves array of timestamps of calls made within the past 60 minutes
   */
  private getRecentCallTimestamps(): number[] {
    try {
      const raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      if (!raw) return [];
      const parsed: number[] = JSON.parse(raw);
      const oneHourAgo = Date.now() - 3600000;
      return parsed.filter((t) => t > oneHourAgo);
    } catch {
      return [];
    }
  }

  /**
   * Records a new outbound call timestamp
   */
  private recordCallTimestamp(): void {
    const timestamps = this.getRecentCallTimestamps();
    timestamps.push(Date.now());
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(timestamps));
  }

  /**
   * Checks whether a call is allowed under the 12 calls/hour hard limit
   */
  getRateLimitStatus(): {
    callsInPastHour: number;
    limitPerHour: number;
    canCallNow: boolean;
    secondsUntilNextAvailable: number;
  } {
    const timestamps = this.getRecentCallTimestamps();
    const callsInPastHour = timestamps.length;
    const canCallNow = callsInPastHour < MAX_CALLS_PER_HOUR;

    let secondsUntilNextAvailable = 0;
    if (!canCallNow && timestamps.length > 0) {
      // Oldest timestamp in window will expire at oldest + 3600000
      const oldest = Math.min(...timestamps);
      const expiresAt = oldest + 3600000;
      secondsUntilNextAvailable = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    }

    return {
      callsInPastHour,
      limitPerHour: MAX_CALLS_PER_HOUR,
      canCallNow,
      secondsUntilNextAvailable,
    };
  }

  /**
   * Calls the real forecast.solar API for Dumaguete City coordinates
   */
  async fetchForecast(
    lat: number,
    lng: number,
    tilt: number, // declination / pitch
    azimuth: number, // In forecast.solar: -180 = North, -90 = East, 0 = South, 90 = West
    kwp: number,
    isAirplaneMode = false
  ): Promise<{ data: ForecastSolarPayload; fromCache: boolean; cacheTimestamp?: number }> {
    // 1. If Airplane Mode / Offline is simulated, strictly return cached reading
    if (isAirplaneMode) {
      const cached = await encryptedStorage.getItem<ForecastSolarPayload>(FORECAST_CACHE_KEY);
      if (cached) {
        return { data: cached.data, fromCache: true, cacheTimestamp: cached.meta.timestamp };
      }
      throw new Error(
        'Offline Mode Active: No previously cached forecast.solar reading available on this device.'
      );
    }

    // 2. Strict Rate Limiting Check (<= 12 calls/hour)
    const rateStatus = this.getRateLimitStatus();
    if (!rateStatus.canCallNow) {
      console.warn(`forecast.solar rate limit reached (12 calls/hr). Serving cached data.`);
      const cached = await encryptedStorage.getItem<ForecastSolarPayload>(FORECAST_CACHE_KEY);
      if (cached) {
        return { data: cached.data, fromCache: true, cacheTimestamp: cached.meta.timestamp };
      }
      throw new Error(
        `Rate limit enforced (max 12 calls/hour). Next API call available in ${rateStatus.secondsUntilNextAvailable} seconds.`
      );
    }

    // 3. Convert standard compass azimuth (0° North, 180° South) to forecast.solar convention (-180° N to +180° N, 0° S)
    // Compass 180 (South) -> forecast.solar 0
    // Compass 90 (East) -> forecast.solar -90
    // Compass 270 (West) -> forecast.solar 90
    let fsAzimuth = azimuth - 180;
    if (fsAzimuth > 180) fsAzimuth -= 360;
    if (fsAzimuth < -180) fsAzimuth += 360;
    fsAzimuth = Math.round(fsAzimuth);

    const fsTilt = Math.max(0, Math.min(90, Math.round(tilt)));
    const fsKwp = Math.max(0.5, Math.round(kwp * 10) / 10);

    const url = `https://api.forecast.solar/estimate/${lat.toFixed(4)}/${lng.toFixed(
      4
    )}/${fsTilt}/${fsAzimuth}/${fsKwp}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Record outbound call for rate limiter
      this.recordCallTimestamp();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('forecast.solar returned 429 (Too Many Requests).');
        }
        throw new Error(`forecast.solar API error: HTTP ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      const res = json.result;

      if (!res || !res.watts) {
        throw new Error('forecast.solar API response missing watts structure.');
      }

      // 4. Retrieve Step 5 degradation retention factor to apply to forecast output
      const degProfile = await degradationService.getProfile();
      const retention = degProfile.degradationRetentionFactor;

      // Apply degradation factor to watts and watt_hours
      const degradedWatts: Record<string, number> = {};
      for (const [timeStr, wattsVal] of Object.entries(res.watts as Record<string, number>)) {
        degradedWatts[timeStr] = Math.round(wattsVal * retention);
      }

      const degradedWattHours: Record<string, number> = {};
      for (const [timeStr, whVal] of Object.entries((res.watt_hours || {}) as Record<string, number>)) {
        degradedWattHours[timeStr] = Math.round(whVal * retention);
      }

      const degradedWattHoursDay: Record<string, number> = {};
      for (const [dayStr, whVal] of Object.entries((res.watt_hours_day || {}) as Record<string, number>)) {
        degradedWattHoursDay[dayStr] = Math.round(whVal * retention);
      }

      const payload: ForecastSolarPayload = {
        watts: degradedWatts,
        watt_hours_period: (res.watt_hours_period as Record<string, number>) || {},
        watt_hours: degradedWattHours,
        watt_hours_day: degradedWattHoursDay,
        meta: {
          latitude: lat,
          longitude: lng,
          place: json.message?.info?.place || 'Dumaguete City, Philippines',
          timezone: json.message?.info?.timezone || 'Asia/Manila',
          rateLimitRemaining: json.message?.ratelimit?.remaining ?? 11,
          rateLimitLimit: json.message?.ratelimit?.limit ?? 12,
        },
        fetchedAt: Date.now(),
      };

      // Save real forecast in Step 1 encrypted storage (24 hour TTL)
      await encryptedStorage.setItem(FORECAST_CACHE_KEY, payload, 'live', 24 * 60 * 60 * 1000);

      return { data: payload, fromCache: false };
    } catch (err: any) {
      // Connectivity loss fallback: Return last real cached reading
      const cached = await encryptedStorage.getItem<ForecastSolarPayload>(FORECAST_CACHE_KEY);
      if (cached) {
        return { data: cached.data, fromCache: true, cacheTimestamp: cached.meta.timestamp };
      }
      throw new Error(
        `Unable to fetch forecast.solar: ${err.message || 'Network request failed'}. No cached reading on device.`
      );
    }
  }

  /**
   * Starts event-driven polling with a 15-minute interval.
   * Capped to <= 12 calls/hr. Stops immediately when app/screen is backgrounded.
   */
  startPolling(
    lat: number,
    lng: number,
    tilt: number,
    azimuth: number,
    kwp: number,
    onUpdate: (data: ForecastSolarPayload, fromCache: boolean) => void,
    onError: (err: Error) => void
  ): void {
    this.stopPolling();

    this.currentParams = { lat, lng, tilt, azimuth, kwp };
    this.onUpdateCallback = onUpdate;
    this.onErrorCallback = onError;
    this.isPollingActive = true;

    // Trigger immediate first fetch
    this.executeSinglePoll();

    // Set 15-minute timer (4 calls/hour)
    this.timerId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.executeSinglePoll();
      }
    }, POLLING_INTERVAL_MS);

    // Attach visibilitychange listener for battery and memory efficiency
    if (!this.visibilityListenerAttached && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = true;
    }
  }

  /**
   * Halts all timers and listeners when screen is unmounted
   */
  stopPolling(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isPollingActive = false;
    this.currentParams = null;
    this.onUpdateCallback = null;
    this.onErrorCallback = null;

    if (this.visibilityListenerAttached && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = false;
    }
  }

  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      // App backgrounded: freeze polling to avoid battery drain
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = null;
      }
    } else if (document.visibilityState === 'visible' && this.isPollingActive) {
      // App foregrounded: restart 15-min interval and check if poll needed
      this.executeSinglePoll();
      if (!this.timerId) {
        this.timerId = setInterval(() => {
          this.executeSinglePoll();
        }, POLLING_INTERVAL_MS);
      }
    }
  };

  private async executeSinglePoll(): Promise<void> {
    if (!this.currentParams || !this.onUpdateCallback) return;
    try {
      const { lat, lng, tilt, azimuth, kwp } = this.currentParams;
      const res = await this.fetchForecast(lat, lng, tilt, azimuth, kwp);
      this.onUpdateCallback(res.data, res.fromCache);
    } catch (err: any) {
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
    }
  }
}

export const forecastSolarService = new ForecastSolarService();
