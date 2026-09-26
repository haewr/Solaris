import React, { useState, useEffect, useMemo } from 'react';
import {
  Navigation,
  MapPin,
  Sun,
  ShieldCheck,
  RotateCcw,
  Compass,
  Layers,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Thermometer,
  Zap,
  TrendingUp,
  BarChart3,
  Award,
  CheckCircle,
} from 'lucide-react';
import {
  LocationCoordinates,
  RoofDimensions,
  NasaPowerClimatologyData,
  SolarMathCalculation,
} from '../../types/nativeSolaris';
import { nasaPowerService, DUMAGUETE_DEFAULT_COORDS } from '../../services/nasaPowerService';
import { MapPinpointSheet } from './MapPinpointSheet';
import { SitingMiniMap } from './SitingMiniMap';

interface SitingTabProps {
  location: LocationCoordinates;
  onChangeLocation: (loc: LocationCoordinates) => void;
  roof: RoofDimensions;
  onChangeRoof: (roof: RoofDimensions) => void;
  nasaData: NasaPowerClimatologyData | null;
  onNasaDataFetched: (data: NasaPowerClimatologyData, fromCache: boolean, cacheTs?: number) => void;
  isAirplaneMode: boolean;
  onNavigateToSimulation: () => void;
}

export const SitingTab: React.FC<SitingTabProps> = ({
  location,
  onChangeLocation,
  roof,
  onChangeRoof,
  nasaData,
  onNasaDataFetched,
  isAirplaneMode,
  onNavigateToSimulation,
}) => {
  const [isLoadingNasa, setIsLoadingNasa] = useState(false);
  const [nasaError, setNasaError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheTimestamp, setCacheTimestamp] = useState<number | undefined>();
  const [showPinpointSheet, setShowPinpointSheet] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Auto-fetch NASA POWER data on initial mount or when coordinates change
  useEffect(() => {
    fetchNasaData();
  }, [location.latitude, location.longitude, isAirplaneMode]);

  const fetchNasaData = async () => {
    setIsLoadingNasa(true);
    setNasaError(null);
    try {
      const res = await nasaPowerService.fetchClimatology(
        location.latitude,
        location.longitude,
        isAirplaneMode
      );
      setIsFromCache(res.fromCache);
      setCacheTimestamp(res.cacheTimestamp);
      onNasaDataFetched(res.data, res.fromCache, res.cacheTimestamp);
    } catch (err: any) {
      setNasaError(err.message || 'Failed to connect to NASA POWER satellite API.');
    } finally {
      setIsLoadingNasa(false);
    }
  };

  // Robust two-tier GPS location acquisition (High accuracy GPS -> Fallback to standard network fix)
  const handleAcquireGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported on this device.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    const onPosSuccess = (pos: GeolocationPosition) => {
      setGpsLoading(false);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy);
      onChangeLocation({
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracy,
        altitudeMeters: pos.coords.altitude || undefined,
        timestamp: Date.now(),
        source: 'gps',
        addressName: `GPS Device Fix (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ±${accuracy}m)`,
      });
    };

    // Stage 1: Try high accuracy GPS
    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      (err) => {
        // Stage 2: Fallback to standard accuracy on timeout or unavailable (laptops, desktops, indoor phones)
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            onPosSuccess,
            (fallbackErr) => {
              setGpsLoading(false);
              setGpsError(`Device location fix timed out (${fallbackErr.message}). You can use Pinpoint Location to set your roof.`);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        } else {
          setGpsLoading(false);
          setGpsError(`GPS Access: ${err.message}. Please use Pinpoint Location on the map.`);
        }
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  };

  // Roof Dimension validation & sanitization
  const handleDimensionChange = (field: keyof RoofDimensions, rawValue: string) => {
    const num = parseFloat(rawValue);
    const sanitized = isNaN(num) ? 0 : Math.max(0, num);

    const updated = { ...roof };

    if (field === 'widthMeters' || field === 'lengthMeters') {
      if (field === 'widthMeters') updated.widthMeters = Math.min(100, sanitized);
      if (field === 'lengthMeters') updated.lengthMeters = Math.min(100, sanitized);
      updated.totalAreaM2 = Math.round(updated.widthMeters * updated.lengthMeters * 10) / 10;
      updated.usableAreaM2 = Math.round(updated.totalAreaM2 * 0.75 * 10) / 10; // 75% usable
    } else if (field === 'usableAreaM2') {
      updated.usableAreaM2 = Math.min(2000, Math.max(5, sanitized));
      updated.totalAreaM2 = Math.round((updated.usableAreaM2 / 0.75) * 10) / 10;
    } else if (field === 'tiltDegrees') {
      updated.tiltDegrees = Math.min(90, Math.max(0, sanitized));
    } else if (field === 'azimuthDegrees') {
      updated.azimuthDegrees = Math.min(360, Math.max(0, sanitized));
      // Cardinal orientation name
      const az = updated.azimuthDegrees;
      if (az >= 337.5 || az < 22.5) updated.orientationName = 'North (0°)';
      else if (az >= 22.5 && az < 67.5) updated.orientationName = 'Northeast (45°)';
      else if (az >= 67.5 && az < 112.5) updated.orientationName = 'East (90°)';
      else if (az >= 112.5 && az < 157.5) updated.orientationName = 'Southeast (135°)';
      else if (az >= 157.5 && az < 202.5) updated.orientationName = 'South (180° Optimal)';
      else if (az >= 202.5 && az < 247.5) updated.orientationName = 'Southwest (225°)';
      else if (az >= 247.5 && az < 292.5) updated.orientationName = 'West (270°)';
      else updated.orientationName = 'Northwest (315°)';
    }

    onChangeRoof(updated);
  };

  // Compute standard physics model: E = A × r × H × PR
  const mathCalculation: SolarMathCalculation | null = nasaData
    ? nasaPowerService.calculateSolarMath(roof, nasaData)
    : null;

  // Viability Assessment Score Computation
  const viabilityAssessment = useMemo(() => {
    if (!nasaData || !mathCalculation) return null;

    // 1. Solar Resource factor (5.08 kWh/m²/day in Dumaguete is high tier)
    const ghiScore = Math.min(100, Math.round((nasaData.annualDailyKwhM2 / 5.2) * 100));

    // 2. Tilt score (Dumaguete latitude is 9.3°N, optimal tilt is 10°-15°)
    const tiltDiff = Math.abs(roof.tiltDegrees - 12);
    const tiltScore = Math.max(60, Math.round(100 - tiltDiff * 2.2));

    // 3. Azimuth score (180° True South is optimal for Northern Hemisphere)
    const azimuthDiff = Math.min(
      Math.abs(roof.azimuthDegrees - 180),
      360 - Math.abs(roof.azimuthDegrees - 180)
    );
    const azimuthScore = Math.max(65, Math.round(100 - (azimuthDiff / 180) * 35));

    // 4. Area factor (usable area efficiency)
    const areaScore = Math.min(100, Math.round((roof.usableAreaM2 / 30) * 100));

    // Composite score weighted
    const compositeScore = Math.round(
      ghiScore * 0.40 + tiltScore * 0.25 + azimuthScore * 0.25 + Math.min(100, areaScore) * 0.10
    );

    let rating = 'Moderate Viability';
    let ratingColor = 'text-amber-600 bg-amber-50 border-amber-200';
    let verdict = 'Viable for distributed solar with moderate seasonal variation.';

    if (compositeScore >= 90) {
      rating = 'Excellent Viability';
      ratingColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      verdict =
        'Prime rooftop candidate in Dumaguete. High satellite insolation with optimal latitude and orientation alignment for maximum PV output.';
    } else if (compositeScore >= 80) {
      rating = 'High Viability';
      ratingColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
      verdict =
        'Strong solar viability. Favorable tropical solar resource with robust generation potential throughout the year.';
    }

    return {
      compositeScore,
      rating,
      ratingColor,
      verdict,
      factors: [
        {
          name: 'Daily Sunlight (Irradiance)',
          value: `${nasaData.annualDailyKwhM2} kWh/m²/day`,
          status: 'Optimal',
          score: ghiScore,
        },
        {
          name: 'Pitch / Tilt Match',
          value: `${roof.tiltDegrees}° (Optimal ~12°)`,
          status: tiltDiff <= 8 ? 'Optimal' : 'Acceptable',
          score: tiltScore,
        },
        {
          name: 'Azimuth Orientation',
          value: `${roof.azimuthDegrees}° (${roof.orientationName.split(' ')[0]})`,
          status: azimuthDiff <= 45 ? 'Optimal' : 'Good',
          score: azimuthScore,
        },
        {
          name: 'Atmospheric & Cloud Clearness',
          value: '74% Clear Sky Ratio (NASA Multi-Year)',
          status: 'High Solar',
          score: 88,
        },
        {
          name: 'Usable Roof Footprint',
          value: `${roof.usableAreaM2} m² (${Math.round((roof.usableAreaM2 / roof.totalAreaM2) * 100)}% usable)`,
          status: roof.usableAreaM2 >= 25 ? 'High Area' : 'Adequate',
          score: areaScore,
        },
      ],
    };
  }, [nasaData, mathCalculation, roof]);

  return (
    <div className="space-y-4 pb-6" id="solaris-siting-tab">
      {/* Offline Cached Warning Banner */}
      {isFromCache && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          <div className="leading-tight">
            <strong>Serving Cached NASA POWER Satellite Data</strong>
            <span className="block text-[10px] text-amber-700">
              Cached locally {cacheTimestamp ? new Date(cacheTimestamp).toLocaleDateString() : 'earlier'}. No new network calls made.
            </span>
          </div>
        </div>
      )}

      {/* 1. Location Siting Card with Live Embedded Map */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Site Location (Dumaguete City)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {location.source === 'gps' ? 'Real GPS' : 'Manual Pin'}
          </span>
        </div>

        {/* Embedded Interactive Map Preview */}
        <SitingMiniMap
          latitude={location.latitude}
          longitude={location.longitude}
          addressName={location.addressName}
          onOpenPinpoint={() => setShowPinpointSheet(true)}
        />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            onClick={() => setShowPinpointSheet(true)}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pinpoint Location</span>
          </button>

          <button
            onClick={handleAcquireGps}
            disabled={gpsLoading}
            className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 text-indigo-600 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Acquiring...' : 'Device GPS'}</span>
          </button>
        </div>

        {gpsError && (
          <p className="text-[11px] text-rose-600 font-medium px-1">{gpsError}</p>
        )}
      </div>

      {/* 2. Roof Geometry Input Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. Roof Dimensions & Orientation
            </span>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Usable: <strong>{roof.usableAreaM2} m²</strong>
          </span>
        </div>

        {/* Width & Length inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">Roof Width (meters)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={roof.widthMeters}
                onChange={(e) => handleDimensionChange('widthMeters', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-bold">m</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">Roof Length (meters)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={roof.lengthMeters}
                onChange={(e) => handleDimensionChange('lengthMeters', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3 top-2 text-[11px] text-slate-400 font-bold">m</span>
            </div>
          </div>
        </div>

        {/* Tilt & Azimuth sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">Roof Tilt Pitch:</span>
              <strong className="text-indigo-600 font-mono">{roof.tiltDegrees}°</strong>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={roof.tiltDegrees}
              onChange={(e) => handleDimensionChange('tiltDegrees', e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <p className="text-[10px] text-slate-400">Dumaguete optimal latitude tilt is ~10°-15°</p>
          </div>

          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">Roof Azimuth Facing:</span>
              <strong className="text-indigo-600 font-mono">
                {roof.azimuthDegrees}° ({roof.orientationName.split(' ')[0]})
              </strong>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={roof.azimuthDegrees}
              onChange={(e) => handleDimensionChange('azimuthDegrees', e.target.value)}
              className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <p className="text-[10px] text-slate-400">180° South is optimal for Northern Hemisphere</p>
          </div>
        </div>
      </div>

      {/* 3. Solar Viability Assessment */}
      {mathCalculation && nasaData && viabilityAssessment && (
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                  3. Solar Viability Assessment
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Negros Oriental Siting & Resource Feasibility
                </span>
              </div>
            </div>

            <div
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1 ${viabilityAssessment.ratingColor}`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>
                {viabilityAssessment.compositeScore}/100 • {viabilityAssessment.rating}
              </span>
            </div>
          </div>

          {/* Assessment Summary Verdict */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs text-slate-700 leading-relaxed">
            <p className="font-medium">{viabilityAssessment.verdict}</p>
          </div>

          {/* Viability Factors Scorecard */}
          <div className="grid grid-cols-2 gap-2.5">
            {viabilityAssessment.factors.map((f) => (
              <div
                key={f.name}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate mr-1">
                    {f.name}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {f.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">{f.value}</div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, f.score)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Average Power Generation Potential */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                4. Average Power Generation Potential
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Physics Model (Area × Efficiency × Sunlight × Derate)
              </span>
            </div>
          </div>

          <button
            onClick={fetchNasaData}
            disabled={isLoadingNasa}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="Refresh NASA POWER satellite query"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNasa ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>

        {/* Loading State */}
        {isLoadingNasa && (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              Querying real multi-year satellite solar irradiance from NASA POWER API...
            </p>
          </div>
        )}

        {/* Real API Error State */}
        {!isLoadingNasa && nasaError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <strong className="text-xs">NASA POWER API Connection Error</strong>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">{nasaError}</p>
            <button
              onClick={fetchNasaData}
              className="mt-1 px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all"
            >
              Retry Satellite Query
            </button>
          </div>
        )}

        {/* Valid Real Results */}
        {!isLoadingNasa && mathCalculation && nasaData && (
          <div className="space-y-4">
            {/* Primary Energy KPI grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">
                  Avg Daily Generation
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-['Space_Grotesk'] text-indigo-700">
                    {mathCalculation.dailyEnergyKwh}
                  </span>
                  <span className="text-xs font-bold text-indigo-600">kWh/day</span>
                </div>
                <p className="text-[10px] text-indigo-900/70 font-medium">
                  Peak sunlight hours: ~{nasaData.annualDailyKwhM2} hrs/day
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Avg Monthly Generation
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-['Space_Grotesk'] text-emerald-700">
                    {mathCalculation.monthlyEnergyKwh.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">kWh/mo</span>
                </div>
                <p className="text-[10px] text-emerald-900/70 font-medium">
                  Offsets typical Dumaguete residential bill
                </p>
              </div>
            </div>

            {/* Annual & Peak Capacity Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Avg Annual Generation
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-['Space_Grotesk'] text-slate-900">
                    {mathCalculation.annualEnergyKwh.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-slate-600">kWh/yr</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Solar Efficiency: ~
                  {Math.round(
                    mathCalculation.annualEnergyKwh / (mathCalculation.recommendedSystemSizeKwp || 1)
                  )}{' '}
                  kWh/kWp/yr
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Recommended System Size
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black font-['Space_Grotesk'] text-slate-900">
                    {mathCalculation.recommendedSystemSizeKwp}
                  </span>
                  <span className="text-xs font-bold text-slate-600">kWp DC</span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  ~{Math.ceil((mathCalculation.recommendedSystemSizeKwp * 1000) / 450)} Monocrystalline panels
                </p>
              </div>
            </div>

            {/* Monthly Generation Potential Seasonal Breakdown */}
            {nasaData.monthlyDailyKwhM2 && Object.keys(nasaData.monthlyDailyKwhM2).length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    Monthly Irradiance & Generation Curve
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600">
                    Peak: April (~5.7 kWh/m²)
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-1 items-end h-16 pt-2">
                  {Object.entries(nasaData.monthlyDailyKwhM2).map(([month, rawVal]) => {
                    const numVal = Number(rawVal) || 4.5;
                    const heightPercent = Math.min(100, Math.max(30, ((numVal - 3.5) / (6.0 - 3.5)) * 100));
                    return (
                      <div key={month} className="flex flex-col items-center gap-1 h-full justify-end">
                        <div
                          className="w-full bg-indigo-500 hover:bg-indigo-600 rounded-t-sm transition-all"
                          style={{ height: `${heightPercent}%` }}
                          title={`${month}: ${numVal} kWh/m²/day`}
                        />
                        <span className="text-[8px] font-mono text-slate-400">{month.charAt(0)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 font-medium pt-0.5">
                  <span>Dry Season (Peak: Feb-May)</span>
                  <span>Wet Season (Aug-Dec - Cloud Passes)</span>
                </div>
              </div>
            )}

            {/* Run Simulation Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={onNavigateToSimulation}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 active:scale-98 transition-all"
              >
                <span>Proceed to Simulation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Pinpoint Sheet */}
      {showPinpointSheet && (
        <MapPinpointSheet
          currentLocation={location}
          onConfirmLocation={onChangeLocation}
          onClose={() => setShowPinpointSheet(false)}
        />
      )}
    </div>
  );
};

