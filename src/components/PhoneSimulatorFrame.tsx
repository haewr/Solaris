import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Tablet,
  RotateCw,
  Maximize2,
  Minimize2,
  Wifi,
  BatteryMedium,
  Signal,
  Check,
} from 'lucide-react';

interface PhoneSimulatorFrameProps {
  children: React.ReactNode;
  activeFormat: 'phone' | 'tablet' | 'desktop';
  onChangeFormat: (format: 'phone' | 'tablet' | 'desktop') => void;
  orientation?: 'portrait' | 'landscape';
  onToggleOrientation?: () => void;
}

export const PhoneSimulatorFrame: React.FC<PhoneSimulatorFrameProps> = ({
  children,
  activeFormat,
  onChangeFormat,
  orientation = 'portrait',
  onToggleOrientation,
}) => {
  const [deviceModel, setDeviceModel] = useState<'iphone15' | 'pixel8'>('iphone15');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (activeFormat === 'desktop') {
    return <div className="w-full min-h-screen">{children}</div>;
  }

  const isPhone = activeFormat === 'phone';
  const isTablet = activeFormat === 'tablet';

  // Device dimensions
  let frameWidth = '393px';
  let frameHeight = '844px';

  if (isPhone) {
    if (orientation === 'portrait') {
      frameWidth = '393px';
      frameHeight = '840px';
    } else {
      frameWidth = '840px';
      frameHeight = '393px';
    }
  } else if (isTablet) {
    if (orientation === 'portrait') {
      frameWidth = '768px';
      frameHeight = '980px';
    } else {
      frameWidth = '980px';
      frameHeight = '768px';
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-start py-4 sm:py-6 px-2 sm:px-4">
      {/* Control bar above the device */}
      <div className="w-full max-w-4xl bg-slate-800/90 border border-slate-700/80 backdrop-blur-md rounded-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {isPhone ? 'Phone Viewport Mode' : 'Tablet Viewport Mode'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {frameWidth} × {frameHeight}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Simulating mobile touchscreen ergonomics, navigation, and layout
            </p>
          </div>
        </div>

        {/* Viewport switch controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => onChangeFormat('phone')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFormat === 'phone'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone</span>
            </button>

            <button
              onClick={() => onChangeFormat('tablet')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFormat === 'tablet'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>

            <button
              onClick={() => onChangeFormat('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeFormat === 'desktop'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Full Screen</span>
            </button>
          </div>

          {onToggleOrientation && (
            <button
              onClick={onToggleOrientation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-medium transition-colors"
              title="Rotate Screen"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline capitalize">{orientation}</span>
            </button>
          )}
        </div>
      </div>

      {/* Realistic Mobile Device Mockup */}
      <div className="relative flex justify-center items-center w-full overflow-x-auto pb-10">
        <div
          className="relative bg-slate-950 p-3 rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.1),0_0_40px_rgba(99,102,241,0.15)] border-4 border-slate-700 transition-all duration-300 ease-out shrink-0"
          style={{
            width: isPhone && orientation === 'portrait' ? '417px' : frameWidth,
            maxWidth: '100%',
          }}
        >
          {/* Outer hardware buttons (Volume, Power) */}
          {isPhone && orientation === 'portrait' && (
            <>
              {/* Left side: Mute switch & Volume */}
              <div className="absolute -left-[7px] top-[105px] w-[3px] h-[26px] bg-slate-600 rounded-l-sm" />
              <div className="absolute -left-[7px] top-[145px] w-[3px] h-[50px] bg-slate-600 rounded-l-sm" />
              <div className="absolute -left-[7px] top-[205px] w-[3px] h-[50px] bg-slate-600 rounded-l-sm" />
              {/* Right side: Power button */}
              <div className="absolute -right-[7px] top-[165px] w-[3px] h-[75px] bg-slate-600 rounded-r-sm" />
            </>
          )}

          {/* Screen Container */}
          <div
            className="relative bg-slate-50 text-slate-900 rounded-[38px] overflow-hidden flex flex-col border border-slate-900/40 shadow-inner"
            style={{
              width: frameWidth,
              height: frameHeight,
              maxWidth: '100%',
            }}
          >
            {/* Phone Status Bar */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-6 py-2 flex items-center justify-between text-slate-800 text-[12px] font-bold border-b border-slate-100 select-none shrink-0">
              <span>9:41</span>

              {/* Dynamic Island / Speaker Notch */}
              <div className="w-24 h-5 bg-slate-900 rounded-full flex items-center justify-end px-2 gap-1.5 shadow-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <div className="w-1 h-1 rounded-full bg-indigo-500/80" />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3 text-slate-800" />
                <Wifi className="w-3 h-3 text-slate-800" />
                <div className="flex items-center gap-0.5">
                  <span className="text-[10px] font-semibold text-slate-700">98%</span>
                  <BatteryMedium className="w-3.5 h-3.5 text-slate-800" />
                </div>
              </div>
            </div>

            {/* App Screen Content Scrollable Container */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth overscroll-contain bg-slate-50 text-slate-900"
              style={{
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {children}
            </div>

            {/* Bottom iOS Home Indicator Bar */}
            <div className="sticky bottom-0 z-40 bg-white/90 backdrop-blur-md py-1.5 flex justify-center items-center border-t border-slate-100/60 select-none shrink-0">
              <div className="w-32 h-1 bg-slate-400/80 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
