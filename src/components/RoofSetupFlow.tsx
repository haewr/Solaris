import React, { useState } from 'react';
import { ArrowLeft, Compass, Sun, Layers, Home, Check, Info, Sparkles, Sliders, Edit3 } from 'lucide-react';
import { BuildingFootprint, RoofConfiguration, SystemConfiguration, RoofOrientationCategory, RoofTiltCategory } from '../types/solaris';
import { estimateSolarCapacityFromArea } from '../services/buildingFootprintService';
import { orientationToAzimuth, slopeCategoryToTilt } from '../services/pvlibEngine';

interface RoofSetupFlowProps {
  building: BuildingFootprint | null;
  onBack: () => void;
  onSubmit: (roof: RoofConfiguration, system: SystemConfiguration) => void;
  onToggleDrawingMode: (enabled: boolean) => void;
  isDrawingMode: boolean;
  isLoading: boolean;
}

const ROOF_PORTIONS = [
  { ratio: 0.85, label: 'Most of the roof', desc: '~85% of total footprint' },
  { ratio: 0.75, label: 'About three quarters', desc: '~75% (Recommended)' },
  { ratio: 0.50, label: 'About half', desc: '~50% (Single roof plane)' },
  { ratio: 0.25, label: 'Small section', desc: '~25% (Corner / garage)' },
];

const ORIENTATIONS: { code: RoofOrientationCategory; label: string; angle: number; sub: string }[] = [
  { code: 'N', label: 'North', angle: 0, sub: '0°' },
  { code: 'NE', label: 'North-East', angle: 45, sub: '45°' },
  { code: 'E', label: 'East', angle: 90, sub: '90° Morning' },
  { code: 'SE', label: 'South-East', angle: 135, sub: '135°' },
  { code: 'S', label: 'South', angle: 180, sub: '180° Optimal' },
  { code: 'SW', label: 'South-West', angle: 225, sub: '225°' },
  { code: 'W', label: 'West', angle: 270, sub: '270° Afternoon' },
  { code: 'NW', label: 'North-West', angle: 315, sub: '315°' },
];

const SLOPES: { category: RoofTiltCategory; label: string; desc: string; deg: number }[] = [
  { category: 'flat', label: 'Almost flat', desc: '0°–10° (Commercial / flat deck)', deg: 5 },
  { category: 'slight', label: 'Slight slope', desc: '10°–20° (Most residential homes)', deg: 15 },
  { category: 'medium', label: 'Medium slope', desc: '20°–30° (Standard pitch)', deg: 25 },
  { category: 'steep', label: 'Steep', desc: '30°–45° (High gable / A-frame)', deg: 35 },
];

export const RoofSetupFlow: React.FC<RoofSetupFlowProps> = ({
  building,
  onBack,
  onSubmit,
  onToggleDrawingMode,
  isDrawingMode,
  isLoading,
}) => {
  const buildingAreaM2 = building?.areaM2 || 180;
  const [selectedRatio, setSelectedRatio] = useState<number>(0.75);
  const [manualAreaM2, setManualAreaM2] = useState<number>(Math.round(buildingAreaM2 * 0.75));
  const [isManualArea, setIsManualArea] = useState(false);

  const [selectedSlope, setSelectedSlope] = useState<RoofTiltCategory>('slight');
  const [selectedOrientation, setSelectedOrientation] = useState<RoofOrientationCategory>('S');
  const [panelWattage, setPanelWattage] = useState<number>(420);

  // Derive usable area
  const usableAreaM2 = isManualArea ? manualAreaM2 : Math.round(buildingAreaM2 * selectedRatio);

  // Derive estimated capacity
  const capacityEst = estimateSolarCapacityFromArea(usableAreaM2, panelWattage);

  const tiltDeg = slopeCategoryToTilt(selectedSlope);
  const azimuthDeg = orientationToAzimuth(selectedOrientation);

  const handlePortionSelect = (ratio: number) => {
    setIsManualArea(false);
    setSelectedRatio(ratio);
    onToggleDrawingMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const roofConfig: RoofConfiguration = {
      buildingAreaM2,
      usableAreaM2,
      usableRatio: selectedRatio,
      tiltDeg,
      tiltCategory: selectedSlope,
      azimuthDeg,
      orientationCategory: selectedOrientation,
      geometrySource: building?.source || 'map_assisted',
      confidence: building ? 'high' : 'medium',
    };

    const sysConfig: SystemConfiguration = {
      systemCapacityKwp: capacityEst.estimatedCapacityKwp,
      panelCount: capacityEst.estimatedPanelCount,
      panelWattage,
      inverterCapacityKw: capacityEst.inverterSizeKw,
      moduleEfficiency: 0.21,
      temperatureCoefficient: -0.0035,
      systemLossesPercent: 13.5,
      configurationSource: 'roof_derived',
    };

    onSubmit(roofConfig, sysConfig);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6"
      id="map-assisted-roof-setup-flow"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 font-['Space_Grotesk']">
              Highlight Usable Roof & Orientation
            </h2>
            <p className="text-xs text-slate-500">
              Building Footprint: <strong className="text-slate-800 font-semibold">{buildingAreaM2} m²</strong> (Source: {building?.source || 'Open Buildings'})
            </p>
          </div>
        </div>
      </div>

      {/* Step 1: Usable Roof Area Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            1. Usable Roof Area for Solar Panels
          </label>
          <span className="text-xs font-bold text-indigo-700">{usableAreaM2} m² usable</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {ROOF_PORTIONS.map((portion) => {
            const isSelected = !isManualArea && selectedRatio === portion.ratio;
            return (
              <button
                key={portion.ratio}
                type="button"
                id={`portion-btn-${Math.round(portion.ratio * 100)}`}
                onClick={() => handlePortionSelect(portion.ratio)}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  isSelected
                    ? 'bg-indigo-50/70 border-2 border-indigo-600 text-indigo-950 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{portion.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500">{portion.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Manual area or Map Polygon Drawing toggle */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onToggleDrawingMode(!isDrawingMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
              isDrawingMode
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isDrawingMode ? 'Drawing mode active' : 'Draw exact roof polygon on map'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualArea(!isManualArea)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors"
          >
            {isManualArea ? 'Use percentage presets' : 'Enter m² manually'}
          </button>
        </div>

        {isManualArea && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">Custom usable area:</label>
            <input
              type="number"
              min="10"
              max="5000"
              value={manualAreaM2}
              onChange={(e) => setManualAreaM2(parseInt(e.target.value) || 20)}
              className="w-28 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <span className="text-xs text-slate-500 font-medium">m²</span>
          </div>
        )}
      </div>

      {/* Step 2: Roof Orientation (Compass UX) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            2. Roof Facing Direction
          </label>
          <span className="text-xs font-bold text-indigo-700">{selectedOrientation} ({azimuthDeg}°)</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ORIENTATIONS.map((ori) => {
            const isSelected = selectedOrientation === ori.code;
            return (
              <button
                key={ori.code}
                type="button"
                id={`roof-orient-${ori.code}`}
                onClick={() => setSelectedOrientation(ori.code)}
                className={`py-2.5 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                }`}
              >
                <span className="text-xs font-extrabold">{ori.code}</span>
                <span className="text-[9px] opacity-80">{ori.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Roof Slope */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5 text-indigo-600" />
            3. How steep is your roof?
          </label>
          <span className="text-xs font-bold text-indigo-700">{tiltDeg}° Slope</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {SLOPES.map((slope) => {
            const isSelected = selectedSlope === slope.category;
            return (
              <button
                key={slope.category}
                type="button"
                id={`roof-slope-${slope.category}`}
                onClick={() => setSelectedSlope(slope.category)}
                className={`p-3.5 rounded-2xl text-left transition-all border ${
                  isSelected
                    ? 'bg-indigo-50/70 border-2 border-indigo-600 text-indigo-950 shadow-xs'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{slope.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[10px] text-slate-500">{slope.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Derived System Capacity Live Preview Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-0.5">
            Derived System Capacity
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-['Space_Grotesk']">
              {capacityEst.estimatedCapacityKwp} kWp
            </span>
            <span className="text-xs font-medium text-slate-300">
              (~{capacityEst.estimatedPanelCount} panels × {panelWattage}W)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Based on {usableAreaM2} m² usable area, 72% layout factor & modern monocrystalline PERC panels.
          </p>
        </div>

        <div className="sm:text-right shrink-0">
          <span className="text-[10px] text-slate-400 block">Recommended Inverter</span>
          <strong className="text-sm font-bold text-amber-400">{capacityEst.inverterSizeKw} kW AC</strong>
        </div>
      </div>

      {/* Submit Button */}
      <button
        id="btn-generate-roof-forecast"
        type="submit"
        disabled={isLoading || capacityEst.estimatedCapacityKwp <= 0}
        className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Sun className="w-4 h-4 fill-white" />
        <span>Generate Solar Forecast</span>
      </button>
    </form>
  );
};
