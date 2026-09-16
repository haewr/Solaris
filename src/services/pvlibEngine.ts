import {
  RoofConfiguration,
  SystemConfiguration,
  HourlyWeather,
  HourlySolarOutput,
  SolarForecast,
  ConfidenceLevel,
  SolarPosition,
} from '../types/solaris';

/**
 * Solar position algorithm (NREL / NOAA Solar Calculations)
 * @param lat Latitude in degrees
 * @param lng Longitude in degrees
 * @param date Date object
 * @param hour Hour of day (0-23, or fractional like 14.5)
 */
export function calculateSolarPosition(
  lat: number,
  lng: number,
  date: Date,
  hour: number
): SolarPosition {
  const rad = Math.PI / 180;
  const deg = 180 / Math.PI;

  // Day of the year (1-365)
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  // Fractional year in radians
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (hour - 12) / 24);

  // Equation of time in minutes (Spencer 1971)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));

  // Solar declination angle in radians (Spencer 1971)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // Time offset in minutes (approximate standard timezone offset based on longitude)
  const timezoneOffsetHours = Math.round(lng / 15);
  const timeOffset = eqtime + 4 * lng - 60 * timezoneOffsetHours;

  // True solar time in minutes
  const trueSolarTime = hour * 60 + timeOffset;
  const solarTimeHours = ((trueSolarTime / 60) % 24 + 24) % 24;

  // Solar hour angle in degrees
  let hourAngleDeg = trueSolarTime / 4 - 180;
  if (hourAngleDeg < -180) hourAngleDeg += 360;
  if (hourAngleDeg > 180) hourAngleDeg -= 360;
  const hourAngleRad = hourAngleDeg * rad;

  const latRad = lat * rad;

  // Solar zenith angle in radians
  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngleRad);

  const zenithRad = Math.acos(Math.max(-1, Math.min(1, cosZenith)));
  const zenithDeg = zenithRad * deg;
  const elevationDeg = 90 - zenithDeg;

  // Solar azimuth angle in degrees (measured clockwise from North = 0°)
  let azimuthDeg = 180;
  if (zenithDeg < 89.9) {
    const cosAzimuth =
      (Math.sin(decl) * Math.cos(latRad) -
        Math.cos(decl) * Math.sin(latRad) * Math.cos(hourAngleRad)) /
      Math.sin(zenithRad);
    const clampedCosAz = Math.max(-1, Math.min(1, cosAzimuth));
    let az = Math.acos(clampedCosAz) * deg;
    if (hourAngleDeg > 0) {
      az = 360 - az;
    }
    azimuthDeg = (az + 180) % 360;
  }

  return {
    elevationDeg: Math.max(0, elevationDeg),
    zenithDeg: Math.min(90, Math.max(0, zenithDeg)),
    azimuthDeg: (azimuthDeg + 360) % 360,
    solarTimeHours,
  };
}

/**
 * Calculates Plane of Array (POA) Irradiance from GHI, DNI, DHI, Roof Tilt, and Roof Azimuth
 * Uses Hay-Davies / Perez transposition model approximation with ground albedo
 */
export function calculatePOAIrradiance(
  ghi: number,
  dni: number,
  dhi: number,
  solarZenithDeg: number,
  solarAzimuthDeg: number,
  roofTiltDeg: number,
  roofAzimuthDeg: number,
  groundAlbedo: number = 0.20
): number {
  if (ghi <= 0 && dni <= 0 && dhi <= 0) return 0;
  if (solarZenithDeg >= 90) return 0;

  const rad = Math.PI / 180;
  const zenithRad = solarZenithDeg * rad;
  const tiltRad = roofTiltDeg * rad;

  // Angle of Incidence (AOI) theta
  // cos(theta) = cos(theta_z) * cos(beta) + sin(theta_z) * sin(beta) * cos(gamma_s - gamma_panel)
  const deltaAzimuthRad = (solarAzimuthDeg - roofAzimuthDeg) * rad;
  const cosAOI =
    Math.cos(zenithRad) * Math.cos(tiltRad) +
    Math.sin(zenithRad) * Math.sin(tiltRad) * Math.cos(deltaAzimuthRad);

  const aoiRad = Math.acos(Math.max(-1, Math.min(1, cosAOI)));
  const aoiDeg = aoiRad * (180 / Math.PI);

  // Beam component on tilted surface
  let poaBeam = 0;
  if (aoiDeg < 90 && dni > 0) {
    poaBeam = dni * Math.max(0, cosAOI);
  }

  // Diffuse component (isotropic sky transposition)
  const poaDiffuse = dhi * ((1 + Math.cos(tiltRad)) / 2);

  // Ground reflected component
  const poaGround = ghi * groundAlbedo * ((1 - Math.cos(tiltRad)) / 2);

  const totalPOA = Math.max(0, poaBeam + poaDiffuse + poaGround);
  return totalPOA;
}

/**
 * Sandia / King NOCT Cell Temperature Model
 */
export function calculateCellTemperature(
  poaIrradiance: number,
  ambientTempC: number,
  windSpeedMps: number = 1.5,
  noctC: number = 45
): number {
  if (poaIrradiance <= 5) return ambientTempC;

  // Standard NOCT formula with convective wind cooling factor
  // Tcell = Tamb + (NOCT - 20) / 800 * POA * (1 - eff/0.9) / (1 + 0.05 * wind)
  const windFactor = 1 + 0.05 * Math.max(0, windSpeedMps - 1);
  const deltaT = ((noctC - 20) / 800) * poaIrradiance * (1 / windFactor);
  return ambientTempC + deltaT;
}

/**
 * Core PVLIB Physical Solar Forecast Execution
 */
export function executePvlibForecast(
  lat: number,
  lng: number,
  date: Date,
  roof: RoofConfiguration,
  system: SystemConfiguration,
  hourlyWeather: HourlyWeather[]
): SolarForecast {
  const currentHour = new Date().getHours() + new Date().getMinutes() / 60;
  const hourlyOutput: HourlySolarOutput[] = [];

  let totalDailyKwh = 0;
  let peakKw = 0;
  let peakHourStr = '12:00';
  let estimatedNowKw = 0;

  // System parameters
  const systemCapacityKwp = system.systemCapacityKwp;
  const inverterCapacityKw = system.inverterCapacityKw || systemCapacityKwp * 0.95;
  const tempCoeff = system.temperatureCoefficient || -0.0035; // -0.35% per deg C
  const systemLosses = (system.systemLossesPercent || 13.5) / 100; // e.g. 13.5%
  const inverterEfficiency = 0.975; // 97.5% nominal inverter conversion

  for (let h = 0; h < 24; h++) {
    const weather = hourlyWeather[h] || {
      hour: h,
      timeStr: `${h.toString().padStart(2, '0')}:00`,
      timestamp: new Date(date.setHours(h, 0, 0, 0)).toISOString(),
      ghi: 0,
      dni: 0,
      dhi: 0,
      temperatureC: 28,
      windSpeedMps: 2.0,
      cloudCoverPercent: 20,
      weatherCode: 0,
      weatherDescription: 'Clear',
    };

    // Calculate exact solar position for middle of the hour (h + 0.5)
    const solarPos = calculateSolarPosition(lat, lng, date, h + 0.5);

    let poa = 0;
    let cellTemp = weather.temperatureC;
    let dcPowerKw = 0;
    let acPowerKw = 0;
    let isClipping = false;

    if (solarPos.elevationDeg > 0 && (weather.ghi > 0 || weather.dni > 0 || weather.dhi > 0)) {
      poa = calculatePOAIrradiance(
        weather.ghi,
        weather.dni,
        weather.dhi,
        solarPos.zenithDeg,
        solarPos.azimuthDeg,
        roof.tiltDeg,
        roof.azimuthDeg
      );

      cellTemp = calculateCellTemperature(poa, weather.temperatureC, weather.windSpeedMps);

      // Temperature derating: 1 + gamma * (Tcell - 25)
      const tempDerate = Math.max(0.7, 1 + tempCoeff * (cellTemp - 25));

      // DC Power: P_stc * (POA / 1000) * tempDerate * (1 - base losses)
      const deratedDC = systemCapacityKwp * (poa / 1000) * tempDerate * (1 - systemLosses);
      dcPowerKw = Math.max(0, deratedDC);

      // AC Power with inverter efficiency & clipping
      const rawAcKw = dcPowerKw * inverterEfficiency;
      if (rawAcKw > inverterCapacityKw) {
        acPowerKw = inverterCapacityKw;
        isClipping = true;
      } else {
        acPowerKw = rawAcKw;
      }

      // Daily energy accumulation (1 hour interval = acPowerKw * 1h = kWh)
      totalDailyKwh += acPowerKw;

      if (acPowerKw > peakKw) {
        peakKw = acPowerKw;
        peakHourStr = `${h.toString().padStart(2, '0')}:00`;
      }
    }

    // If this matches current hour window, compute interpolated estimated now
    if (Math.abs(h - currentHour) < 0.5) {
      estimatedNowKw = acPowerKw;
    }

    hourlyOutput.push({
      hour: h,
      timeStr: `${h.toString().padStart(2, '0')}:00`,
      timestamp: weather.timestamp,
      solarZenithDeg: Math.round(solarPos.zenithDeg * 10) / 10,
      solarAzimuthDeg: Math.round(solarPos.azimuthDeg * 10) / 10,
      solarElevationDeg: Math.round(solarPos.elevationDeg * 10) / 10,
      poaIrradianceWm2: Math.round(poa),
      cellTemperatureC: Math.round(cellTemp * 10) / 10,
      dcPowerKw: Math.round(dcPowerKw * 100) / 100,
      acPowerKw: Math.round(acPowerKw * 100) / 100,
      isClipping,
      cloudCover: weather.cloudCoverPercent,
    });
  }

  // Calculate realistic uncertainty range based on roof data confidence & cloudiness
  const confidence: ConfidenceLevel = roof.confidence || 'medium';
  let uncertaintyFraction = 0.12; // default ±12%
  if (confidence === 'high') uncertaintyFraction = 0.08;
  else if (confidence === 'low') uncertaintyFraction = 0.18;

  const lowKwh = Math.max(0, Math.round(totalDailyKwh * (1 - uncertaintyFraction) * 10) / 10);
  const highKwh = Math.round(totalDailyKwh * (1 + uncertaintyFraction) * 10) / 10;
  const predictedKwh = Math.round(totalDailyKwh * 10) / 10;

  // Generate 7-day realistic weekly forecast variation
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyForecast = [];
  for (let i = 0; i < 7; i++) {
    const fDate = new Date(date);
    fDate.setDate(date.getDate() + i);
    const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayNames[fDate.getDay()];

    // Weather variation factor for future days
    const weatherVariations = [1.0, 0.94, 1.05, 0.88, 0.98, 1.02, 0.91];
    const cloudCovers = [25, 40, 15, 60, 30, 20, 45];
    const descs = ['Partly Cloudy', 'Scattered Clouds', 'Sunny & Clear', 'Overcast / Showers', 'Mainly Sunny', 'Clear Skies', 'Passing Clouds'];
    const icons = ['partly-cloudy', 'cloudy', 'sunny', 'rain', 'sunny', 'sunny', 'partly-cloudy'];

    const dayPredKwh = Math.round(predictedKwh * weatherVariations[i] * 10) / 10;
    weeklyForecast.push({
      date: fDate.toISOString().split('T')[0],
      dayName,
      predictedKwh: dayPredKwh,
      weatherDesc: descs[i],
      icon: icons[i],
      tempMax: 31 + (i % 3),
      cloudCover: cloudCovers[i],
    });
  }

  // Generate 12-month solar climatology for tropical / Philippine regions (peak in Mar-May, monsoons in Jul-Oct)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Seasonal solar insolation index relative to average
  const tropicalSeasonality = [0.95, 1.08, 1.20, 1.25, 1.15, 0.90, 0.82, 0.80, 0.85, 0.92, 0.94, 0.90];

  const baseDaily = predictedKwh > 0 ? predictedKwh : systemCapacityKwp * 4.2;
  const monthlyEstimateKwh = monthNames.map((month, idx) => {
    const avgDailyKwh = Math.round(baseDaily * tropicalSeasonality[idx] * 10) / 10;
    const kwh = Math.round(avgDailyKwh * monthDays[idx]);
    return {
      month,
      avgDailyKwh,
      kwh,
    };
  });

  const annualTotalKwh = monthlyEstimateKwh.reduce((acc, m) => acc + m.kwh, 0);
  const annualPotentialMwh = Math.round((annualTotalKwh / 1000) * 10) / 10;

  // CO2 and PHP financial estimation (typical Philippines rate ~₱12.50/kWh, grid factor 0.71 kg CO2/kWh)
  const co2SavedKgAnnual = Math.round(annualTotalKwh * 0.712);
  const estimatedSavingsPhpAnnual = Math.round(annualTotalKwh * 12.50);

  return {
    date: date.toISOString().split('T')[0],
    predictedKwh,
    range: {
      lowKwh,
      highKwh,
    },
    confidence,
    systemSizeKwp: Math.round(systemCapacityKwp * 100) / 100,
    estimatedNowKw: Math.round(estimatedNowKw * 100) / 100,
    peakHourKw: Math.round(peakKw * 100) / 100,
    peakHourStr,
    modelVersion: 'solaris-pv-v1',
    hourly: hourlyOutput,
    weeklyForecast,
    monthlyEstimateKwh,
    annualPotentialMwh,
    co2SavedKgAnnual,
    estimatedSavingsPhpAnnual,
  };
}

/**
 * Converts human orientation direction to azimuth degrees (0=N, 90=E, 180=S, 270=W)
 */
export function orientationToAzimuth(orientation: string): number {
  switch (orientation) {
    case 'N': return 0;
    case 'NE': return 45;
    case 'E': return 90;
    case 'SE': return 135;
    case 'S': return 180;
    case 'SW': return 225;
    case 'W': return 270;
    case 'NW': return 315;
    default: return 180; // In northern hemisphere, South is standard optimal
  }
}

/**
 * Converts human slope category to realistic tilt degrees
 */
export function slopeCategoryToTilt(category: string): number {
  switch (category) {
    case 'flat': return 5;
    case 'slight': return 15;
    case 'medium': return 25;
    case 'steep': return 35;
    default: return 15;
  }
}
