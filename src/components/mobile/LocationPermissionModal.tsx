import React from 'react';
import { Navigation, MapPin, ShieldCheck, Sun, X } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLocating?: boolean;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLocating = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200 text-slate-900 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          aria-label="Close permission dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Header */}
        <div className="flex items-start gap-3 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                Allow Location Access?
              </h3>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-700">
                Expo Location
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Solaris calls Expo Location to pinpoint your exact rooftop
            </p>
          </div>
        </div>

        {/* Explanation Points */}
        <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-slate-800 block text-[11px]">Pinpoint Rooftop</strong>
              <span className="text-[11px] text-slate-500">
                Instantly centers the satellite map on your building to measure roof area.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Sun className="w-3.5 h-3.5" />
            </div>
            <div>
              <strong className="text-slate-800 block text-[11px]">NASA POWER Satellite Data</strong>
              <span className="text-[11px] text-slate-500">
                Retrieves precise local solar irradiance (H kWh/m²/day) and ambient temperature.
              </span>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Your coordinates are processed locally and never stored externally.</span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => {
              onConfirm();
            }}
            disabled={isLocating}
            className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-60"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Requesting GPS Location...' : 'Allow Location Access'}</span>
          </button>

          <button
            onClick={onClose}
            disabled={isLocating}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    </div>
  );
};
