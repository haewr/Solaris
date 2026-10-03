import React, { useState, useEffect } from 'react';
import {
  LocationCoordinates,
  RoofDimensions,
  NasaPowerClimatologyData,
  AppSettings,
  SimulationUserInputs,
} from '../../types/nativeSolaris';
import { MobileHeader } from './MobileHeader';
import { MobileNavBar, TabDestination } from './MobileNavBar';
import { SitingTab } from './SitingTab';
import { SimulationTab } from './SimulationTab';
import { LiveTab } from './LiveTab';
import { SettingsTab } from './SettingsTab';
import { BiometricLockModal } from './BiometricLockModal';
import { biometricLockService, DEFAULT_APP_SETTINGS } from '../../services/biometricLockService';
import { DUMAGUETE_DEFAULT_COORDS } from '../../services/nasaPowerService';
import { encryptedStorage } from '../../services/encryptedStorageService';
import {
  DEFAULT_NORECO_II_TARIFF_PHP,
  PHILIPPINES_TURNKEY_COST_PER_KWP_PHP,
} from '../../services/simulationService';

const DEFAULT_ROOF: RoofDimensions = {
  mode: 'dimensions',
  widthMeters: 0,
  lengthMeters: 0,
  totalAreaM2: 0,
  usableAreaM2: 0,
  tiltDegrees: 12, // Standard optimal tilt indicator for Dumaguete (9.3° N)
  azimuthDegrees: 180, // True South
  orientationName: 'South (180° Optimal)',
};

const DEFAULT_SIMULATION_INPUTS: SimulationUserInputs = {
  systemSizeKwp: 0,
  tariffPhp: 0,
  costPerKwpPhp: 0,
  years: 0,
  activePage: 'parameters',
  showFullTable: false,
  hasUserCustomized: false,
};

export const SolarisMobileApp: React.FC = () => {
  // Active Tab: Restores last viewed tab or starts on 'siting'
  const [currentTab, setCurrentTab] = useState<TabDestination>(() => {
    try {
      const saved = localStorage.getItem('solaris_current_tab');
      if (saved && ['siting', 'simulation', 'live', 'settings'].includes(saved)) {
        return saved as TabDestination;
      }
    } catch (e) {}
    return 'siting';
  });

  useEffect(() => {
    try {
      localStorage.setItem('solaris_current_tab', currentTab);
    } catch (e) {}
  }, [currentTab]);

  // Location State: Starts unpinned (null) on first launch; restores last pinned location after that
  const [location, setLocation] = useState<LocationCoordinates | null>(() => {
    try {
      const saved = localStorage.getItem('solaris_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (location) {
        localStorage.setItem('solaris_location', JSON.stringify(location));
      } else {
        localStorage.removeItem('solaris_location');
      }
    } catch (e) {}
  }, [location]);

  // Roof Geometry State: Starts at 0 dimensions on first launch; restores last user-entered dimensions after that
  const [roof, setRoof] = useState<RoofDimensions>(() => {
    try {
      const saved = localStorage.getItem('solaris_roof');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_ROOF,
            ...parsed,
          };
        }
      }
    } catch (e) {}
    return DEFAULT_ROOF;
  });

  useEffect(() => {
    try {
      localStorage.setItem('solaris_roof', JSON.stringify(roof));
    } catch (e) {}
  }, [roof]);

  // NASA POWER Climatology Data: Restores previously fetched climatology so offline re-opens stay populated
  const [nasaData, setNasaData] = useState<NasaPowerClimatologyData | null>(() => {
    try {
      const saved = localStorage.getItem('solaris_nasa_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.annualDailyKwhM2 === 'number') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (nasaData) {
        localStorage.setItem('solaris_nasa_data', JSON.stringify(nasaData));
      } else {
        localStorage.removeItem('solaris_nasa_data');
      }
    } catch (e) {}
  }, [nasaData]);

  // App Settings & Local Security
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLocked, setIsLocked] = useState(false);

  // Recommended kWp: Restores last recommended capacity
  const [recommendedKwp, setRecommendedKwp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('solaris_recommended_kwp');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (e) {}
    return 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem('solaris_recommended_kwp', recommendedKwp.toString());
    } catch (e) {}
  }, [recommendedKwp]);

  // Simulation Inputs State: Starts initially empty on first launch; preserves all user inputs when reopening
  const [simulationInputs, setSimulationInputs] = useState<SimulationUserInputs>(() => {
    try {
      const saved = localStorage.getItem('solaris_simulation_inputs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            systemSizeKwp: typeof parsed.systemSizeKwp === 'number' ? parsed.systemSizeKwp : 0,
            tariffPhp: typeof parsed.tariffPhp === 'number' ? parsed.tariffPhp : 0,
            costPerKwpPhp: typeof parsed.costPerKwpPhp === 'number' ? parsed.costPerKwpPhp : 0,
            years: typeof parsed.years === 'number' ? parsed.years : 0,
            activePage: parsed.activePage === 'results' ? 'results' : 'parameters',
            showFullTable: Boolean(parsed.showFullTable),
            hasUserCustomized: Boolean(parsed.hasUserCustomized),
          };
        }
      }
    } catch (e) {}
    return DEFAULT_SIMULATION_INPUTS;
  });

  // Save simulation inputs whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('solaris_simulation_inputs', JSON.stringify(simulationInputs));
    } catch (e) {
      // ignore storage error
    }
  }, [simulationInputs]);

  // Initialize Encrypted Storage & Device Gate on mount
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    await encryptedStorage.init();
    const appSettings = await biometricLockService.getSettings();
    setSettings(appSettings);

    if (appSettings.deviceLockEnabled) {
      setIsLocked(true);
    }
  };

  const handleNasaDataFetched = (data: NasaPowerClimatologyData, fromCache: boolean, cacheTs?: number) => {
    setNasaData(data);
    if (roof.usableAreaM2 > 0) {
      const rec = Math.round(roof.usableAreaM2 * 0.20 * 10) / 10;
      setRecommendedKwp(rec);
    }
  };

  const handleResetAllData = () => {
    // Reset to initial clean, unpinned state
    setLocation(null);
    setRoof(DEFAULT_ROOF);
    setNasaData(null);
    setRecommendedKwp(0);
    setSettings(DEFAULT_APP_SETTINGS);
    setIsLocked(false);
    setSimulationInputs(DEFAULT_SIMULATION_INPUTS);
    try {
      localStorage.removeItem('solaris_location');
      localStorage.removeItem('solaris_roof');
      localStorage.removeItem('solaris_nasa_data');
      localStorage.removeItem('solaris_recommended_kwp');
      localStorage.removeItem('solaris_simulation_inputs');
      localStorage.removeItem('solaris_current_tab');
    } catch (e) {}
    setCurrentTab('siting');
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 text-slate-900 select-none relative font-sans">
      {/* Biometric Gate Screen Overlay */}
      {isLocked && (
        <BiometricLockModal onUnlockSuccess={() => setIsLocked(false)} />
      )}

      {/* Native App Header */}
      <MobileHeader
        isAirplaneMode={settings.airplaneModeSimulated}
        onToggleAirplaneMode={() =>
          setSettings((prev) => ({
            ...prev,
            airplaneModeSimulated: !prev.airplaneModeSimulated,
          }))
        }
      />

      {/* Main Tab Screen Viewport (Smooth Scrollable) */}
      <main className="flex-1 overflow-y-auto px-3.5 pt-3 pb-4 space-y-4">
        {currentTab === 'siting' && (
          <SitingTab
            location={location}
            onChangeLocation={setLocation}
            roof={roof}
            onChangeRoof={setRoof}
            nasaData={nasaData}
            onNasaDataFetched={handleNasaDataFetched}
            isAirplaneMode={settings.airplaneModeSimulated}
            onNavigateToSimulation={() => setCurrentTab('simulation')}
          />
        )}

        {currentTab === 'simulation' && (
          <SimulationTab
            nasaData={nasaData}
            recommendedKwp={recommendedKwp}
            isAirplaneMode={settings.airplaneModeSimulated}
            onNavigateToSettings={() => setCurrentTab('settings')}
            simulationInputs={simulationInputs}
            onChangeSimulationInputs={setSimulationInputs}
          />
        )}

        {currentTab === 'live' && (
          <LiveTab
            location={location}
            roof={roof}
            systemSizeKwp={simulationInputs.systemSizeKwp || recommendedKwp}
            isAirplaneMode={settings.airplaneModeSimulated}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={setSettings}
            onResetAllData={handleResetAllData}
            onDeleteLocation={() => {
              setLocation(null);
              setNasaData(null);
            }}
          />
        )}
      </main>

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileNavBar currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
};
