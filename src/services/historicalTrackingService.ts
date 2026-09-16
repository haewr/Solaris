import { HistoricalComparisonRecord, SystemConfiguration } from '../types/solaris';

export function generateHistoricalRecords(
  system: SystemConfiguration,
  daysCount: number = 30
): HistoricalComparisonRecord[] {
  const records: HistoricalComparisonRecord[] = [];
  const baseDailyYield = system.systemCapacityKwp * 4.3; // ~4.3 Peak Sun Hours average

  const now = new Date();

  const weatherTypes = [
    { label: 'Clear Sky / Full Sun', ghi: 950, prMin: 0.94, prMax: 1.02, note: 'Optimal clear sky yield; within 2% of pvlib physical model.' },
    { label: 'Partly Cloudy', ghi: 680, prMin: 0.88, prMax: 0.96, note: 'Intermittent cumulus cloud shading; slight irradiance attenuation.' },
    { label: 'Overcast / Scattered Rain', ghi: 320, prMin: 0.82, prMax: 0.91, note: 'Diffused light dominant; module operating cool with low clipping.' },
    { label: 'High Heat / Midday Haze', ghi: 890, prMin: 0.86, prMax: 0.93, note: 'Thermal derating active: ambient 34°C cell temperature reached 58°C.' },
    { label: 'Light Soiling / Dust', ghi: 910, prMin: 0.89, prMax: 0.95, note: 'Slight dust accumulation on lower string panels.' },
  ];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);

    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Deterministic pseudo-random variation based on day
    const seed = (d.getDate() * 17 + d.getMonth() * 31) % weatherTypes.length;
    const weather = weatherTypes[seed];

    const weatherFactor = weather.ghi / 950;
    const expectedKwh = Math.round(baseDailyYield * weatherFactor * 10) / 10;

    // Actual yield with slight hardware / local variance
    const pr = weather.prMin + ((d.getDate() * 7) % 100) / 100 * (weather.prMax - weather.prMin);
    const actualKwh = Math.round(expectedKwh * pr * 10) / 10;
    const actualPrPercent = Math.round((actualKwh / Math.max(0.1, expectedKwh)) * 100);

    records.push({
      date: dateStr,
      dayLabel,
      expectedKwh,
      actualKwh,
      performanceRatio: actualPrPercent,
      irradianceGhi: weather.ghi,
      weatherCondition: weather.label,
      varianceNote: weather.note,
    });
  }

  return records;
}

export function calculateSummaryHistoricalMetrics(records: HistoricalComparisonRecord[]) {
  const totalExpectedKwh = records.reduce((sum, r) => sum + r.expectedKwh, 0);
  const totalActualKwh = records.reduce((sum, r) => sum + r.actualKwh, 0);
  const overallPr = totalExpectedKwh > 0 ? Math.round((totalActualKwh / totalExpectedKwh) * 100) : 100;

  const sunnyDays = records.filter((r) => r.irradianceGhi > 700).length;
  const cloudyDays = records.length - sunnyDays;
  const bestDay = records.reduce((max, r) => (r.actualKwh > max.actualKwh ? r : max), records[0]);

  return {
    totalExpectedKwh: Math.round(totalExpectedKwh * 10) / 10,
    totalActualKwh: Math.round(totalActualKwh * 10) / 10,
    overallPr,
    sunnyDays,
    cloudyDays,
    bestDay,
  };
}
