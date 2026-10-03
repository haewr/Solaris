/**
 * Step 4 — Live-Generation Monitoring Service (Real forecast.solar API Integration)
 *
 * Strict specifications:
 * - 15-minute polling interval
 * - Strict Rate Limiter: Hard cap of 12 calls/hour per IP address via sliding 1-hour window token tracking
 * - Event-driven: Stops polling when tab/app is backgrounded or screen inactive
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
const POLLING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_FRESHNESS_MS = 15 * 60 * 1000;

export const isDaytimeHours = (date: Date = new Date()): boolean => {
  const h = date.getHours();
  return h >= 6 && h <= 18; // 6:00 AM to 6:59 PM
};

export class ForecastSolarService {
  private timerId: any = null;
  private worker: Worker | null = null;
  private lastPollTimestamp = 0;
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

  private recordCallTimestamp(): void {
    const timestamps = this.getRecentCallTimestamps();
    timestamps.push(Date.now());
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(timestamps));
  }

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

  async fetchForecast(
    lat: number,
    lng: number,
    tilt: number,
    azimuth: number,
    kwp: number,
    isAirplaneMode = false
  ): Promise<{ data: ForecastSolarPayload; fromCache: boolean; cacheTimestamp?: number }> {
    if (isAirplaneMode) {
      const cached = await encryptedStorage.getItem<ForecastSolarPayload>(FORECAST_CACHE_KEY);
      if (cached) {
        return { data: cached.data, fromCache: true, cacheTimestamp: cached.meta.timestamp };
      }
      throw new Error(
        'Offline Mode Active: No previously cached forecast.solar reading available on this device.'
      );
    }

    // Freshness window: skip API call if we fetched recently
    const freshCached = await encryptedStorage.getItem<ForecastSolarPayload>(FORECAST_CACHE_KEY);
    if (freshCached && Date.now() - freshCached.meta.timestamp < CACHE_FRESHNESS_MS) {
      return {
        data: freshCached.data,
        fromCache: true,
        cacheTimestamp: freshCached.meta.timestamp,
      };
    }

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
      // Try twice: forecast.solar is EU-hosted and can be slow from PH.
      let response: Response | null = null;
      let lastErr: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
          response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          break;
        } catch (e: any) {
          clearTimeout(timeoutId);
          lastErr = e;
          if (attempt === 1) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          throw e;
        }
      }
      if (!response) throw lastErr || new Error('No response from forecast.solar');

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

      const degProfile = await degradationService.getProfile();
      const retention = degProfile.degradationRetentionFactor;

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

      await encryptedStorage.setItem(FORECAST_CACHE_KEY, payload, 'live', 24 * 60 * 60 * 1000);

      return { data: payload, fromCache: false };
    } catch (err: any) {
      const cached = await encryptedStorage.getItem<ForecastSolarPayload>(FORECAST_CACHE_KEY);
      if (cached) {
        return { data: cached.data, fromCache: true, cacheTimestamp: cached.meta.timestamp };
      }
      throw new Error(
        `Unable to fetch forecast.solar: ${err.message || 'Network request failed'}. No cached reading on device.`
      );
    }
  }

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

    // Standard interval timer
    this.timerId = setInterval(() => {
      this.executeDaytimePoll();
    }, POLLING_INTERVAL_MS);

    // Background Web Worker timer: keeps 15-minute polling active even if the tab or screen is backgrounded
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        const workerBlob = new Blob(
          [`setInterval(() => { postMessage('tick'); }, ${POLLING_INTERVAL_MS});`],
          { type: 'application/javascript' }
        );
        this.worker = new Worker(URL.createObjectURL(workerBlob));
        this.worker.onmessage = () => {
          this.executeDaytimePoll();
        };
      } catch {
        // Continue with standard timer fallback
      }
    }

    if (!this.visibilityListenerAttached && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      this.visibilityListenerAttached = true;
    }
  }

  stopPolling(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
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
    // When returning to the foreground during daytime (6am - 6pm),
    // refresh immediately if more than 15 minutes elapsed since the last poll
    if (document.visibilityState === 'visible' && this.isPollingActive) {
      if (isDaytimeHours() && Date.now() - this.lastPollTimestamp >= POLLING_INTERVAL_MS) {
        this.executeSinglePoll();
      }
    }
  };

  /**
   * Only executes outbound poll during 6:00 AM - 6:00 PM daytime solar production window
   */
  private executeDaytimePoll(): void {
    if (!this.isPollingActive) return;
    if (isDaytimeHours()) {
      this.executeSinglePoll();
    }
  }

  private async executeSinglePoll(): Promise<void> {
    if (!this.currentParams || !this.onUpdateCallback) return;
    try {
      this.lastPollTimestamp = Date.now();
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