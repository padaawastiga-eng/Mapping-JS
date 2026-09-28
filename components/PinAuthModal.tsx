'use client';

import React, { useState } from 'react';
import { Lock, KeyRound, X, AlertCircle, CheckCircle2, Delete } from 'lucide-react';

interface PinAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetTabName: string;
}

const CORRECT_PIN = '071126';

export const PinAuthModal: React.FC<PinAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetTabName,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (numStr: string) => {
    if (pinInput.length < 6) {
      const nextPin = pinInput + numStr;
      setPinInput(nextPin);
      setErrorMessage('');

      if (nextPin.length === 6) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMessage('');
  };

  const verifyPin = (enteredPin: string) => {
    if (enteredPin === CORRECT_PIN) {
      setIsSuccess(true);
      setErrorMessage('');
      setTimeout(() => {
        setIsSuccess(false);
        setPinInput('');
        onSuccess();
      }, 500);
    } else {
      setErrorMessage('PIN Salah! Khusus Admin Panitia.');
      setPinInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-base font-extrabold text-white uppercase tracking-tight">
            LOGIN ADMIN PANITIA
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Akses ke halaman <strong className="text-indigo-300">{targetTabName}</strong> memerlukan PIN Admin Panitia.
          </p>
        </div>

        {/* PIN Display Dots */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const isFilled = pinInput.length > idx;
            return (
              <div
                key={idx}
                className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-black font-mono transition-all ${
                  isSuccess
                    ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300'
                    : errorMessage
                    ? 'border-rose-500 bg-rose-950/50 text-rose-300 animate-shake'
                    : isFilled
                    ? 'border-indigo-500 bg-indigo-950/80 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950 text-slate-600'
                }`}
              >
                {isFilled ? '●' : ''}
              </div>
            );
          })}
        </div>

        {/* Status / Error Message */}
        {errorMessage && (
          <div className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 bg-rose-950/60 border border-rose-500/40 p-2 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess && (
          <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 p-2 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>PIN Benar! Membuka akses...</span>
          </div>
        )}

        {/* Touch Keypad (0-9) */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 active:bg-indigo-900 border border-slate-800 text-lg font-extrabold text-white transition active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 transition"
          >
            HAPUS
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 active:bg-indigo-900 border border-slate-800 text-lg font-extrabold text-white transition active:scale-95"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 flex items-center justify-center transition"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
