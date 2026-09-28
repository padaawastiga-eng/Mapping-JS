'use client';

import React from 'react';
import {
  MapPin,
  Compass,
  RefreshCw,
  Maximize2,
  ZoomIn,
  Info,
  Layers,
  Share2,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface NavigationControlsProps {
  onCenterUser: () => void;
  followUserMode: boolean;
  onToggleFollowUser: () => void;
  onRefreshGPS: () => void;
  onFitWholeRoute: () => void;
  onZoomNextPOS: () => void;
  onOpenRouteInfo: () => void;
  tileType: 'standard' | 'satellite';
  onToggleTileType: () => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  onShareWhatsApp: () => void;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  onCenterUser,
  followUserMode,
  onToggleFollowUser,
  onRefreshGPS,
  onFitWholeRoute,
  onZoomNextPOS,
  onOpenRouteInfo,
  tileType,
  onToggleTileType,
  isSimulating,
  onToggleSimulation,
  onResetSimulation,
  onShareWhatsApp,
}) => {
  return (
    <div className="flex flex-col gap-2">
      {/* Simulation Controls Banner (if active or available) */}
      <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSimulation}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              isSimulating
                ? 'bg-amber-500 text-slate-950 shadow-md animate-pulse'
                : 'bg-slate-800 text-amber-400 hover:bg-slate-700 border border-amber-500/30'
            }`}
          >
            {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isSimulating ? 'Jeda Simulasi' : '🎮 Mode Simulasi GPS'}</span>
          </button>

          {isSimulating && (
            <button
              onClick={onResetSimulation}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-700"
              title="Reset ke START"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Map Type Toggle: Standard vs Satellite */}
        <button
          onClick={onToggleTileType}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>{tileType === 'standard' ? '🗺️ Peta Standard' : '📡 Peta Satelit'}</span>
        </button>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {/* Lokasi Saya */}
        <button
          onClick={onCenterUser}
          className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow hover:shadow-lg transition active:scale-95"
        >
          <MapPin className="w-4 h-4" />
          <span className="whitespace-nowrap">📍 Lokasi Saya</span>
        </button>

        {/* Ikuti Rute */}
        <button
          onClick={onToggleFollowUser}
          className={`px-2.5 py-2 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 ${
            followUserMode
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Compass className={`w-4 h-4 ${followUserMode ? 'animate-spin' : ''}`} />
          <span className="whitespace-nowrap">{followUserMode ? '🧭 Mengikuti' : '🧭 Ikuti Rute'}</span>
        </button>

        {/* Perbarui GPS */}
        <button
          onClick={onRefreshGPS}
          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95"
        >
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <span className="whitespace-nowrap">🔄 Perbarui GPS</span>
        </button>

        {/* Lihat Seluruh Rute */}
        <button
          onClick={onFitWholeRoute}
          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95"
        >
          <Maximize2 className="w-4 h-4 text-emerald-400" />
          <span className="whitespace-nowrap">🗺️ Seluruh Rute</span>
        </button>

        {/* Zoom POS */}
        <button
          onClick={onZoomNextPOS}
          className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95"
        >
          <ZoomIn className="w-4 h-4 text-amber-400" />
          <span className="whitespace-nowrap">🔍 Zoom POS</span>
        </button>

        {/* Informasi Rute */}
        <button
          onClick={onOpenRouteInfo}
          className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow transition active:scale-95"
        >
          <Info className="w-4 h-4" />
          <span className="whitespace-nowrap">ℹ️ Info Rute</span>
        </button>
      </div>
    </div>
  );
};
