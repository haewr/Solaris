import React from 'react';
import { Sun, ShieldCheck, Plane, Wifi, WifiOff, Battery, Sparkles } from 'lucide-react';

interface MobileHeaderProps {
  isAirplaneMode: boolean;
  onToggleAirplaneMode: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  isAirplaneMode,
  onToggleAirplaneMode,
}) => {
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 z-30 shrink-0 select-none">
      {/* Native Mobile Status Bar (Signal, Clock, Battery) */}
      <div className="px-5 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-700 tracking-tight">
        <span className="font-mono font-bold text-slate-800">{currentTime}</span>

        {/* Notch / Dynamic Island Simulator */}
        <div className="w-20 h-3.5 bg-slate-900 rounded-full mx-auto hidden sm:block opacity-90 shadow-2xs" />

        <div className="flex items-center gap-2">
          {isAirplaneMode ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md font-bold">
              <Plane className="w-3 h-3" />
              <span>Offline</span>
            </span>
          ) : (
            <Wifi className="w-3.5 h-3.5 text-slate-600" />
          )}
          <span className="text-[10px] font-mono font-bold text-slate-600">92%</span>
          <div className="w-4 h-2.5 border border-slate-600 rounded-[3px] p-0.5 flex items-center">
            <div className="bg-slate-700 h-full w-[85%] rounded-[1px]" />
          </div>
        </div>
      </div>

      {/* Main App Title Bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-100">
            <Sun className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-black font-['Space_Grotesk'] tracking-tight text-slate-900">
                Solaris
              </h1>
              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase tracking-wider">
                Dumaguete
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Native Solar Assessment Engine</p>
          </div>
        </div>

        {/* Airplane Mode quick toggle chip */}
        <button
          onClick={onToggleAirplaneMode}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border ${
            isAirplaneMode
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
          }`}
          title="Toggle simulated airplane / offline mode"
        >
          {isAirplaneMode ? (
            <>
              <Plane className="w-3 h-3 text-amber-700" />
              <span>Airplane Mode</span>
            </>
          ) : (
            <>
              <Wifi className="w-3 h-3 text-emerald-600" />
              <span>Live API</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
