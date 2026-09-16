import { HourlyWeather, WeatherDataPayload } from '../types/solaris';

// In-memory geohash weather cache
const weatherCache = new Map<string, WeatherDataPayload>();

// Cache statistics for observability
export const weatherMetrics = {
  totalRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  lastQueryDurationMs: 0,
  activeCachedBuckets: 0,
};

/**
 * Generates a ~2-3km spatial bucket key (approx 0.02 deg precision)
 */
export function getSpatialBucket(lat: number, lng: number, dateStr: string): string {
  const bucketLat = Math.round(lat * 50) / 50;
  const bucketLng = Math.round(lng * 50) / 50;
  return `geo_${bucketLat.toFixed(2)}_${bucketLng.toFixed(2)}_${dateStr}`;
}

/**
 * Generates tropical clear-sky and standard diurnal profile for Philippines / Southeast Asia
 */
export function generateClimatologicalWeather(lat: number, lng: number, date: Date): HourlyWeather[] {
  const hourly: HourlyWeather[] = [];
  const rad = Math.PI / 180;

  for (let h = 0; h < 24; h++) {
    // Solar elevation approximation for irradiance envelope
    const hourAngle = (h - 12) * 15;
    const declination = 10; // degrees
    const sinElevation =
      Math.sin(lat * rad) * Math.sin(declination * rad) +
      Math.cos(lat * rad) * Math.cos(declination * rad) * Math.cos(hourAngle * rad);
    const elevationDeg = Math.asin(Math.max(0, sinElevation)) * (180 / Math.PI);

    let ghi = 0;
    let dni = 0;
    let dhi = 0;
    let cloudCover = 20;
    let tempC = 26 + 6 * Math.sin(((h - 8) / 16) * Math.PI);

    if (elevationDeg > 0) {
      // Clear sky model
      const airMass = 1 / (Math.sin(elevationDeg * rad) + 0.50572 * Math.pow(elevationDeg + 6.07995, -1.6364));
      const extraterrestrial = 1361; // W/m2

      // Tropical atmospheric transmission
      const apparentDni = extraterrestrial * Math.pow(0.72, Math.pow(airMass, 0.678));
      dni = Math.max(0, Math.round(apparentDni));
      ghi = Math.max(0, Math.round(dni * Math.sin(elevationDeg * rad) + 120 * Math.sin(elevationDeg * rad)));
      dhi = Math.max(0, Math.round(ghi - dni * Math.sin(elevationDeg * rad)));
      cloudCover = 15 + Math.round(15 * Math.sin((h / 24) * Math.PI));
    } else {
      tempC = 24 + Math.random() * 2;
    }

    hourly.push({
      hour: h,
      timeStr: `${h.toString().padStart(2, '0')}:00`,
      timestamp: new Date(new Date(date).setHours(h, 0, 0, 0)).toISOString(),
      ghi,
      dni,
      dhi,
      temperatureC: Math.round(tempC * 10) / 10,
      windSpeedMps: 1.8 + Math.round(Math.sin(h / 3) * 10) / 10,
      cloudCoverPercent: cloudCover,
      weatherCode: 1,
      weatherDescription: cloudCover > 40 ? 'Partly Cloudy' : 'Sunny',
    });
  }

  return hourly;
}

/**
 * Fetches hourly weather forecast with spatial caching from Open-Meteo
 */
export async function getSolarWeatherForecast(
  lat: number,
  lng: number,
  date: Date = new Date()
): Promise<WeatherDataPayload> {
  const dateStr = date.toISOString().split('T')[0];
  const bucketKey = getSpatialBucket(lat, lng, dateStr);
  const nowTime = Date.now();

  weatherMetrics.totalRequests++;

  // Check cache first
  const cached = weatherCache.get(bucketKey);
  if (cached && new Date(cached.expiresAt).getTime() > nowTime) {
    weatherMetrics.cacheHits++;
    return {
      ...cached,
      provider: 'open_meteo_cache',
    };
  }

  weatherMetrics.cacheMisses++;
  const startTime = performance.now();

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,cloud_cover,wind_speed_10m,direct_normal_irradiance,diffuse_radiation,shortwave_radiation_instant&timezone=auto&forecast_days=2`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Open-Meteo status: ${response.status}`);
    }

    const data = await response.json();
    const hourlyData: HourlyWeather[] = [];

    if (data && data.hourly && data.hourly.time) {
      const times: string[] = data.hourly.time;
      const temps: number[] = data.hourly.temperature_2m || [];
      const winds: number[] = data.hourly.wind_speed_10m || [];
      const clouds: number[] = data.hourly.cloud_cover || [];
      const codes: number[] = data.hourly.weather_code || [];
      const dnis: number[] = data.hourly.direct_normal_irradiance || [];
      const dhis: number[] = data.hourly.diffuse_radiation || [];
      const ghis: number[] = data.hourly.shortwave_radiation_instant || [];

      // Find indices for target date (first 24 hours of that day)
      for (let i = 0; i < Math.min(24, times.length); i++) {
        const timeStr = times[i];
        const dateObj = new Date(timeStr);
        const hour = dateObj.getHours();

        const ghi = Math.max(0, Math.round(ghis[i] || 0));
        const dni = Math.max(0, Math.round(dnis[i] || 0));
        const dhi = Math.max(0, Math.round(dhis[i] || 0));
        const code = codes[i] || 0;

        let desc = 'Clear sky';
        if (code === 1 || code === 2) desc = 'Mainly clear / partly cloudy';
        else if (code === 3) desc = 'Overcast';
        else if (code >= 51 && code <= 67) desc = 'Light rain / drizzle';
        else if (code >= 80 && code <= 99) desc = 'Rain showers / storm';

        hourlyData.push({
          hour,
          timeStr: `${hour.toString().padStart(2, '0')}:00`,
          timestamp: dateObj.toISOString(),
          ghi,
          dni,
          dhi,
          temperatureC: Math.round((temps[i] ?? 28) * 10) / 10,
          windSpeedMps: Math.round(((winds[i] ?? 5) / 3.6) * 10) / 10, // km/h to m/s
          cloudCoverPercent: clouds[i] ?? 20,
          weatherCode: code,
          weatherDescription: desc,
        });
      }
    }

    // If less than 24 hours parsed, pad with climatology
    const finalHourly = hourlyData.length >= 24 ? hourlyData : generateClimatologicalWeather(lat, lng, date);

    const payload: WeatherDataPayload = {
      geohash: bucketKey,
      lat,
      lng,
      forecastDate: dateStr,
      provider: 'open_meteo',
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(nowTime + 2 * 60 * 60 * 1000).toISOString(), // 2 hours TTL
      hourly: finalHourly,
    };

    weatherCache.set(bucketKey, payload);
    weatherMetrics.activeCachedBuckets = weatherCache.size;
    weatherMetrics.lastQueryDurationMs = Math.round(performance.now() - startTime);

    return payload;
  } catch (err) {
    console.warn('Open-Meteo weather fetch fallback to tropical climatology:', err);
    weatherMetrics.lastQueryDurationMs = Math.round(performance.now() - startTime);

    const fallbackHourly = generateClimatologicalWeather(lat, lng, date);
    const fallbackPayload: WeatherDataPayload = {
      geohash: bucketKey,
      lat,
      lng,
      forecastDate: dateStr,
      provider: 'tropical_climatology',
      fetchedAt: new Date().toISOString(),
      expiresAt: new Date(nowTime + 30 * 60 * 1000).toISOString(),
      hourly: fallbackHourly,
    };

    weatherCache.set(bucketKey, fallbackPayload);
    return fallbackPayload;
  }
}
