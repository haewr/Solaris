import React from 'react';
import { Compass, TrendingUp, Radio, Settings, ShieldCheck } from 'lucide-react';

export type TabDestination = 'siting' | 'simulation' | 'live' | 'settings';

interface MobileNavBarProps {
  currentTab: TabDestination;
  onSelectTab: (tab: TabDestination) => void;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: TabDestination; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'siting', label: 'Siting', icon: Compass },
    { id: 'simulation', label: 'Simulation', icon: TrendingUp },
    { id: 'live', label: 'Live Gen', icon: Radio },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around z-30 shrink-0 select-none"
      id="solaris-mobile-bottom-nav"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center min-w-[68px] min-h-[48px] py-1 px-2 rounded-2xl transition-all duration-150 active:scale-95 ${
              isActive
                ? 'text-indigo-600 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
            aria-label={`Navigate to ${tab.label}`}
          >
            <div
              className={`w-10 h-7 rounded-full flex items-center justify-center transition-all ${
                isActive ? 'bg-indigo-100/80 text-indigo-700' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
