import React, { useState } from 'react';
import { ShieldCheck, Fingerprint, Lock, KeyRound, AlertCircle } from 'lucide-react';
import { biometricLockService } from '../../services/biometricLockService';

interface BiometricLockModalProps {
  onUnlockSuccess: () => void;
}

export const BiometricLockModal: React.FC<BiometricLockModalProps> = ({ onUnlockSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePinInput = async (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);

    if (newPin.length === 4) {
      setIsVerifying(true);
      const ok = await biometricLockService.verifyPasscode(newPin);
      setIsVerifying(false);
      if (ok) {
        onUnlockSuccess();
      } else {
        setError('Incorrect PIN passcode. Please try again.');
        setPin('');
      }
    }
  };

  const handleDeleteDigit = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleBiometricPrompt = async () => {
    setIsVerifying(true);
    setError(null);
    const success = await biometricLockService.promptBiometric();
    setIsVerifying(false);
    if (success) {
      onUnlockSuccess();
    } else {
      setError('Biometric authentication did not complete. Please enter your 4-digit device PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="w-full max-w-xs flex flex-col items-center space-y-6 animate-in fade-in zoom-in-95">
        {/* Lock Icon & Title */}
        <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold font-['Space_Grotesk'] text-slate-100">Solaris Device Gate</h2>
          <p className="text-xs text-slate-400">Local biometric & passcode lock</p>
        </div>

        {/* PIN Indicators (4 dots) */}
        <div className="flex items-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                pin.length > idx
                  ? 'bg-indigo-500 scale-110 shadow-sm shadow-indigo-500/50'
                  : 'bg-slate-700 border border-slate-600'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] text-center font-medium w-full animate-shake">
            {error}
          </div>
        )}

        {/* Biometric trigger button */}
        <button
          onClick={handleBiometricPrompt}
          disabled={isVerifying}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95"
        >
          <Fingerprint className="w-4 h-4 text-indigo-400" />
          <span>Unlock with Biometrics</span>
        </button>

        {/* Numeric Keypad (44x44+ touch targets) */}
        <div className="grid grid-cols-3 gap-3 w-full pt-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handlePinInput(num)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-indigo-600/40 text-lg font-bold text-slate-100 transition-all active:scale-95 flex items-center justify-center border border-slate-700/50"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handlePinInput('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-indigo-600/40 text-lg font-bold text-slate-100 transition-all active:scale-95 flex items-center justify-center border border-slate-700/50"
          >
            0
          </button>
          <button
            onClick={handleDeleteDigit}
            className="h-14 rounded-2xl bg-slate-800/50 hover:bg-slate-700/80 active:bg-slate-700 text-xs font-semibold text-slate-300 transition-all active:scale-95 flex items-center justify-center border border-slate-700/40"
          >
            Delete
          </button>
        </div>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Local device security only. No user credentials or accounts are transmitted over the network.
        </p>
      </div>
    </div>
  );
};
