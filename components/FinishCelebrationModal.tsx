'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, CheckCircle, Share2, Award, RotateCcw, Sparkles } from 'lucide-react';
import { AppConfig } from '@/lib/types';
import { formatDuration, formatDistance } from '@/lib/geo-utils';

interface FinishCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  elapsedSeconds: number;
  totalDistanceMeters: number;
  onResetProgress: () => void;
  onShareWhatsApp: () => void;
}

export const FinishCelebrationModal: React.FC<FinishCelebrationModalProps> = ({
  isOpen,
  onClose,
  config,
  elapsedSeconds,
  totalDistanceMeters,
  onResetProgress,
  onShareWhatsApp,
}) => {
  useEffect(() => {
    if (isOpen) {
      // Trigger festive confetti explosion
      const duration = 3.5 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/60 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-5 relative">
        {/* Glowing Trophy Badge */}
        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/20 flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-yellow-400 animate-bounce" />
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            FINISH MENCAPAI TARGET
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
            SELAMAT!
          </h2>
          <p className="text-sm font-bold text-amber-300 mt-1">
            Anda Telah Mencapai FINISH
          </p>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">
            {config.eventName} {config.subTitle}
          </p>
        </div>

        {/* Stats Box */}
        <div className="grid grid-cols-2 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div>
            <div className="text-[11px] font-extrabold text-slate-400 uppercase">WAKTU TEMPUH</div>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              {formatDuration(elapsedSeconds)}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-slate-400 uppercase">TOTAL JARAK</div>
            <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
              {formatDistance(totalDistanceMeters)}
            </div>
          </div>
        </div>

        {/* Certificate Badge Note */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 flex items-center gap-2 text-left">
          <Award className="w-6 h-6 text-yellow-400 shrink-0" />
          <span>Status verifikasi checkpoint lengkap ✓ (START, POS 1, POS 2, POS 3, POS 4, FINISH)</span>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onShareWhatsApp}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan Prestasi via WhatsApp</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetProgress}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Ulangi Rute</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
