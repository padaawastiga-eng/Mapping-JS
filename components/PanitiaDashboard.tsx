'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Download,
  Search,
  Megaphone,
  ShieldAlert,
  Footprints,
} from 'lucide-react';
import { AppConfig, PanitiaTelemetry } from '@/lib/types';

interface PanitiaDashboardProps {
  config: AppConfig;
  userPos: { lat: number; lng: number; timestamp?: number } | null;
  completedCheckpointIds: string[];
  isOffRoute: boolean;
  finished: boolean;
  onSendAnnouncement: (text: string) => void;
}

export const PanitiaDashboard: React.FC<PanitiaDashboardProps> = ({
  config,
  userPos,
  completedCheckpointIds,
  isOffRoute,
  finished,
  onSendAnnouncement,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');

  // Initial mock runners computed lazily
  const [simulatedRunners] = useState<PanitiaTelemetry[]>(() => {
    return [
      {
        participantId: 'p-01',
        name: 'Asep Saepulloh (SDN 1 Pasirwangi)',
        lastLat: config.checkpoints[1]?.lat || -7.2168,
        lastLng: config.checkpoints[1]?.lng || 107.8072,
        lastUpdate: 1727450000000,
        currentPOS: 'POS 1',
        progress: 25,
        isOffRoute: false,
        finished: false,
      },
      {
        participantId: 'p-02',
        name: 'Dede Kurniawan (SMPN 1 Pasirwangi)',
        lastLat: config.checkpoints[2]?.lat || -7.2121,
        lastLng: config.checkpoints[2]?.lng || 107.802,
        lastUpdate: 1727450060000,
        currentPOS: 'POS 2',
        progress: 50,
        isOffRoute: false,
        finished: false,
      },
      {
        participantId: 'p-03',
        name: 'Siti Rahmah (PGRI Ranting Barat)',
        lastLat: config.checkpoints[3]?.lat || -7.2129,
        lastLng: config.checkpoints[3]?.lng || 107.7951,
        lastUpdate: 1727450090000,
        currentPOS: 'POS 3',
        progress: 75,
        isOffRoute: true,
        finished: false,
      },
      {
        participantId: 'p-04',
        name: 'Budi Santoso (TK Pembina Pasirwangi)',
        lastLat: config.checkpoints[5]?.lat || -7.2187,
        lastLng: config.checkpoints[5]?.lng || 107.8033,
        lastUpdate: 1727450120000,
        currentPOS: 'FINISH',
        progress: 100,
        isOffRoute: false,
        finished: true,
      },
    ];
  });

  const currentPOSName = useMemo(() => {
    if (completedCheckpointIds.length > 0) {
      return (
        config.checkpoints.find(
          (c) => c.id === completedCheckpointIds[completedCheckpointIds.length - 1]
        )?.name || 'START'
      );
    }
    return 'START';
  }, [completedCheckpointIds, config.checkpoints]);

  const allRunners = useMemo(() => {
    const realUserTelemetry: PanitiaTelemetry = {
      participantId: 'user-self',
      name: 'Anda (Perangkat Ini)',
      lastLat: userPos?.lat || config.checkpoints[0]?.lat || -7.2184,
      lastLng: userPos?.lng || config.checkpoints[0]?.lng || 107.8034,
      lastUpdate: userPos?.timestamp || 0,
      currentPOS: finished ? 'FINISH' : currentPOSName,
      progress: finished ? 100 : Math.min(95, completedCheckpointIds.length * 18),
      isOffRoute,
      finished,
    };
    return [realUserTelemetry, ...simulatedRunners];
  }, [userPos, config.checkpoints, finished, currentPOSName, completedCheckpointIds.length, isOffRoute, simulatedRunners]);

  const filteredRunners = allRunners.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRunners = allRunners.length;
  const offRouteCount = allRunners.filter((r) => r.isOffRoute).length;
  const finishedCount = allRunners.filter((r) => r.finished).length;

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;
    onSendAnnouncement(announcementInput);
    setAnnouncementInput('');
  };

  const handleExportCSV = () => {
    const headers = 'ID,Nama Peserta,Status POS,Progress %,Keluar Jalur,Finish,Terakhir Update\n';
    const rows = allRunners
      .map(
        (r) =>
          `"${r.participantId}","${r.name}","${r.currentPOS}",${r.progress}%,${
            r.isOffRoute ? 'Ya' : 'Tidak'
          },${r.finished ? 'Ya' : 'Tidak'},"${r.lastUpdate ? new Date(r.lastUpdate).toLocaleTimeString() : '-'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Jalan_Santai_PGRI_Pasirwangi.csv`;
    a.click();
  };

  return (
    <div className="space-y-4 text-slate-100">
      {/* Top Monitor Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">TOTAL PESERTA</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{totalRunners}</div>
          <p className="text-[11px] text-blue-400 mt-1">Terhubung realtime</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">MENCAPAI FINISH</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{finishedCount}</div>
          <p className="text-[11px] text-emerald-400/80 mt-1">
            {Math.round((finishedCount / (totalRunners || 1)) * 100)}% selesai
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">KELUAR JALUR</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1 font-mono">{offRouteCount}</div>
          <p className="text-[11px] text-rose-400/80 mt-1">Peringatan aktif</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">LOKASI PANITIA</span>
            <Radio className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div className="text-sm font-bold text-white mt-2 truncate">{config.organizer}</div>
          <p className="text-[11px] text-indigo-400 mt-0.5">Pasirwangi, Garut</p>
        </div>
      </div>

      {/* Broadcast Announcement Bar */}
      <div className="bg-indigo-950/60 border border-indigo-500/30 p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
          <Megaphone className="w-4 h-4 text-indigo-400" />
          SIARAN PENGUMUMAN PANITIA (AUDIO & NOTIFIKASI)
        </div>
        <form onSubmit={handleBroadcast} className="flex gap-2">
          <input
            type="text"
            value={announcementInput}
            onChange={(e) => setAnnouncementInput(e.target.value)}
            placeholder="Ketik pengumuman panitia (misal: 'Penukaran kupon doorprize dibuka di POS 2')..."
            className="flex-1 bg-slate-900 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition shrink-0"
          >
            Kirim Pengumuman
          </button>
        </form>
      </div>

      {/* Participant Live Tracking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-blue-400" />
            <h3 className="font-extrabold text-sm text-white">
              PEMANTAUAN POSISI PESERTA REALTIME
            </h3>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari peserta..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
              />
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* List of Runners */}
        <div className="space-y-2">
          {filteredRunners.map((runner) => (
            <div
              key={runner.participantId}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    runner.finished
                      ? 'bg-purple-950 text-purple-300 border border-purple-500/50'
                      : runner.isOffRoute
                      ? 'bg-rose-950 text-rose-300 border border-rose-500/50 animate-pulse'
                      : 'bg-blue-950 text-blue-300 border border-blue-500/50'
                  }`}
                >
                  {runner.finished ? '🏁' : runner.isOffRoute ? '⚠️' : '📍'}
                </div>

                <div>
                  <div className="font-extrabold text-xs text-white flex items-center gap-2">
                    <span>{runner.name}</span>
                    {runner.participantId === 'user-self' && (
                      <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono">
                        SAYA
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>Posisi: <strong className="text-blue-300">{runner.currentPOS}</strong></span>
                    <span>·</span>
                    <span>Progress: <strong className="text-emerald-400">{runner.progress}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 justify-between sm:justify-end">
                {runner.isOffRoute ? (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-500/50 text-[10px] font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    KELUAR JALUR
                  </span>
                ) : runner.finished ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-extrabold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    FINISH
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 border border-blue-500/50 text-[10px] font-extrabold">
                    DI JALUR RUTE
                  </span>
                )}

                <span className="text-[10px] font-mono text-slate-500">
                  {runner.lastUpdate ? new Date(runner.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
