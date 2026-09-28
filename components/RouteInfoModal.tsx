'use client';

import React from 'react';
import { X, MapPin, Flag, CheckCircle, Navigation, Info, Share2, Copy, ExternalLink } from 'lucide-react';
import { AppConfig, Checkpoint } from '@/lib/types';
import { formatDistance, calculateHaversineDistance } from '@/lib/geo-utils';

interface RouteInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  completedCheckpointIds: string[];
  onShareWhatsApp: () => void;
}

export const RouteInfoModal: React.FC<RouteInfoModalProps> = ({
  isOpen,
  onClose,
  config,
  completedCheckpointIds,
  onShareWhatsApp,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-extrabold text-white">Informasi Rute Jalan Santai</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-300">
          <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3">
            <h4 className="font-extrabold text-blue-300 text-sm mb-1">{config.eventName}</h4>
            <p className="text-slate-300 leading-relaxed">{config.announcementText}</p>
          </div>

          {/* Timeline list of Checkpoints */}
          <div>
            <h4 className="font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5 text-xs">
              <Navigation className="w-4 h-4 text-emerald-400" />
              URUTAN TITIK JALUR & CHECKPOINT
            </h4>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700">
              {config.checkpoints.map((cp, idx) => {
                const isPassed = completedCheckpointIds.includes(cp.id);
                const nextCp = config.checkpoints[idx + 1];
                const legDist = nextCp
                  ? calculateHaversineDistance(cp.lat, cp.lng, nextCp.lat, nextCp.lng)
                  : 0;

                return (
                  <div key={cp.id} className="relative">
                    {/* Circle Node */}
                    <div
                      className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center font-bold text-[10px] ${
                        isPassed
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : cp.type === 'START'
                          ? 'bg-blue-600 border-blue-400 text-white'
                          : cp.type === 'FINISH'
                          ? 'bg-red-600 border-red-400 text-white'
                          : 'bg-slate-800 border-slate-600 text-slate-300'
                      }`}
                    >
                      {isPassed ? '✓' : idx + 1}
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white">{cp.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isPassed
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isPassed ? 'SUDAH MELEWATI' : cp.type}
                        </span>
                      </div>

                      {cp.description && <p className="text-slate-400 text-xs">{cp.description}</p>}

                      <div className="text-[11px] font-mono text-slate-500 pt-1 flex items-center justify-between border-t border-slate-800/60">
                        <span>Lat: {cp.lat.toFixed(6)}, Lng: {cp.lng.toFixed(6)}</span>
                        {nextCp && (
                          <span className="text-blue-400 font-semibold">
                            ↓ {formatDistance(legDist)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={onShareWhatsApp}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow transition"
          >
            <Share2 className="w-4 h-4" />
            <span>Bagikan Rute via WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
