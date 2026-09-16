import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  Database,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Plane,
  MapPin,
  HelpCircle,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { AppSettings, DegradationProfile } from '../../types/nativeSolaris';
import { encryptedStorage } from '../../services/encryptedStorageService';
import { degradationService, NREL_LITERATURE_CITATION } from '../../services/degradationService';
import { biometricLockService } from '../../services/biometricLockService';

interface SettingsTabProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
  onResetAllData: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settings,
  onUpdateSettings,
  onResetAllData,
}) => {
  const [storageStats, setStorageStats] = useState(encryptedStorage.getStorageStats());
  const [degProfile, setDegProfile] = useState<DegradationProfile | null>(null);
  const [installDate, setInstallDate] = useState('');
  const [degRate, setDegRate] = useState(0.70);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadSettingsAndDegradation();
  }, []);

  const loadSettingsAndDegradation = async () => {
    setStorageStats(encryptedStorage.getStorageStats());
    const profile = await degradationService.getProfile();
    setDegProfile(profile);
    setInstallDate(profile.installationDate);
    setDegRate(profile.annualDegradationRatePercent);
  };

  const handleSaveDegradation = async () => {
    if (!installDate) return;
    const updated = await degradationService.saveProfile(installDate, degRate);
    setDegProfile(updated);
    setStorageStats(encryptedStorage.getStorageStats());
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

  const handleRevokeLocation = async () => {
    // Purge cached siting queries
    encryptedStorage.deleteItem('solaris_last_siting_location');
    setStorageStats(encryptedStorage.getStorageStats());
    onUpdateSettings({ ...settings, locationPermissionGranted: false });
    setSaveSuccessMsg('Location cache cleared & permission reset.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleFullWipe = () => {
    encryptedStorage.clearAllLocalData();
    setShowWipeConfirm(false);
    onResetAllData();
  };

  return (
    <div className="space-y-4 pb-6" id="solaris-settings-tab">
      {saveSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
              <span className="text-[10px] text-slate-500 font-medium">Verify Step 1 offline cache resilience</span>
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

      {/* 2. Step 1: Encrypted Storage Manager (AES-GCM & LRU) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Encrypted Local Storage (Step 1)
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            AES-GCM 256-bit
          </span>
        </div>

        {/* Quota Gauge */}
        <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Storage Footprint:</span>
            <span className="font-mono font-bold text-slate-800">
              {(storageStats.totalSizeBytes / 1024).toFixed(1)} KB / {(storageStats.maxSizeBytes / (1024 * 1024)).toFixed(0)} MB ({storageStats.percentUsed}% used)
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.max(1, storageStats.percentUsed)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span>Automatic LRU Eviction Active</span>
            <span>Total Vault Records: {storageStats.totalEntries}</span>
          </div>
        </div>

        {/* Record Breakdown */}
        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-semibold">Siting</span>
            <strong className="text-slate-800 text-xs font-mono">{storageStats.entriesByCategory.siting || 0}</strong>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-semibold">Sim</span>
            <strong className="text-slate-800 text-xs font-mono">{storageStats.entriesByCategory.simulation || 0}</strong>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-semibold">Live</span>
            <strong className="text-slate-800 text-xs font-mono">{storageStats.entriesByCategory.live || 0}</strong>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-400 block font-semibold">Config</span>
            <strong className="text-slate-800 text-xs font-mono">{storageStats.entriesByCategory.settings || 0}</strong>
          </div>
        </div>
      </div>

      {/* 3. Step 5: Degradation Module Parameters */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Solar Degradation Module (Step 5)
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-500">NREL Sourced</span>
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
            {degProfile && (
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

          {/* Literature Citation */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex items-start gap-2">
            <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <p className="leading-tight">
              <strong>Cited Field Study:</strong> Jordan & Kurtz (2012 / 2016), NREL Compendium of Photovoltaic Degradation Rates. Tropical climates show an empirical median rate of 0.70%/yr.
            </p>
          </div>

          <button
            onClick={handleSaveDegradation}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs active:scale-98 transition-all"
          >
            Apply & Save Degradation Profile
          </button>
        </div>
      </div>

      {/* 4. Local Biometric & Device Lock */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Local Device Gate Lock
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Biometric & 4-digit PIN</span>
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

      {/* 5. Philippines Data Privacy Act (RA 10173) & Purge Controls */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Privacy Compliance (RA 10173)
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
          <p>
            <strong>Philippines Data Privacy Act of 2012 (RA 10173):</strong> All location fixes, roof dimensions, and assessment figures remain strictly on this device in encrypted local storage.
          </p>
          <p className="text-slate-500">
            The only external network communications are read-only scientific queries to <strong>NASA POWER</strong> (satellite solar irradiance) and <strong>forecast.solar</strong> (sky forecast).
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleRevokeLocation}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors text-center"
          >
            Clear Location Cache
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

      {/* Wipe Confirmation Modal */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl border border-slate-200 space-y-4">
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
