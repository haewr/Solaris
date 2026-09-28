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
  X,
  MousePointerClick,
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
import { LocationPermissionModal } from './LocationPermissionModal';

interface SitingTabProps {
  location: LocationCoordinates | null;
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
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Track if user has pinned a location
  const hasUserPinned = Boolean(location);
  const [showViabilityPopup, setShowViabilityPopup] = useState(false);

  // Fetch NASA POWER data when a location has been pinned
  useEffect(() => {
    if (location) {
      fetchNasaData();
    }
  }, [location?.latitude, location?.longitude, isAirplaneMode]);

  const fetchNasaData = async () => {
    if (!location) return;
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

  const handleLocationConfirmed = (newLoc: LocationCoordinates) => {
    setShowViabilityPopup(true);
    onChangeLocation(newLoc);
  };

  // Robust GPS location acquisition
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
      handleLocationConfirmed({
        latitude: lat,
        longitude: lng,
        accuracyMeters: accuracy,
        altitudeMeters: pos.coords.altitude || undefined,
        timestamp: Date.now(),
        source: 'gps',
        addressName: `GPS Device Fix (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E, ±${accuracy}m)`,
      });
    };

    navigator.geolocation.getCurrentPosition(
      onPosSuccess,
      (err) => {
        if (err.code === 3 || err.code === 2) {
          navigator.geolocation.getCurrentPosition(
            onPosSuccess,
            (fallbackErr) => {
              setGpsLoading(false);
              setGpsError(`Device location fix timed out (${fallbackErr.message}). You can tap the map to place your pin.`);
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
          );
        } else {
          setGpsLoading(false);
          setGpsError(`GPS Access: ${err.message}. Please tap the map or use Pinpoint Location.`);
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
      updated.usableAreaM2 = Math.round(updated.totalAreaM2 * 0.75 * 10) / 10;
    } else if (field === 'usableAreaM2') {
      updated.usableAreaM2 = Math.min(2000, Math.max(0, sanitized));
      updated.totalAreaM2 = Math.round((updated.usableAreaM2 / 0.75) * 10) / 10;
    } else if (field === 'tiltDegrees') {
      updated.tiltDegrees = Math.min(90, Math.max(0, sanitized));
    } else if (field === 'azimuthDegrees') {
      updated.azimuthDegrees = Math.min(360, Math.max(0, sanitized));
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

  // Compute standard physics model: E = A × r × H × PR (Only when roof area > 0 and NASA data present)
  const mathCalculation: SolarMathCalculation | null =
    nasaData && roof.usableAreaM2 > 0
      ? nasaPowerService.calculateSolarMath(roof, nasaData)
      : null;

  // Pin Viability Assessment Score (Bad / Good / Great / Excellent)
  const pinViability = useMemo(() => {
    if (!hasUserPinned || !location) return null;

    const ghi = nasaData?.annualDailyKwhM2 || 5.1;
    const ghiScore = Math.min(100, Math.round((ghi / 5.2) * 100));

    const tiltDiff = Math.abs(roof.tiltDegrees - 12);
    const tiltScore = Math.max(20, Math.round(100 - tiltDiff * 2.5));

    const azimuthDiff = Math.min(
      Math.abs(roof.azimuthDegrees - 180),
      360 - Math.abs(roof.azimuthDegrees - 180)
    );
    const azimuthScore = Math.max(20, Math.round(100 - (azimuthDiff / 180) * 40));
    const areaScore = Math.min(100, Math.round(((roof.usableAreaM2 || 30) / 30) * 100));

    const compositeScore = Math.round(
      ghiScore * 0.40 + tiltScore * 0.25 + azimuthScore * 0.25 + Math.min(100, areaScore) * 0.10
    );

    if (compositeScore >= 88) {
      return {
        level: 'Excellent' as const,
        badgeText: 'Excellent Viability',
        score: compositeScore,
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        iconBg: 'bg-emerald-500 text-white',
      };
    } else if (compositeScore >= 75) {
      return {
        level: 'Great' as const,
        badgeText: 'Great Viability',
        score: compositeScore,
        bg: 'bg-indigo-50 border-indigo-200 text-indigo-900',
        badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        iconBg: 'bg-indigo-600 text-white',
      };
    } else if (compositeScore >= 60) {
      return {
        level: 'Good' as const,
        badgeText: 'Good Viability',
        score: compositeScore,
        bg: 'bg-amber-50 border-amber-200 text-amber-900',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
        iconBg: 'bg-amber-500 text-white',
      };
    } else {
      return {
        level: 'Bad' as const,
        badgeText: 'Bad Viability',
        score: compositeScore,
        bg: 'bg-rose-50 border-rose-200 text-rose-900',
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
        iconBg: 'bg-rose-500 text-white',
      };
    }
  }, [hasUserPinned, location, nasaData, roof]);

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

      {/* Small Pin Viability Popup Infocard (Appears above Site Location ONLY after user pins a location) */}
      {hasUserPinned && showViabilityPopup && pinViability && location && (
        <div className={`p-3.5 sm:p-4 rounded-2xl border shadow-xs transition-all animate-in fade-in slide-in-from-top-2 ${pinViability.bg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${pinViability.iconBg}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  Pin Viability: {pinViability.level}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {location.addressName}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pinViability.badgeBg}`}>
                {pinViability.badgeText}
              </span>
              <button
                onClick={() => setShowViabilityPopup(false)}
                className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 flex items-center justify-center transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
              1. Site Location
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            hasUserPinned
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}>
            {hasUserPinned ? (location?.source === 'gps' ? 'Real GPS' : 'Manual Pin') : 'No Pin Placed'}
          </span>
        </div>

        {/* Embedded Interactive Map Preview */}
        <SitingMiniMap
          latitude={location?.latitude ?? DUMAGUETE_DEFAULT_COORDS.latitude}
          longitude={location?.longitude ?? DUMAGUETE_DEFAULT_COORDS.longitude}
          addressName={location?.addressName ?? 'No location pinned yet'}
          hasPin={hasUserPinned}
          onOpenPinpoint={() => setShowPinpointSheet(true)}
          onPinAtCoordinates={(lat, lng) => {
            handleLocationConfirmed({
              latitude: lat,
              longitude: lng,
              timestamp: Date.now(),
              source: 'manual_pinpoint',
              addressName: `Pinpoint (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
            });
          }}
        />

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            onClick={() => setShowPinpointSheet(true)}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>{hasUserPinned ? 'Adjust Pin' : 'Pinpoint Location'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPermissionModal(true)}
            disabled={gpsLoading}
            className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <Navigation className={`w-3.5 h-3.5 text-indigo-600 ${gpsLoading ? 'animate-spin' : ''}`} />
            <span>{gpsLoading ? 'Acquiring...' : 'Acquire Device Location'}</span>
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
            Usable: <strong>{roof.usableAreaM2 > 0 ? `${roof.usableAreaM2} m²` : '— m²'}</strong>
          </span>
        </div>

        {/* Width & Length inputs - initially empty placeholders */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">Roof Width (meters)</label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                value={roof.widthMeters > 0 ? roof.widthMeters : ''}
                onChange={(e) => handleDimensionChange('widthMeters', e.target.value)}
                placeholder="e.g. 7.0"
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
                min="0.5"
                max="100"
                step="0.5"
                value={roof.lengthMeters > 0 ? roof.lengthMeters : ''}
                onChange={(e) => handleDimensionChange('lengthMeters', e.target.value)}
                placeholder="e.g. 8.0"
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

      {/* 3. Average Power Generation Potential */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              3. Average Power Generation Potential
            </span>
          </div>

          {hasUserPinned && (
            <button
              onClick={fetchNasaData}
              disabled={isLoadingNasa}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Refresh NASA POWER satellite query"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNasa ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          )}
        </div>

        {/* Initial Prompt State if user has not pinned or entered dimensions */}
        {(!hasUserPinned || roof.usableAreaM2 <= 0) && (
          <div className="py-7 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-800">
              {!hasUserPinned ? 'Drop a Pin on Your Roof to Begin' : 'Enter Roof Dimensions Above'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              {!hasUserPinned
                ? 'Pinpoint your site location on the map above. The engine will retrieve multi-year NASA POWER satellite irradiance and run solar physics modeling.'
                : 'Enter your roof width and length in meters above to calculate usable solar area and average generation potential.'}
            </p>
            {!hasUserPinned && (
              <button
                onClick={() => setShowPinpointSheet(true)}
                className="mt-1 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-all inline-flex items-center gap-1.5 shadow-xs"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Pinpoint Roof Location</span>
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {hasUserPinned && roof.usableAreaM2 > 0 && isLoadingNasa && (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-medium">
              Querying multi-year satellite solar irradiance from NASA POWER API...
            </p>
          </div>
        )}

        {/* Real API Error State */}
        {hasUserPinned && roof.usableAreaM2 > 0 && !isLoadingNasa && nasaError && (
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
        {hasUserPinned && !isLoadingNasa && mathCalculation && nasaData && (
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
              </div>
            </div>

            {/* Annual & Peak Capacity Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Avg Annual Generation
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-900">
                    {mathCalculation.annualEnergyKwh.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">kWh/yr</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Recommended System Size
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold font-['Space_Grotesk'] text-slate-900">
                    {mathCalculation.recommendedSystemSizeKwp}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">kWp DC</span>
                </div>
              </div>
            </div>

            {/* Scientific Confidence Margin */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block">
                    Scientific Range (±10.4%)
                  </span>
                  <span className="text-[11px] text-slate-600">
                    {mathCalculation.confidenceInterval.lowAnnualKwh.toLocaleString()} — {mathCalculation.confidenceInterval.highAnnualKwh.toLocaleString()} kWh/yr
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">Stackhouse et al.</span>
            </div>

            {/* Link to Financial Simulation */}
            <button
              onClick={onNavigateToSimulation}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <span>Simulate 25-Year Financial Return</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Pinpoint Modal / Bottom Sheet */}
      {showPinpointSheet && (
        <MapPinpointSheet
          currentLocation={location}
          onConfirmLocation={handleLocationConfirmed}
          onClose={() => setShowPinpointSheet(false)}
        />
      )}

      {/* Permission Request Dialog */}
      <LocationPermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        onConfirm={() => {
          setShowPermissionModal(false);
          handleAcquireGps();
        }}
        isLocating={gpsLoading}
      />
    </div>
  );
};
