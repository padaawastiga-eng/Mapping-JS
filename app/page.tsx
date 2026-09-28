'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { NavigationControls } from '@/components/NavigationControls';
import { StatusCards } from '@/components/StatusCards';
import { RouteInfoModal } from '@/components/RouteInfoModal';
import { FinishCelebrationModal } from '@/components/FinishCelebrationModal';
import { PanitiaDashboard } from '@/components/PanitiaDashboard';
import { AdminSettings } from '@/components/AdminSettings';
import { PinAuthModal } from '@/components/PinAuthModal';
import { DEFAULT_APP_CONFIG } from '@/lib/default-config';
import { AppConfig, UserPosition, RouteCalculation } from '@/lib/types';
import { calculateRouteTelemetry, calculateHaversineDistance } from '@/lib/geo-utils';
import { fetchDetailedRoadRoute } from '@/lib/route-fetcher';
import { audioNotifier } from '@/lib/audio-utils';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Dynamic import for Leaflet Map to avoid Next.js SSR window errors
const MapComponent = dynamic(
  () => import('@/components/Map').then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 md:h-[420px] bg-slate-900 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
        <span>Memuat Peta Interaktif Leaflet...</span>
      </div>
    ),
  }
);

export default function HomePage() {
  // 1. Config & Persistence State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [completedCheckpointIds, setCompletedCheckpointIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finishedTime, setFinishedTime] = useState<number | null>(null);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);

  // Admin PIN Auth State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pendingProtectedTab, setPendingProtectedTab] = useState<'panitia' | 'admin' | null>(null);

  // Load localStorage & sessionStorage data strictly AFTER client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedConfig = localStorage.getItem('jalan_santai_config');
        if (savedConfig) setConfig(JSON.parse(savedConfig));

        const savedCompleted = localStorage.getItem('jalan_santai_completed_cp');
        if (savedCompleted) setCompletedCheckpointIds(JSON.parse(savedCompleted));

        const savedStart = localStorage.getItem('jalan_santai_start_time');
        if (savedStart) setStartTime(Number(savedStart));

        const savedFinish = localStorage.getItem('jalan_santai_finish_time');
        if (savedFinish) setFinishedTime(Number(savedFinish));

        const savedAuth = sessionStorage.getItem('jalan_santai_admin_auth');
        if (savedAuth === 'true') {
          setIsAdminAuthenticated(true);
        }

        if (!('geolocation' in navigator)) {
          setGpsErrorMessage('Browser/Perangkat Anda tidak mendukung fitur lokasi GPS.');
        }
      } catch {
        // Fallback
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // 2. Navigation & UI State
  const [activeTab, setActiveTab] = useState<'peserta' | 'panitia' | 'admin'>('peserta');
  const [tileType, setTileType] = useState<'standard' | 'satellite'>('standard');
  const [followUserMode, setFollowUserMode] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [isRouteInfoOpen, setIsRouteInfoOpen] = useState<boolean>(false);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState<boolean>(false);
  const [detailedPolyline, setDetailedPolyline] = useState<[number, number][]>([]);

  // 3. User Geolocation State
  const [gpsActive, setGpsActive] = useState<boolean>(false);
  const [userPos, setUserPos] = useState<UserPosition | null>(null);

  // 4. Simulator Mode State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const simStepRef = useRef<number>(0);

  // Audio state trackers
  const wasOffRouteRef = useRef<boolean>(false);
  const announcedApproachingCpRef = useRef<string | null>(null);

  // Protected Tab Navigation Handler
  const handleTabChange = (targetTab: 'peserta' | 'panitia' | 'admin') => {
    if (targetTab === 'peserta') {
      setActiveTab('peserta');
      return;
    }

    if (isAdminAuthenticated) {
      setActiveTab(targetTab);
    } else {
      setPendingProtectedTab(targetTab);
      setIsPinModalOpen(true);
    }
  };

  const handlePinAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    setIsPinModalOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('jalan_santai_admin_auth', 'true');
    }
    if (pendingProtectedTab) {
      setActiveTab(pendingProtectedTab);
      setPendingProtectedTab(null);
    }
  };

  const handleLogoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setActiveTab('peserta');
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('jalan_santai_admin_auth');
    }
  };

  // Fetch detailed street routing geometry
  useEffect(() => {
    let isMountedFlag = true;
    fetchDetailedRoadRoute(config.checkpoints).then((coords) => {
      if (isMountedFlag && coords.length > 0) {
        setDetailedPolyline(coords);
      }
    });
    return () => {
      isMountedFlag = false;
    };
  }, [config.checkpoints]);

  // 5. Calculate Telemetry
  const telemetry: RouteCalculation | null = userPos
    ? calculateRouteTelemetry(
        userPos,
        config.checkpoints,
        completedCheckpointIds,
        config.offRouteTolerance,
        config.checkpointRadius,
        detailedPolyline
      )
    : null;

  // 6. Checkpoint Completion & Audio Speech Alerts Logic
  useEffect(() => {
    if (!telemetry || !userPos) return;

    // Check for Checkpoint Radius Entry
    config.checkpoints.forEach((cp) => {
      const dist = calculateHaversineDistance(userPos.lat, userPos.lng, cp.lat, cp.lng);

      if (dist <= config.checkpointRadius && !completedCheckpointIds.includes(cp.id)) {
        setCompletedCheckpointIds((prev) => {
          if (prev.includes(cp.id)) return prev;
          const updated = [...prev, cp.id];
          if (typeof window !== 'undefined') {
            localStorage.setItem('jalan_santai_completed_cp', JSON.stringify(updated));
          }
          return updated;
        });

        // Trigger Audio Chime & Speech
        audioNotifier.playChime('success');
        if (cp.type === 'FINISH') {
          const now = Date.now();
          setFinishedTime(now);
          if (typeof window !== 'undefined') {
            localStorage.setItem('jalan_santai_finish_time', String(now));
          }
          setIsCelebrationOpen(true);
          audioNotifier.speak(
            `Selamat! Anda telah mencapai FINISH Jalan Santai HGN dan HUT Ke 81 PGRI Kecamatan Pasirwangi`,
            'high'
          );
        } else {
          audioNotifier.speak(`${cp.name} Terlewati!`, 'high');
        }
      }
    });

    // Check for 50-meter Approaching Notice
    if (
      telemetry.isNearCheckpoint &&
      telemetry.nextCheckpoint &&
      announcedApproachingCpRef.current !== telemetry.nextCheckpoint.id
    ) {
      announcedApproachingCpRef.current = telemetry.nextCheckpoint.id;
      audioNotifier.playChime('info');
      audioNotifier.speak(
        `Perhatian, Anda mendekati ${telemetry.nextCheckpoint.name} dalam jarak 50 meter.`
      );
    }

    // Off-Route Detection Speech Alerts
    if (telemetry.isOffRoute && !wasOffRouteRef.current) {
      wasOffRouteRef.current = true;
      audioNotifier.playChime('warning');
      audioNotifier.speak(
        `PERHATIAN! Anda berada di luar jalur Jalan Santai. Berjarak ${telemetry.distanceToNearestRoute} meter dari jalur.`,
        'high'
      );
    } else if (!telemetry.isOffRoute && wasOffRouteRef.current) {
      wasOffRouteRef.current = false;
      audioNotifier.playChime('info');
      audioNotifier.speak(`Anda telah kembali ke jalur Jalan Santai.`);
    }
  }, [telemetry, userPos, config, completedCheckpointIds]);

  // 7. Real Geolocation Watcher
  const updatePosition = useCallback((lat: number, lng: number, accuracy: number, speed: number | null, heading: number | null, timestamp: number) => {
    setUserPos({
      lat,
      lng,
      accuracy,
      speed: speed ? speed * 3.6 : null,
      heading,
      timestamp,
    });

    setStartTime((prev) => {
      if (!prev) {
        const now = Date.now();
        if (typeof window !== 'undefined') {
          localStorage.setItem('jalan_santai_start_time', String(now));
        }
        return now;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    if (isSimulating) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsActive(true);
        setGpsErrorMessage(null);
        updatePosition(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy,
          pos.coords.speed,
          pos.coords.heading,
          pos.timestamp
        );
      },
      (err) => {
        setGpsActive(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsErrorMessage('Izin akses lokasi GPS ditolak oleh pengguna.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsErrorMessage('Sinyal lokasi GPS tidak tersedia.');
        } else if (err.code === err.TIMEOUT) {
          setGpsErrorMessage('Waktu permintaan lokasi GPS habis.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isSimulating, updatePosition]);

  // 8. GPS Simulator Engine
  const toggleSimulation = () => {
    if (isSimulating) {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);
      setGpsActive(true);
      setGpsErrorMessage(null);

      const pathPoints = detailedPolyline.length > 1 ? detailedPolyline : config.checkpoints.map(cp => [cp.lat, cp.lng] as [number, number]);

      const steps: [number, number][] = [];
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const [lat1, lng1] = pathPoints[i];
        const [lat2, lng2] = pathPoints[i + 1];
        const numSubSteps = 3;

        for (let s = 0; s < numSubSteps; s++) {
          const ratio = s / numSubSteps;
          const lat = lat1 + (lat2 - lat1) * ratio;
          const lng = lng1 + (lng2 - lng1) * ratio;
          steps.push([lat, lng]);
        }
      }
      steps.push(pathPoints[pathPoints.length - 1]);

      simStepRef.current = 0;

      if (simIntervalRef.current) clearInterval(simIntervalRef.current);

      simIntervalRef.current = setInterval(() => {
        if (simStepRef.current >= steps.length) {
          if (simIntervalRef.current) clearInterval(simIntervalRef.current);
          return;
        }

        const [lat, lng] = steps[simStepRef.current];
        updatePosition(lat, lng, 5, 1.33, 90, Date.now());
        simStepRef.current += 1;
      }, 500);
    }
  };

  const resetSimulation = () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    simStepRef.current = 0;
    setCompletedCheckpointIds([]);
    setFinishedTime(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jalan_santai_completed_cp');
      localStorage.removeItem('jalan_santai_finish_time');
    }
    const startCp = config.checkpoints[0];
    if (startCp) {
      updatePosition(startCp.lat, startCp.lng, 5, 0, 0, Date.now());
    }
  };

  // 9. Admin Config Save Handlers
  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jalan_santai_config', JSON.stringify(newConfig));
    }
  };

  const handleResetConfig = () => {
    setConfig(DEFAULT_APP_CONFIG);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jalan_santai_config', JSON.stringify(DEFAULT_APP_CONFIG));
    }
  };

  // 10. Reset Participant History
  const handleResetProgress = () => {
    setCompletedCheckpointIds([]);
    const now = Date.now();
    setStartTime(now);
    setFinishedTime(null);
    setIsCelebrationOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jalan_santai_completed_cp');
      localStorage.removeItem('jalan_santai_finish_time');
      localStorage.setItem('jalan_santai_start_time', String(now));
    }
  };

  // 11. WhatsApp Share Link
  const handleShareWhatsApp = () => {
    const currentPOS = telemetry?.nextCheckpoint?.name || 'Jalur Utama';
    const progressText = telemetry ? `${telemetry.progressPercentage}%` : '0%';
    const text = encodeURIComponent(
      `🏃 *JALAN SANTAI HGN & HUT KE-81 PGRI KECAMATAN PASIRWANGI*\n\nSaya sedang mengikuti rute Jalan Santai!\n📍 Posisi/Target: ${currentPOS}\n📊 Progress: ${progressText}\n\nMari pantau lokasi dan rute bersama di aplikasi:`
    );
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  // Audio Toggle
  const handleToggleAudio = () => {
    const newVal = !audioEnabled;
    setAudioEnabled(newVal);
    audioNotifier.setEnabled(newVal);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        config={config}
        gpsActive={gpsActive}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        audioEnabled={audioEnabled}
        onToggleAudio={handleToggleAudio}
        isAdminAuthenticated={isAdminAuthenticated}
        onLogoutAdmin={handleLogoutAdmin}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-4">
        {/* GPS Error Alert Banner */}
        {gpsErrorMessage && !isSimulating && (
          <div className="p-3.5 bg-rose-950/90 border border-rose-500/60 rounded-2xl text-rose-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{gpsErrorMessage} (Aktifkan Mode Simulasi GPS jika menguji pada laptop/desktop)</span>
            </div>
            <button
              onClick={toggleSimulation}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 shadow"
            >
              🎮 Ganti ke Simulasi GPS
            </button>
          </div>
        )}

        {/* Tab 1: Peserta Navigasi (Interactive Map + Telemetry + Controls) */}
        {activeTab === 'peserta' && (
          <div className="space-y-4">
            {/* Top Toolbar Navigation Controls */}
            <NavigationControls
              onCenterUser={() => setFollowUserMode(true)}
              followUserMode={followUserMode}
              onToggleFollowUser={() => setFollowUserMode((prev) => !prev)}
              onRefreshGPS={() => setGpsActive(true)}
              onFitWholeRoute={() => setFollowUserMode(false)}
              onZoomNextPOS={() => setFollowUserMode(false)}
              onOpenRouteInfo={() => setIsRouteInfoOpen(true)}
              tileType={tileType}
              onToggleTileType={() =>
                setTileType((prev) => (prev === 'standard' ? 'satellite' : 'standard'))
              }
              isSimulating={isSimulating}
              onToggleSimulation={toggleSimulation}
              onResetSimulation={resetSimulation}
              onShareWhatsApp={handleShareWhatsApp}
            />

            {/* Leaflet Interactive Map */}
            <div className="h-[55vh] min-h-[380px] max-h-[600px] w-full">
              <MapComponent
                config={config}
                userPos={userPos}
                telemetry={telemetry}
                tileType={tileType}
                followUserMode={followUserMode}
                completedCheckpointIds={completedCheckpointIds}
                detailedPolyline={detailedPolyline}
                isSimulating={isSimulating}
              />
            </div>

            {/* Realtime Status Cards & Metrics */}
            <StatusCards
              config={config}
              userPos={userPos}
              telemetry={telemetry}
              completedCheckpointIds={completedCheckpointIds}
              startTime={startTime}
              finishedTime={finishedTime}
              onShareWhatsApp={handleShareWhatsApp}
            />
          </div>
        )}

        {/* Tab 2: Panitia Monitoring Dashboard (PIN Protected) */}
        {activeTab === 'panitia' && isAdminAuthenticated && (
          <PanitiaDashboard
            config={config}
            userPos={userPos}
            completedCheckpointIds={completedCheckpointIds}
            isOffRoute={telemetry?.isOffRoute || false}
            finished={!!finishedTime}
            onSendAnnouncement={(text) => {
              audioNotifier.speak(`Pengumuman Panitia: ${text}`, 'high');
            }}
          />
        )}

        {/* Tab 3: Admin Settings Panel (PIN Protected) */}
        {activeTab === 'admin' && isAdminAuthenticated && (
          <AdminSettings
            config={config}
            onSaveConfig={handleSaveConfig}
            onResetToDefault={handleResetConfig}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-400">
          {config.eventName} — {config.subTitle}
        </p>
        <p className="text-[11px] text-slate-600 mt-1">
          Diselenggarakan oleh {config.organizer} · Didukung OpenStreetMap & Leaflet.js
        </p>
      </footer>

      {/* Modals */}
      <RouteInfoModal
        isOpen={isRouteInfoOpen}
        onClose={() => setIsRouteInfoOpen(false)}
        config={config}
        completedCheckpointIds={completedCheckpointIds}
        onShareWhatsApp={handleShareWhatsApp}
      />

      <FinishCelebrationModal
        isOpen={isCelebrationOpen}
        onClose={() => setIsCelebrationOpen(false)}
        config={config}
        elapsedSeconds={
          finishedTime && startTime ? Math.floor((finishedTime - startTime) / 1000) : 0
        }
        totalDistanceMeters={telemetry?.totalRouteDistance || 0}
        onResetProgress={handleResetProgress}
        onShareWhatsApp={handleShareWhatsApp}
      />

      <PinAuthModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingProtectedTab(null);
        }}
        onSuccess={handlePinAuthSuccess}
        targetTabName={pendingProtectedTab === 'admin' ? 'Admin Panel' : 'Pantau Panitia'}
      />
    </div>
  );
}
