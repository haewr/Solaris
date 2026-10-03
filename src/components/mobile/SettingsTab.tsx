import React, { useState, useEffect } from 'react';
import {
  Shield,
  Trash2,
  Lock,
  Plane,
  CheckCircle2,
  Calendar,
  MapPinOff,
  X,
} from 'lucide-react';
import { AppSettings, DegradationProfile } from '../../types/nativeSolaris';
import { encryptedStorage } from '../../services/encryptedStorageService';
import { degradationService } from '../../services/degradationService';
import { biometricLockService } from '../../services/biometricLockService';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onResetAllData: () => void;
  onDeleteLocation?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
  onDeleteLocation,
}) => {
  const [degProfile, setDegProfile] = useState<DegradationProfile | null>(null);
  const [installDate, setInstallDate] = useState('');
  const [degRate, setDegRate] = useState(0.70);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [showLocationDeleteConfirm, setShowLocationDeleteConfirm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [locationDeleteNotification, setLocationDeleteNotification] = useState<string | null>(null);

  useEffect(() => {
    loadSettingsAndDegradation();
  }, []);

  const loadSettingsAndDegradation = async () => {
    const profile = await degradationService.getProfile();
    setDegProfile(profile);
    const hasCustom = await degradationService.hasCustomProfile();
    if (hasCustom && profile.installationDate) {
      setInstallDate(profile.installationDate);
    } else {
      setInstallDate('');
    }
    setDegRate(profile.annualDegradationRatePercent);
  };

  const handleSaveDegradation = async () => {
    if (!installDate) return;
    const updated = await degradationService.saveProfile(installDate, degRate);
    setDegProfile(updated);
    setSaveSuccessMsg('Degradation parameters saved & synchronized.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleToggleDeviceLock = async () => {
    if (settings.deviceLockEnabled) {
      // Disable lock
      await biometricLockService.disableLock();
      onUpdateSettings({ ...settings, deviceLockEnabled: false });
    } else {
      // Open PIN setup
      setShowPinSetup(true);
    }
  };

  const handleConfirmPinSetup = async () => {
    if (newPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PIN entries do not match.');
      return;
    }

    await biometricLockService.enableLock(newPin);
    onUpdateSettings({ ...settings, deviceLockEnabled: true });
    setShowPinSetup(false);
    setNewPin('');
    setConfirmPin('');
    setPinError(null);
  };

  const handleToggleAirplaneMode = (enabled: boolean) => {
    onUpdateSettings({ ...settings, airplaneModeSimulated: enabled });
  };

  const handleConfirmDeleteLocation = async () => {
    // Purge cached siting queries & stored coordinates
    encryptedStorage.deleteItem('solaris_last_siting_location');
    try {
      localStorage.removeItem('solaris_location');
      localStorage.removeItem('solaris_nasa_data');
    } catch {}

    onUpdateSettings({ ...settings, locationPermissionGranted: false });
    if (onDeleteLocation) {
      onDeleteLocation();
    }

    setShowLocationDeleteConfirm(false);
    setLocationDeleteNotification('Saved location and siting cache deleted successfully.');
    setTimeout(() => setLocationDeleteNotification(null), 4000);
  };

  const handleFullWipe = () => {
    encryptedStorage.clearAllLocalData();
    setShowWipeConfirm(false);
    onResetAllData();
  };

  return (
    <div className="space-y-4 pb-6" id="solaris-settings-tab">
      {/* Location Deletion Notification Banner */}
      {locationDeleteNotification && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <MapPinOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{locationDeleteNotification}</span>
          </div>
          <button
            onClick={() => setLocationDeleteNotification(null)}
            className="p-1 rounded-lg hover:bg-amber-100 text-amber-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {saveSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* 1. Offline Mode & Airplane Mode Testing Simulator */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${settings.airplaneModeSimulated ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Simulate Airplane / Offline Mode
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Verify offline cache resilience</span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.airplaneModeSimulated}
              onChange={(e) => handleToggleAirplaneMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Toggle this switch to simulate an immediate loss of cellular and Wi-Fi connectivity. The Siting, Simulation, and Live-Generation screens will strictly retrieve their last authentic results from the encrypted local cache.
        </p>
      </div>

      {/* 2. Solar Degradation Module Parameters */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Solar Degradation Module
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Installation Date Input */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Real Installation Date
            </label>
            <input
              type="date"
              value={installDate}
              onChange={(e) => setInstallDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            />
            {installDate && degProfile && (
              <span className="text-[10px] text-slate-500 font-medium block">
                Calculated system age: <strong>{degProfile.systemAgeYears} years</strong> (Retention: {(degProfile.degradationRetentionFactor * 100).toFixed(2)}%)
              </span>
            )}
          </div>

          {/* Annual Degradation Rate Slider */}
          <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-700">Annual Degradation Rate:</span>
              <strong className="text-amber-700 font-mono text-xs">{degRate.toFixed(2)}% / year</strong>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.5"
              step="0.05"
              value={degRate}
              onChange={(e) => setDegRate(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>0.20% (Ultra-Tier 1)</span>
              <span>0.70% (Tropical Median)</span>
              <span>1.50% (Severe)</span>
            </div>
          </div>

          <button
            onClick={handleSaveDegradation}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs active:scale-98 transition-all"
          >
            Apply & Save Degradation Profile
          </button>
        </div>
      </div>

      {/* 3. App Lock */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                App Lock
              </span>
              <span className="text-[10px] text-slate-500 font-medium">4-digit PIN protection</span>
            </div>
          </div>

          <button
            onClick={handleToggleDeviceLock}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              settings.deviceLockEnabled
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {settings.deviceLockEnabled ? 'Lock Active' : 'Enable Lock'}
          </button>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          Protects your local assessments when opening Solaris on this device. No user accounts or server authentication.
        </p>

        {showPinSetup && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-3 animate-in fade-in">
            <span className="text-xs font-bold text-indigo-950 block">Set 4-Digit Device PIN</span>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="password"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit PIN"
                className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-center text-sm font-bold tracking-widest text-slate-900"
              />
              <input
                type="password"
                maxLength={4}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Confirm PIN"
                className="px-3 py-2 bg-white border border-indigo-200 rounded-xl text-center text-sm font-bold tracking-widest text-slate-900"
              />
            </div>
            {pinError && <p className="text-[11px] text-rose-600 font-medium">{pinError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPinSetup(false)}
                className="w-1/2 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPinSetup}
                className="w-1/2 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              >
                Save PIN
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Privacy & Storage Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Privacy & Storage Controls
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
          <p>
            All location coordinates, roof dimensions, and assessment figures remain strictly on this device in encrypted local storage.
          </p>
          <p className="text-slate-500">
            External network communications are limited to read-only scientific queries to <strong>NASA POWER</strong> (solar irradiance) and <strong>forecast.solar</strong> (daylight forecast).
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setShowLocationDeleteConfirm(true)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center flex items-center justify-center gap-1.5"
          >
            <MapPinOff className="w-3.5 h-3.5 text-slate-500" />
            <span>Delete Saved Location</span>
          </button>
          <button
            onClick={() => setShowWipeConfirm(true)}
            className="py-2.5 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Wipe All Data</span>
          </button>
        </div>
      </div>

      {/* Location Deletion Confirmation Modal */}
      {showLocationDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <MapPinOff className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Delete Saved Location?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete your saved location? This will clear your rooftop coordinates and reset your solar siting cache.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowLocationDeleteConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteLocation}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Wipe All Local Data?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This permanently deletes all encrypted assessments, cached satellite readings, and device passcode. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowWipeConfirm(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleFullWipe}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirm Wipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
