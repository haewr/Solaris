import React, { useState } from 'react';
import { PhoneSimulatorFrame } from './components/PhoneSimulatorFrame';
import { SolarisMobileApp } from './components/mobile/SolarisMobileApp';

export default function App() {
  const [activeFormat, setActiveFormat] = useState<'phone' | 'tablet' | 'desktop'>('phone');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  return (
    <div className="w-full min-h-screen bg-slate-950 font-sans">
      <PhoneSimulatorFrame
        activeFormat={activeFormat}
        onChangeFormat={setActiveFormat}
        orientation={orientation}
        onToggleOrientation={() =>
          setOrientation((prev) => (prev === 'portrait' ? 'landscape' : 'portrait'))
        }
      >
        <SolarisMobileApp />
      </PhoneSimulatorFrame>
    </div>
  );
}
