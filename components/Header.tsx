'use client';

import React from 'react';
import { Volume2, VolumeX, Shield, Users, Navigation, Radio, Lock, LogOut } from 'lucide-react';
import { AppConfig } from '@/lib/types';

interface HeaderProps {
  config: AppConfig;
  gpsActive: boolean;
  activeTab: 'peserta' | 'panitia' | 'admin';
  onTabChange: (tab: 'peserta' | 'panitia' | 'admin') => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  isAdminAuthenticated: boolean;
  onLogoutAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  gpsActive,
  activeTab,
  onTabChange,
  audioEnabled,
  onToggleAudio,
  isAdminAuthenticated,
  onLogoutAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 shadow-lg">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-lg shadow-md border border-blue-400/30 shrink-0">
            PGRI
          </div>
          <div>
            <h1 className="text-sm md:text-base font-extrabold text-white tracking-tight leading-tight">
              {config.eventName}
            </h1>
            <p className="text-xs text-blue-400 font-semibold tracking-wide">
              {config.subTitle}
            </p>
          </div>
        </div>

        {/* Action Controls & GPS Status */}
        <div className="flex items-center gap-2">
          {/* Audio Toggle */}
          <button
            onClick={onToggleAudio}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              audioEnabled
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
            title={audioEnabled ? 'Matikan Notifikasi Suara' : 'Aktifkan Notifikasi Suara'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span className="hidden sm:inline">{audioEnabled ? 'Suara' : 'Bisu'}</span>
          </button>

          {/* GPS Live Status Indicator Badge */}
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
              gpsActive
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                gpsActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="whitespace-nowrap">
              {gpsActive ? 'GPS AKTIF' : 'GPS MATI'}
            </span>
          </div>

          {/* Admin Logout Button */}
          {isAdminAuthenticated && (
            <button
              onClick={onLogoutAdmin}
              className="px-2.5 py-1 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-500/40 hover:bg-rose-900 text-xs font-bold flex items-center gap-1 transition"
              title="Kunci / Keluar Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Kunci Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="bg-slate-950/60 px-4 py-1.5 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            {/* Peserta Tab */}
            <button
              onClick={() => onTabChange('peserta')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'peserta'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Navigasi Peserta</span>
            </button>

            {/* Pantau Panitia Tab (Protected) */}
            <button
              onClick={() => onTabChange('panitia')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'panitia'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pantau Panitia</span>
              {!isAdminAuthenticated && (
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
              )}
            </button>

            {/* Admin Panel Tab (Protected) */}
            <button
              onClick={() => onTabChange('admin')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                activeTab === 'admin'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
              {!isAdminAuthenticated && (
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1 text-slate-400 text-[11px]">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>{config.organizer}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
