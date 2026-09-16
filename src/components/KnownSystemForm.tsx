import React, { useState } from 'react';
import { ArrowLeft, Compass, Zap, Sliders, ChevronDown, ChevronUp, Check, Info } from 'lucide-react';
import { RoofTiltCategory, RoofOrientationCategory, SystemConfiguration, RoofConfiguration } from '../types/solaris';
import { orientationToAzimuth, slopeCategoryToTilt } from '../services/pvlibEngine';

interface KnownSystemFormProps {
  onBack: () => void;
  onSubmit: (roof: RoofConfiguration, system: SystemConfiguration) => void;
  isLoading: boolean;
}

const ORIENTATIONS: { code: RoofOrientationCategory; label: string; angle: number }[] = [
  { code: 'N', label: 'North', angle: 0 },
  { code: 'NE', label: 'North-East', angle: 45 },
  { code: 'E', label: 'East', angle: 90 },
  { code: 'SE', label: 'South-East', angle: 135 },
  { code: 'S', label: 'South (Optimal)', angle: 180 },
  { code: 'SW', label: 'South-West', angle: 225 },
  { code: 'W', label: 'West', angle: 270 },
  { code: 'NW', label: 'North-West', angle: 315 },
];

const SLOPES: { category: RoofTiltCategory; label: string; desc: string; defaultDeg: number }[] = [
  { category: 'flat', label: 'Almost flat', desc: '0° – 10° (Commercial / modern flat roof)', defaultDeg: 5 },
  { category: 'slight', label: 'Slight slope', desc: '10° – 20° (Typical residential metal / shingle)', defaultDeg: 15 },
  { category: 'medium', label: 'Medium slope', desc: '20° – 30° (Standard pitch roof)', defaultDeg: 25 },
  { category: 'steep', label: 'Steep', desc: '30° – 45° (High pitch roof)', defaultDeg: 35 },
  { category: 'custom', label: 'Exact angle', desc: 'Specify exact measured tilt in degrees', defaultDeg: 15 },
];

export const KnownSystemForm: React.FC<KnownSystemFormProps> = ({ onBack, onSubmit, isLoading }) => {
  const [usePanelCountCalc, setUsePanelCountCalc] = useState(false);
  const [directCapacityKwp, setDirectCapacityKwp] = useState<number>(5.0);
  const [panelCount, setPanelCount] = useState<number>(12);
  const [panelWattage, setPanelWattage] = useState<number>(420);
  const [inverterSizeKw, setInverterSizeKw] = useState<number>(5.0);

  const [selectedOrientation, setSelectedOrientation] = useState<RoofOrientationCategory>('S');
  const [selectedSlope, setSelectedSlope] = useState<RoofTiltCategory>('slight');
  const [customTiltDeg, setCustomTiltDeg] = useState<number>(15);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [systemLosses, setSystemLosses] = useState<number>(13.5);

  // Derived system size
  const calculatedKwp = usePanelCountCalc
    ? Math.round(((panelCount * panelWattage) / 1000) * 100) / 100
    : directCapacityKwp;

  const derivedInverterKw = inverterSizeKw || Math.round(calculatedKwp * 0.95 * 10) / 10;
  const tiltDeg = selectedSlope === 'custom' ? customTiltDeg : slopeCategoryToTilt(selectedSlope);
  const azimuthDeg = orientationToAzimuth(selectedOrientation);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const roofConfig: RoofConfiguration = {
      usableAreaM2: Math.round((calculatedKwp / 0.21 / 0.72) * 10) / 10,
      usableRatio: 0.75,
      tiltDeg,
      tiltCategory: selectedSlope,
      azimuthDeg,
      orientationCategory: selectedOrientation,
      geometrySource: 'installer_specs',
      confidence: 'high',
    };

    const sysConfig: SystemConfiguration = {
      systemCapacityKwp: calculatedKwp,
      panelCount: usePanelCountCalc ? panelCount : Math.ceil((calculatedKwp * 1000) / panelWattage),
      panelWattage,
      inverterCapacityKw: derivedInverterKw,
      moduleEfficiency: 0.21,
      temperatureCoefficient: -0.0035,
      systemLossesPercent: systemLosses,
      configurationSource: usePanelCountCalc ? 'panel_count' : 'known_specs',
    };

    onSubmit(roofConfig, sysConfig);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6"
      id="known-system-specs-form"
    >
      {/* Header with Back */}
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
              Enter Existing Solar System Details
            </h2>
            <p className="text-xs text-slate-500">
              Provide your equipment specs for high-accuracy pvlib generation modeling.
            </p>
          </div>
        </div>
      </div>

      {/* System Size & Calculation Toggle */}
      <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-600" />
            Solar System Size
          </label>
          <button
            type="button"
            id="toggle-panel-count-calc"
            onClick={() => setUsePanelCountCalc(!usePanelCountCalc)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            {usePanelCountCalc ? '← Enter total kWp directly' : 'Not sure? Calculate from panel count'}
          </button>
        </div>

        {!usePanelCountCalc ? (
          <div>
            <div className="flex items-center gap-3">
              <input
                id="input-system-kwp"
                type="number"
                step="0.1"
                min="0.5"
                max="500"
                value={directCapacityKwp}
                onChange={(e) => setDirectCapacityKwp(parseFloat(e.target.value) || 0)}
                className="w-36 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
              />
              <span className="text-sm font-bold text-slate-700">kWp (Kilowatt-peak DC)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Typical residential home in the Philippines: 3.0 – 10.0 kWp
            </p>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">
                  Number of Solar Panels
                </label>
                <input
                  id="input-panel-count"
                  type="number"
                  min="1"
                  max="1000"
                  value={panelCount}
                  onChange={(e) => setPanelCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">
                  Wattage per Panel (Watts)
                </label>
                <input
                  id="input-panel-wattage"
                  type="number"
                  step="5"
                  min="100"
                  max="750"
                  value={panelWattage}
                  onChange={(e) => setPanelWattage(parseInt(e.target.value) || 400)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                />
              </div>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900 flex items-center justify-between">
              <span>
                {panelCount} panels × {panelWattage} W =
              </span>
              <strong className="text-sm font-bold text-indigo-700">{calculatedKwp} kWp Total Capacity</strong>
            </div>
          </div>
        )}
      </div>

      {/* Roof Direction (Compass UX - recognition over recall) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-600" />
            Which direction does your roof face?
          </label>
          <span className="text-xs text-indigo-700 font-bold">{selectedOrientation} ({azimuthDeg}°)</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ORIENTATIONS.map((ori) => {
            const isSelected = selectedOrientation === ori.code;
            return (
              <button
                key={ori.code}
                type="button"
                id={`orient-btn-${ori.code}`}
                onClick={() => setSelectedOrientation(ori.code)}
                className={`py-2.5 px-1 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs'
                }`}
              >
                <span className="text-xs font-extrabold">{ori.code}</span>
                <span className="text-[9px] opacity-80">{ori.angle}°</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Roof Slope (Visual Categories) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            How steep is your roof?
          </label>
          <span className="text-xs text-indigo-700 font-bold">{tiltDeg}° Tilt</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {SLOPES.map((slope) => {
            const isSelected = selectedSlope === slope.category;
            return (
              <button
                key={slope.category}
                type="button"
                id={`slope-btn-${slope.category}`}
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
                <p className="text-[10px] text-slate-500 leading-tight">{slope.desc}</p>
              </button>
            );
          })}
        </div>

        {selectedSlope === 'custom' && (
          <div className="pt-2 flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="60"
              value={customTiltDeg}
              onChange={(e) => setCustomTiltDeg(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <span className="text-xs font-bold text-indigo-600 w-12 text-right">{customTiltDeg}°</span>
          </div>
        )}
      </div>

      {/* Progressive Disclosure: Inverter & Advanced Loss Parameters */}
      <div className="border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Advanced System Settings (Inverter & Losses)
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Inverter Rated AC Size (kW)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="500"
                value={inverterSizeKw}
                onChange={(e) => setInverterSizeKw(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">DC/AC ratio: {(calculatedKwp / (inverterSizeKw || 1)).toFixed(2)}</p>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Overall System Losses (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="5"
                max="30"
                value={systemLosses}
                onChange={(e) => setSystemLosses(parseFloat(e.target.value) || 13.5)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">Standard tropical baseline: 13.5% (soiling, heat, wiring)</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Submit */}
      <button
        id="btn-calculate-existing-system"
        type="submit"
        disabled={isLoading || calculatedKwp <= 0}
        className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        <Zap className="w-4 h-4 fill-white" />
        <span>Calculate pvlib Generation Forecast</span>
      </button>
    </form>
  );
};
