import React, { useState, useEffect } from 'react';
import {
  LocationCoordinates,
  RoofDimensions,
  NasaPowerClimatologyData,
  AppSettings,
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

export const SolarisMobileApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabDestination>('siting');

  // Location State (Default: Dumaguete City, Negros Oriental, Philippines)
  const [location, setLocation] = useState<LocationCoordinates>({
    latitude: DUMAGUETE_DEFAULT_COORDS.latitude,
    longitude: DUMAGUETE_DEFAULT_COORDS.longitude,
    timestamp: Date.now(),
    source: 'manual_pinpoint',
    addressName: DUMAGUETE_DEFAULT_COORDS.name,
  });

  // Roof Geometry State
  const [roof, setRoof] = useState<RoofDimensions>({
    mode: 'dimensions',
    widthMeters: 7.0,
    lengthMeters: 8.0,
    totalAreaM2: 56.0,
    usableAreaM2: 42.0, // 75% usable area after setbacks
    tiltDegrees: 12, // 12° optimal for Dumaguete (9.3° N)
    azimuthDegrees: 180, // True South
    orientationName: 'South (180° Optimal)',
  });

  // NASA POWER Climatology Data (Real Satellite Irradiance)
  const [nasaData, setNasaData] = useState<NasaPowerClimatologyData | null>(null);

  // App Settings & Local Security
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isLocked, setIsLocked] = useState(false);
  const [recommendedKwp, setRecommendedKwp] = useState<number>(3.5);

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
    // Recommended kWp = Usable Area (42m²) * 20% panel efficiency ≈ 8.4 kWp or roof proportion
    const rec = Math.round(roof.usableAreaM2 * 0.20 * 10) / 10;
    setRecommendedKwp(rec);
  };

  const handleResetAllData = () => {
    // Reset to initial clean state
    setLocation({
      latitude: DUMAGUETE_DEFAULT_COORDS.latitude,
      longitude: DUMAGUETE_DEFAULT_COORDS.longitude,
      timestamp: Date.now(),
      source: 'manual_pinpoint',
      addressName: DUMAGUETE_DEFAULT_COORDS.name,
    });
    setRoof({
      mode: 'dimensions',
      widthMeters: 7.0,
      lengthMeters: 8.0,
      totalAreaM2: 56.0,
      usableAreaM2: 42.0,
      tiltDegrees: 12,
      azimuthDegrees: 180,
      orientationName: 'South (180° Optimal)',
    });
    setNasaData(null);
    setSettings(DEFAULT_APP_SETTINGS);
    setIsLocked(false);
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
          />
        )}

        {currentTab === 'live' && (
          <LiveTab
            location={location}
            roof={roof}
            systemSizeKwp={recommendedKwp}
            isAirplaneMode={settings.airplaneModeSimulated}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdateSettings={setSettings}
            onResetAllData={handleResetAllData}
          />
        )}
      </main>

      {/* Native Mobile Bottom Navigation Bar */}
      <MobileNavBar currentTab={currentTab} onSelectTab={setCurrentTab} />
    </div>
  );
};
