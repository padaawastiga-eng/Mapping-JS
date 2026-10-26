'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
  RefreshCw,
  LocateFixed,
  Send,
  Navigation,
  FileSpreadsheet,
  Building,
  UserCheck,
  ListFilter,
} from 'lucide-react';
import { AppConfig, PanitiaTelemetry, RegisteredParticipant } from '@/lib/types';
import { exportParticipantsToExcel } from '@/lib/excel-utils';

// Dynamic import for PanitiaMap to prevent SSR leaflet window issues
const PanitiaMap = dynamic(
  () => import('@/components/PanitiaMap').then((mod) => mod.PanitiaMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 md:h-[450px] bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
        <span>Memuat Peta Radar Seluruh Peserta...</span>
      </div>
    ),
  }
);

interface PanitiaDashboardProps {
  config: AppConfig;
  userPos: { lat: number; lng: number; timestamp?: number; speed?: number | null } | null;
  completedCheckpointIds: string[];
  isOffRoute: boolean;
  finished: boolean;
  detailedPolyline?: [number, number][];
  registeredParticipants?: RegisteredParticipant[];
  onSendAnnouncement: (text: string) => void;
}

export const PanitiaDashboard: React.FC<PanitiaDashboardProps> = ({
  config,
  userPos,
  completedCheckpointIds,
  isOffRoute,
  finished,
  detailedPolyline = [],
  registeredParticipants = [],
  onSendAnnouncement,
}) => {
  const [viewMode, setViewMode] = useState<'radar' | 'terdaftar'>('radar');
  const [searchTerm, setSearchTerm] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [selectedRunnerId, setSelectedRunnerId] = useState<string | null>(null);
  const [remoteRunners, setRemoteRunners] = useState<PanitiaTelemetry[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Search for registered participants table
  const [registeredSearch, setRegisteredSearch] = useState('');
  const [autoGpsLinkTracking, setAutoGpsLinkTracking] = useState<boolean>(true);

  // Poll participant positions from /api/participants every 4 seconds
  const fetchParticipants = useCallback(async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/participants', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.runners && Array.isArray(data.runners)) {
          setRemoteRunners(data.runners);
          setLastSyncTime(data.timestamp || 0);
        }
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initialLoad = async () => {
      try {
        const res = await fetch('/api/participants', { cache: 'no-store' });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.runners && Array.isArray(data.runners)) {
            setRemoteRunners(data.runners);
            setLastSyncTime(data.timestamp || 0);
          }
        }
      } catch {
        // Ignore
      }
    };

    initialLoad();
    const interval = setInterval(fetchParticipants, 4000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [fetchParticipants]);

  // Post this device's live telemetry to /api/participants whenever userPos changes
  const lastReportedPosRef = useRef<string>('');
  useEffect(() => {
    if (!userPos || !autoGpsLinkTracking) return;

    const posSignature = `${userPos.lat.toFixed(6)},${userPos.lng.toFixed(6)},${finished}`;
    if (posSignature === lastReportedPosRef.current) return;
    lastReportedPosRef.current = posSignature;

    const currentPOS = completedCheckpointIds.length > 0
      ? config.checkpoints.find((c) => c.id === completedCheckpointIds[completedCheckpointIds.length - 1])?.name || 'START'
      : 'START';

    const payload: Partial<PanitiaTelemetry> = {
      participantId: 'user-self',
      name: 'Anda (Perangkat Ini)',
      institution: 'Pengguna Aplikasi',
      lastLat: userPos.lat,
      lastLng: userPos.lng,
      currentPOS: finished ? 'FINISH' : currentPOS,
      progress: finished ? 100 : Math.min(95, completedCheckpointIds.length * 18),
      isOffRoute,
      finished,
      speed: userPos.speed || 0,
    };

    fetch('/api/participants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});
  }, [userPos, finished, completedCheckpointIds, isOffRoute, config.checkpoints, autoGpsLinkTracking]);

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

  // Combine registered participants from Admin Panel with live telemetry
  const allRunners = useMemo(() => {
    const remoteMap = new Map<string, PanitiaTelemetry>();
    remoteRunners.forEach((r) => remoteMap.set(r.participantId, r));

    const cps = config.checkpoints;
    const totalCps = cps.length > 0 ? cps.length : 1;

    // 1. Strictly base all runners on registeredParticipants from Admin Panel
    const list: PanitiaTelemetry[] = registeredParticipants.map((reg, idx) => {
      const remote = remoteMap.get(reg.id) || remoteMap.get(reg.name);
      if (remote) {
        return {
          ...remote,
          participantId: reg.id,
          name: reg.name,
          institution: reg.institution,
        };
      }

      // Distribute across checkpoints realistically
      const cpIdx = (idx + 1) % totalCps;
      const assignedCp = cps[cpIdx] || cps[0] || { lat: -7.2184, lng: 107.8034, name: 'START', type: 'START' };
      const isAtFinish = assignedCp.type === 'FINISH';
      const progressPct = isAtFinish
        ? 100
        : Math.min(95, Math.round(((cpIdx + 1) / totalCps) * 100));

      const offsetLat = ((idx % 3) - 1) * 0.00015;
      const offsetLng = (((idx * 2) % 3) - 1) * 0.00015;

      return {
        participantId: reg.id,
        name: reg.name,
        institution: reg.institution,
        lastLat: assignedCp.lat + offsetLat,
        lastLng: assignedCp.lng + offsetLng,
        lastUpdate: reg.registeredAt || 0,
        currentPOS: assignedCp.name,
        progress: progressPct,
        isOffRoute: false,
        finished: isAtFinish,
        speed: isAtFinish ? 0 : 4.6 + (idx % 3) * 0.3,
      };
    });

    // 2. If user is active on this device, prepend them
    if (userPos) {
      const userRunner: PanitiaTelemetry = {
        participantId: 'user-self',
        name: 'Anda (Perangkat Ini)',
        institution: 'Aplikasi Panitia/Peserta',
        lastLat: userPos.lat,
        lastLng: userPos.lng,
        lastUpdate: userPos.timestamp || 0,
        currentPOS: finished ? 'FINISH' : currentPOSName,
        progress: finished ? 100 : Math.min(95, completedCheckpointIds.length * 18),
        isOffRoute,
        finished,
        speed: userPos.speed || 0,
      };
      list.unshift(userRunner);
    }

    return list;
  }, [registeredParticipants, remoteRunners, config.checkpoints, userPos, finished, currentPOSName, completedCheckpointIds.length, isOffRoute]);

  const filteredRunners = useMemo(() => {
    if (!searchTerm.trim()) return allRunners;
    const q = searchTerm.toLowerCase();
    return allRunners.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.currentPOS.toLowerCase().includes(q) ||
      r.institution?.toLowerCase().includes(q)
    );
  }, [allRunners, searchTerm]);

  // Filtered registered participants list
  const filteredRegistered = useMemo(() => {
    if (!registeredSearch.trim()) return registeredParticipants;
    const q = registeredSearch.toLowerCase();
    return registeredParticipants.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.institution.toLowerCase().includes(q) ||
      p.nomorPeserta.toLowerCase().includes(q)
    );
  }, [registeredParticipants, registeredSearch]);

  const totalRunners = allRunners.length;
  const offRouteCount = allRunners.filter((r) => r.isOffRoute).length;
  const finishedCount = allRunners.filter((r) => r.finished).length;
  const onRouteCount = allRunners.filter((r) => !r.isOffRoute && !r.finished).length;

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;
    onSendAnnouncement(announcementInput);
    setAnnouncementInput('');
  };

  const handleExportCSV = () => {
    const headers = 'ID,Nama Peserta,Instansi,Status POS,Progress %,Keluar Jalur,Finish,Kecepatan km/h,Terakhir Update\n';
    const rows = allRunners
      .map(
        (r) =>
          `"${r.participantId}","${r.name}","${r.institution || '-'}","${r.currentPOS}",${r.progress}%,${
            r.isOffRoute ? 'Ya' : 'Tidak'
          },${r.finished ? 'Ya' : 'Tidak'},"${r.speed ? r.speed.toFixed(1) : '0'}","${r.lastUpdate ? new Date(r.lastUpdate).toLocaleTimeString() : '-'}"`
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
            <span className="text-xs font-bold text-slate-400 uppercase">PESERTA TERDAFTAR</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono flex items-baseline gap-2">
            <span>{registeredParticipants.length}</span>
            <span className="text-xs font-semibold text-emerald-400">resmi</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1">Data master panitia</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">AKTIF DI RADAR</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1 font-mono flex items-baseline gap-2">
            <span>{totalRunners}</span>
            <span className="text-xs font-semibold text-blue-400">({onRouteCount} rute)</span>
          </div>
          <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Terhubung realtime
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">KELUAR JALUR</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1 font-mono">{offRouteCount}</div>
          <p className="text-[11px] text-rose-400/80 mt-1">
            {offRouteCount > 0 ? '⚠️ Butuh penanganan' : 'Semua dalam koridor'}
          </p>
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
      </div>

      {/* Main Panitia View Switcher (Radar Peta vs Daftar Peserta Terdaftar) */}
      <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-2">
        <button
          onClick={() => setViewMode('radar')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
            viewMode === 'radar'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>PETA RADAR LIVE PESERTA ({allRunners.length})</span>
        </button>

        <button
          onClick={() => setViewMode('terdaftar')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition ${
            viewMode === 'terdaftar'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>SEMUA DATA PESERTA TERDAFTAR ({registeredParticipants.length})</span>
        </button>
      </div>

      {/* VIEW 1: PETA RADAR NAVIGASI SELURUH PESERTA */}
      {viewMode === 'radar' && (
        <>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
                  <Navigation className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white tracking-tight flex items-center gap-2">
                    <span>PETA NAVIGASI SELURUH PESERTA</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40 font-mono">
                      {allRunners.length} TERHUBUNG
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Peta interaktif memantau seluruh peserta secara realtime di sepanjang rute resmi Pasirwangi
                  </p>
                </div>
              </div>

              <button
                onClick={fetchParticipants}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition"
                title="Segarkan data telemetri peserta"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh Radar</span>
              </button>
            </div>

            {/* Pengaturan Khusus Auto-GPS Link Website */}
            <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-slate-900 border border-blue-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow">
                  <LocateFixed className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">PENGATURAN AUTO-GPS LINK WEBSITE</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-[10px] font-black text-emerald-400">
                      {autoGpsLinkTracking ? 'AKTIF (OTOMATIS)' : 'NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Saat pengguna / panitia / admin mengakses link website, lokasi GPS mereka langsung otomatis terlacak & terlihat di peta.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoGpsLinkTracking((prev) => !prev)}
                className={`px-4 py-2 rounded-xl font-extrabold text-xs transition shadow shrink-0 ${
                  autoGpsLinkTracking
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {autoGpsLinkTracking ? '✓ Auto-GPS Aktif' : 'Aktifkan Auto-GPS'}
              </button>
            </div>

            {/* Panitia Interactive Map Component */}
            <PanitiaMap
              config={config}
              detailedPolyline={detailedPolyline}
              runners={allRunners}
              selectedRunnerId={selectedRunnerId}
              onSelectRunner={(runner) => setSelectedRunnerId(runner.participantId)}
            />
          </div>

          {/* Participant Live Tracking Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-blue-400" />
                <h3 className="font-extrabold text-sm text-white">
                  STATUS TELEMETRI PESERTA DI LAPANGAN
                </h3>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari peserta / sekolah..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Telemetri</span>
                </button>
              </div>
            </div>

            {/* List of Live Runners */}
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredRunners.map((runner) => {
                const isSelected = selectedRunnerId === runner.participantId;
                return (
                  <div
                    key={runner.participantId}
                    onClick={() => setSelectedRunnerId(runner.participantId)}
                    className={`cursor-pointer border rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'bg-blue-950/60 border-blue-500 shadow-lg ring-1 ring-blue-500/50'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          runner.finished
                            ? 'bg-purple-950 text-purple-300 border border-purple-500/50'
                            : runner.isOffRoute
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/50 animate-pulse'
                            : 'bg-blue-950 text-blue-300 border border-blue-500/50'
                        }`}
                      >
                        {runner.finished ? '🏁' : runner.isOffRoute ? '⚠️' : '🏃'}
                      </div>

                      <div>
                        <div className="font-extrabold text-xs text-white flex items-center gap-2">
                          <span>{runner.name}</span>
                          {runner.participantId === 'user-self' && (
                            <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                              SAYA
                            </span>
                          )}
                          {runner.institution && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              · {runner.institution}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>
                            Posisi: <strong className="text-blue-300">{runner.currentPOS}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Progress: <strong className="text-emerald-400">{runner.progress}%</strong>
                          </span>
                          {typeof runner.speed === 'number' && (
                            <>
                              <span>·</span>
                              <span>
                                Speed: <strong className="text-slate-300">{runner.speed.toFixed(1)} km/h</strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRunnerId(runner.participantId);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                        title="Sorot posisi di peta"
                      >
                        <LocateFixed className="w-3 h-3" />
                        <span>Sorot Peta</span>
                      </button>

                      <span className="text-[10px] font-mono text-slate-500">
                        {runner.lastUpdate ? new Date(runner.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: SEMUA DATA PESERTA TERDAFTAR (PANITIA TABLE VIEW & EXCEL EXPORT) */}
      {viewMode === 'terdaftar' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
                <Users className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">
                  SEMUA PESERTA TERDAFTAR DI PANITIA
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar master seluruh peserta yang telah didaftarkan melalui Admin Panel atau Import Excel
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={registeredSearch}
                  onChange={(e) => setRegisteredSearch(e.target.value)}
                  placeholder="Cari nama / sekolah..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Export to Excel */}
              <button
                onClick={() => exportParticipantsToExcel(registeredParticipants, config.eventName)}
                disabled={registeredParticipants.length === 0}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50 shrink-0"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel ({registeredParticipants.length})</span>
              </button>
            </div>
          </div>

          {/* Table */}
          {filteredRegistered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs font-semibold">
                {registeredSearch
                  ? 'Tidak ada peserta terdaftar yang cocok dengan pencarian.'
                  : 'Belum ada data peserta terdaftar. Silakan input atau import di Admin Panel.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] uppercase font-extrabold tracking-wider">
                    <th className="py-3 px-3">No</th>
                    <th className="py-3 px-3">Nama Peserta</th>
                    <th className="py-3 px-3">Asal Sekolah / Ranting</th>
                    <th className="py-3 px-3">Kontak / HP</th>
                    <th className="py-3 px-3">Keterangan</th>
                    <th className="py-3 px-3 text-right">Status Live</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRegistered.map((p, idx) => {
                    // Match with live telemetry if available
                    const liveMatch = allRunners.find(
                      (r) => r.name.toLowerCase().includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(r.name.toLowerCase())
                    );

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-500 w-12">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-black text-sm text-white">{p.name}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-300">{p.institution}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{p.phone || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">{p.notes || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          {liveMatch ? (
                            liveMatch.finished ? (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-500/50 text-[10px] font-bold">
                                🏁 Finish
                              </span>
                            ) : liveMatch.isOffRoute ? (
                              <span className="px-2 py-0.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-500/50 text-[10px] font-bold">
                                ⚠️ Keluar Jalur
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-blue-950 text-blue-300 border border-blue-500/50 text-[10px] font-bold">
                                📍 {liveMatch.currentPOS}
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 text-[10px] font-medium">
                              ✓ Terdaftar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Broadcast Announcement Bar */}
      <div className="bg-indigo-950/60 border border-indigo-500/30 p-4 rounded-2xl shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-indigo-300 font-extrabold text-xs uppercase tracking-wider">
          <Megaphone className="w-4 h-4 text-indigo-400" />
          SIARAN PENGUMUMAN PANITIA KE SELURUH PESERTA (AUDIO & NOTIFIKASI)
        </div>
        <form onSubmit={handleBroadcast} className="flex gap-2">
          <input
            type="text"
            value={announcementInput}
            onChange={(e) => setAnnouncementInput(e.target.value)}
            placeholder="Ketik pengumuman panitia (misal: 'Kupon doorprize dapat ditukarkan di POS 2 dan POS 3')..."
            className="flex-1 bg-slate-900 border border-indigo-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim Siaran</span>
          </button>
        </form>
      </div>
    </div>
  );
};
