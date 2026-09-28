'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Navigation,
  MapPin,
  Gauge,
  Compass,
  Footprints,
  Clock,
  Share2,
} from 'lucide-react';
import { AppConfig, Checkpoint, RouteCalculation, UserPosition } from '@/lib/types';
import { formatDistance, formatDuration } from '@/lib/geo-utils';

interface StatusCardsProps {
  config: AppConfig;
  userPos: UserPosition | null;
  telemetry: RouteCalculation | null;
  completedCheckpointIds: string[];
  startTime: number | null;
  finishedTime: number | null;
  onShareWhatsApp: () => void;
}

export const StatusCards: React.FC<StatusCardsProps> = ({
  config,
  userPos,
  telemetry,
  completedCheckpointIds,
  startTime,
  finishedTime,
  onShareWhatsApp,
}) => {
  // Elapsed time calculation
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const end = finishedTime || Date.now();
      setElapsedSeconds(Math.floor((end - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, finishedTime]);

  // Determine Banner visual state
  let bannerBg = 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200';
  let bannerIcon = <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />;
  let bannerTitle = 'ANDA BERADA DI RUTE';
  let bannerSub = 'Tetap semangat dan ikuti petunjuk arah menuju POS berikutnya.';

  if (!userPos) {
    bannerBg = 'bg-slate-900 border-slate-800 text-slate-300';
    bannerIcon = <MapPin className="w-6 h-6 text-blue-400 shrink-0 animate-bounce" />;
    bannerTitle = 'MENGAMBIL LOKASI GPS...';
    bannerSub = 'Mohon izinkan akses lokasi GPS pada browser / HP Anda.';
  } else if (telemetry?.isAtFinish) {
    bannerBg = 'bg-purple-950/90 border-purple-500/60 text-purple-200 animate-pulse';
    bannerIcon = <span className="text-2xl">🏁</span>;
    bannerTitle = 'SELAMAT! ANDA MENCAPAI FINISH';
    bannerSub = 'Terima kasih telah berpartisipasi dalam Jalan Santai HGN & HUT Ke-81 PGRI!';
  } else if (telemetry?.isOffRoute) {
    bannerBg = 'bg-rose-950/90 border-rose-500/80 text-rose-100 ring-2 ring-rose-500/50 animate-pulse-fast';
    bannerIcon = <AlertTriangle className="w-7 h-7 text-rose-400 shrink-0" />;
    bannerTitle = 'PERHATIAN! KELUAR DARI JALUR';
    bannerSub = `Anda berjarak ${telemetry.distanceToNearestRoute}m di luar koridor rute resmi Jalan Santai. Silakan kembali ke jalur.`;
  } else if (telemetry?.status === 'APPROACHING_POS' || telemetry?.status === 'PASSED_POS') {
    bannerBg = 'bg-amber-950/80 border-amber-500/50 text-amber-200';
    bannerIcon = <Footprints className="w-6 h-6 text-amber-400 shrink-0" />;
    bannerTitle = telemetry.statusText;
    bannerSub = `Berjarak ${telemetry.distanceToNextCheckpoint}m dari checkpoint ${telemetry.nextCheckpoint?.name}.`;
  }

  return (
    <div className="space-y-3">
      {/* 1. Main Status Banner Card */}
      <div className={`p-4 rounded-2xl border shadow-lg flex items-start gap-3 transition-all ${bannerBg}`}>
        {bannerIcon}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-extrabold tracking-tight uppercase leading-snug">
            {bannerTitle}
          </h2>
          <p className="text-xs font-medium opacity-90 mt-0.5 leading-relaxed">
            {bannerSub}
          </p>
        </div>
      </div>

      {/* 2. Checkpoint Progress Bar & Checklist */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Footprints className="w-4 h-4 text-blue-400" />
            PROGRESS CHECKPOINT
          </span>
          <span className="font-mono font-bold text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800/50">
            {telemetry ? `${telemetry.progressPercentage}%` : '0%'}
          </span>
        </div>

        {/* Progress bar line */}
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
            style={{ width: `${telemetry?.progressPercentage || 0}%` }}
          />
        </div>

        {/* Checkpoint list badges */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
          {config.checkpoints.map((cp) => {
            const isDone = completedCheckpointIds.includes(cp.id);
            const isNext = telemetry?.nextCheckpoint?.id === cp.id;

            return (
              <div
                key={cp.id}
                className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                  isDone
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                    : isNext
                    ? 'bg-amber-950/70 border-amber-500/60 text-amber-200 ring-2 ring-amber-500/40 animate-pulse'
                    : 'bg-slate-950/50 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] uppercase font-semibold opacity-80">
                  {cp.name}
                </div>
                <div className="text-sm font-black mt-0.5">
                  {isDone ? '✓ PASSED' : isNext ? '⏳ ACTIVE' : '••'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Distance Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* Next POS Distance */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            KE POS NEXT
          </div>
          <div className="text-xl font-black text-white mt-1 font-mono tracking-tight">
            {telemetry ? formatDistance(telemetry.distanceToNextCheckpoint) : '-'}
          </div>
          <div className="text-[11px] font-semibold text-blue-400 truncate mt-0.5">
            {telemetry?.nextCheckpoint ? telemetry.nextCheckpoint.name : 'FINISH'}
          </div>
        </div>

        {/* Remaining Distance to Finish */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Footprints className="w-3.5 h-3.5 text-emerald-400" />
            SISA RUTE
          </div>
          <div className="text-xl font-black text-white mt-1 font-mono tracking-tight">
            {telemetry ? formatDistance(telemetry.remainingDistanceToFinish) : '-'}
          </div>
          <div className="text-[11px] font-semibold text-emerald-400 truncate mt-0.5">
            Total {telemetry ? formatDistance(telemetry.totalRouteDistance) : '-'}
          </div>
        </div>

        {/* Elapsed Duration */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            WAKTU TEMPUH
          </div>
          <div className="text-xl font-black text-white mt-1 font-mono tracking-tight">
            {formatDuration(elapsedSeconds)}
          </div>
          <div className="text-[11px] font-semibold text-purple-400 truncate mt-0.5">
            {finishedTime ? 'Selesai 🏁' : 'Sedang Berjalan'}
          </div>
        </div>

        {/* Speed & GPS Accuracy */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            KECEPATAN & GPS
          </div>
          <div className="text-xl font-black text-white mt-1 font-mono tracking-tight">
            {userPos?.speed ? `${userPos.speed.toFixed(1)} km/h` : '0.0 km/h'}
          </div>
          <div className="text-[11px] font-semibold text-amber-400 truncate mt-0.5">
            Akurasi ±{userPos ? Math.round(userPos.accuracy) : 0}m
          </div>
        </div>
      </div>

      {/* 4. Telemetry Lat/Lng Coordinates Footer bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-3 font-mono">
          <span>Lat: <strong className="text-slate-200">{userPos ? userPos.lat.toFixed(6) : '-'}</strong></span>
          <span>Lng: <strong className="text-slate-200">{userPos ? userPos.lng.toFixed(6) : '-'}</strong></span>
        </div>

        <button
          onClick={onShareWhatsApp}
          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition ml-auto"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Bagikan Lokasi / WA</span>
        </button>
      </div>
    </div>
  );
};
