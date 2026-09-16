import React, { useState } from 'react';
import { X, Sliders, RotateCcw, Check, Zap, Compass, Home } from 'lucide-react';
import { Assessment, SystemConfiguration, RoofConfiguration } from '../types/solaris';

interface AdjustSystemModalProps {
  assessment: Assessment;
  onClose: () => void;
  onApplyChanges: (roof: RoofConfiguration, system: SystemConfiguration) => void;
}

export const AdjustSystemModal: React.FC<AdjustSystemModalProps> = ({
  assessment,
  onClose,
  onApplyChanges,
}) => {
  const [capacityKwp, setCapacityKwp] = useState(assessment.system.systemCapacityKwp);
  const [panelWattage, setPanelWattage] = useState(assessment.system.panelWattage);
  const [panelCount, setPanelCount] = useState(assessment.system.panelCount);
  const [inverterKw, setInverterKw] = useState(assessment.system.inverterCapacityKw);
  const [tiltDeg, setTiltDeg] = useState(assessment.roof.tiltDeg);
  const [azimuthDeg, setAzimuthDeg] = useState(assessment.roof.azimuthDeg);
  const [systemLosses, setSystemLosses] = useState(assessment.system.systemLossesPercent);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedRoof: RoofConfiguration = {
      ...assessment.roof,
      tiltDeg,
      azimuthDeg,
    };

    const updatedSystem: SystemConfiguration = {
      ...assessment.system,
      systemCapacityKwp: capacityKwp,
      panelWattage,
      panelCount,
      inverterCapacityKw: inverterKw,
      systemLossesPercent: systemLosses,
    };

    onApplyChanges(updatedRoof, updatedSystem);
    onClose();
  };

  const handleResetDefaults = () => {
    setCapacityKwp(assessment.system.systemCapacityKwp);
    setPanelWattage(420);
    setInverterKw(assessment.system.systemCapacityKwp * 0.95);
    setTiltDeg(15);
    setAzimuthDeg(180);
    setSystemLosses(13.5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" id="adjust-system-modal">
      <form
        onSubmit={handleApply}
        className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-7 space-y-6 my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-['Space_Grotesk']">
                Adjust System Assumptions
              </h3>
              <p className="text-xs text-slate-500">
                Live recalculation of generation forecast parameters
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-xs">
          {/* Capacity */}
          <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-600" /> System Capacity (kWp DC)
              </label>
              <span className="font-black text-indigo-700 text-sm">{capacityKwp} kWp</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="0.1"
              value={capacityKwp}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCapacityKwp(val);
                setPanelCount(Math.ceil((val * 1000) / panelWattage));
                setInverterKw(Math.round(val * 0.95 * 10) / 10);
              }}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Roof Tilt */}
          <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-indigo-600" /> Roof Tilt Slope (degrees)
              </label>
              <span className="font-bold text-slate-800">{tiltDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={tiltDeg}
              onChange={(e) => setTiltDeg(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Roof Azimuth */}
          <div className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-600" /> Roof Azimuth Angle (0°=N, 90°=E, 180°=S, 270°=W)
              </label>
              <span className="font-bold text-slate-800">{azimuthDeg}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="5"
              value={azimuthDeg}
              onChange={(e) => setAzimuthDeg(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>

          {/* Grid of secondary inputs */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Inverter AC Rating (kW)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="100"
                value={inverterKw}
                onChange={(e) => setInverterKw(parseFloat(e.target.value) || 1)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Total System Losses (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="5"
                max="30"
                value={systemLosses}
                onChange={(e) => setSystemLosses(parseFloat(e.target.value) || 13.5)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              id="btn-apply-system-adjustments"
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-100 transition-colors"
            >
              Apply & Recalculate
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
