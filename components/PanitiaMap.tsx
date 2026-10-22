'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Map as LeafletMap, TileLayer, Polyline, Marker } from 'leaflet';
import { AppConfig, Checkpoint, PanitiaTelemetry } from '@/lib/types';
import { Layers, Maximize2, Search, AlertTriangle, CheckCircle2, User, RefreshCw } from 'lucide-react';

interface PanitiaMapProps {
  config: AppConfig;
  detailedPolyline?: [number, number][];
  runners: PanitiaTelemetry[];
  selectedRunnerId?: string | null;
  onSelectRunner?: (runner: PanitiaTelemetry) => void;
  onSelectCheckpoint?: (cp: Checkpoint) => void;
}

export const PanitiaMap: React.FC<PanitiaMapProps> = ({
  config,
  detailedPolyline = [],
  runners,
  selectedRunnerId,
  onSelectRunner,
  onSelectCheckpoint,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const polylineRef = useRef<Polyline | null>(null);
  const checkpointMarkersRef = useRef<Record<string, Marker>>({});
  const runnerMarkersRef = useRef<Record<string, Marker>>({});

  const [tileType, setTileType] = useState<'standard' | 'satellite'>('standard');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on_route' | 'off_route' | 'finished'>('all');
  const [mapSearch, setMapSearch] = useState('');

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import('leaflet').then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;

      const firstCp = config.checkpoints[0] || { lat: -7.2184, lng: 107.8034 };
      const map = L.map(mapContainerRef.current, {
        center: [firstCp.lat, firstCp.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Default OpenStreetMap Layer
      const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const tileLayer = L.tileLayer(osmUrl, {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapRef.current = map;

      // Fit bounds to checkpoints
      if (config.checkpoints.length > 0) {
        const bounds = L.latLngBounds(config.checkpoints.map((cp) => [cp.lat, cp.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [config.checkpoints]);

  // 2. Tile Layer Update (Standard vs Satellite)
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      if (tileLayerRef.current) {
        mapRef.current.removeLayer(tileLayerRef.current);
      }

      let newUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      let maxZoom = 19;

      if (tileType === 'satellite') {
        newUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        maxZoom = 18;
      }

      const newTile = L.tileLayer(newUrl, {
        maxZoom,
        subdomains: tileType === 'standard' ? ['a', 'b', 'c'] : [],
      }).addTo(mapRef.current);

      tileLayerRef.current = newTile;
    });
  }, [tileType]);

  // 3. Render Official Route Polyline & Checkpoints
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Polyline (Road Route)
      const latLngs: [number, number][] =
        detailedPolyline.length > 1
          ? detailedPolyline
          : config.checkpoints.map((cp) => [cp.lat, cp.lng]);

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      const polyline = L.polyline(latLngs, {
        color: config.polylineColor || '#2563eb',
        weight: config.polylineWeight || 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylineRef.current = polyline;

      // Checkpoint Markers
      Object.values(checkpointMarkersRef.current).forEach((m) => map.removeLayer(m));
      checkpointMarkersRef.current = {};

      config.checkpoints.forEach((cp, idx) => {
        let bgStyle = 'bg-blue-600';
        let badgeContent = `${idx}`;
        let iconHtml = '';

        if (cp.type === 'START') {
          bgStyle = 'bg-emerald-500';
          iconHtml = `<div class="${bgStyle} pos-marker-badge w-9 h-9 text-xs shadow-md">🚀</div>`;
        } else if (cp.type === 'FINISH') {
          bgStyle = 'bg-red-600';
          iconHtml = `<div class="${bgStyle} pos-marker-badge w-10 h-10 text-sm shadow-md">🏁</div>`;
        } else {
          bgStyle = 'bg-amber-500';
          badgeContent = cp.name.replace('POS ', '');
          iconHtml = `<div class="${bgStyle} pos-marker-badge w-8 h-8 text-xs shadow-md font-bold">${badgeContent}</div>`;
        }

        const customIcon = L.divIcon({
          className: 'custom-cp-marker',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([cp.lat, cp.lng], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div class="p-2 text-slate-900 font-sans min-w-[180px]">
            <div class="text-[10px] uppercase tracking-wider font-extrabold text-blue-600">${cp.type} CHECKPOINT</div>
            <div class="text-sm font-black text-slate-900">${cp.name}</div>
            ${cp.description ? `<div class="text-xs text-slate-600 mt-1">${cp.description}</div>` : ''}
            <div class="mt-2 text-[10px] text-slate-500 font-mono">
              ${cp.lat.toFixed(5)}, ${cp.lng.toFixed(5)}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          if (onSelectCheckpoint) onSelectCheckpoint(cp);
        });

        checkpointMarkersRef.current[cp.id] = marker;
      });
    });
  }, [config.checkpoints, config.polylineColor, config.polylineWeight, detailedPolyline, onSelectCheckpoint]);

  // 4. Filter Runners
  const displayedRunners = useMemo(() => {
    return runners.filter((runner) => {
      // Filter status
      if (filterStatus === 'off_route' && !runner.isOffRoute) return false;
      if (filterStatus === 'finished' && !runner.finished) return false;
      if (filterStatus === 'on_route' && (runner.isOffRoute || runner.finished)) return false;

      // Filter search
      if (mapSearch.trim()) {
        const q = mapSearch.toLowerCase();
        const matchName = runner.name.toLowerCase().includes(q);
        const matchInst = runner.institution?.toLowerCase().includes(q);
        const matchPos = runner.currentPOS.toLowerCase().includes(q);
        if (!matchName && !matchInst && !matchPos) return false;
      }

      return true;
    });
  }, [runners, filterStatus, mapSearch]);

  // 5. Render All Participants Markers
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Keep track of existing IDs
      const currentIds = new Set(displayedRunners.map((r) => r.participantId));

      // Remove markers that are no longer in displayedRunners
      Object.keys(runnerMarkersRef.current).forEach((id) => {
        if (!currentIds.has(id)) {
          map.removeLayer(runnerMarkersRef.current[id]);
          delete runnerMarkersRef.current[id];
        }
      });

      // Update or create markers
      displayedRunners.forEach((runner) => {
        const isSelf = runner.participantId === 'user-self';
        const isSelected = runner.participantId === selectedRunnerId;
        const latLng: [number, number] = [runner.lastLat, runner.lastLng];

        let badgeBg = 'bg-blue-600 border-blue-400 text-white';
        let statusEmoji = '🏃';
        let pulseClass = '';

        if (runner.finished) {
          badgeBg = 'bg-emerald-600 border-emerald-300 text-white';
          statusEmoji = '🏁';
        } else if (runner.isOffRoute) {
          badgeBg = 'bg-rose-600 border-rose-300 text-white';
          statusEmoji = '⚠️';
          pulseClass = 'animate-ping';
        } else if (isSelf) {
          badgeBg = 'bg-indigo-600 border-amber-400 text-white ring-2 ring-amber-400';
          statusEmoji = '⭐';
        }

        const displayName = isSelf ? 'Anda (Saya)' : (runner.name.length > 24 ? runner.name.substring(0, 22) + '...' : runner.name);

        const customIconHtml = `
          <div class="relative flex flex-col items-center group cursor-pointer">
            ${
              runner.isOffRoute
                ? `<span class="absolute -top-1 w-8 h-8 rounded-full bg-rose-500/50 ${pulseClass}"></span>`
                : ''
            }
            <div class="relative z-10 w-8 h-8 rounded-full border-2 ${badgeBg} shadow-lg flex items-center justify-center text-xs font-black transition-transform group-hover:scale-125 ${
              isSelected ? 'scale-125 ring-4 ring-yellow-400' : ''
            }">
              ${statusEmoji}
            </div>
            <div class="mt-0.5 px-2 py-0.5 rounded-md bg-slate-950/90 text-[10px] font-extrabold text-white border border-slate-700 shadow-md whitespace-nowrap">
              ${displayName}
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'custom-runner-marker',
          html: customIconHtml,
          iconSize: [44, 48],
          iconAnchor: [22, 24],
        });

        if (!runnerMarkersRef.current[runner.participantId]) {
          const marker = L.marker(latLng, { icon, zIndexOffset: runner.isOffRoute ? 800 : 500 }).addTo(map);
          runnerMarkersRef.current[runner.participantId] = marker;

          marker.on('click', () => {
            if (onSelectRunner) onSelectRunner(runner);
          });
        } else {
          const existingMarker = runnerMarkersRef.current[runner.participantId];
          existingMarker.setLatLng(latLng);
          existingMarker.setIcon(icon);
          existingMarker.setZIndexOffset(runner.isOffRoute ? 800 : 500);
        }

        // Popup Content
        const popupContent = `
          <div class="p-2 text-slate-900 font-sans min-w-[210px]">
            <div class="flex items-center justify-between gap-1 mb-1">
              <span class="text-[10px] font-black uppercase tracking-wider ${
                runner.finished
                  ? 'text-emerald-600'
                  : runner.isOffRoute
                  ? 'text-rose-600 font-bold'
                  : 'text-blue-600'
              }">
                ${runner.finished ? '🏁 SUDAH FINISH' : runner.isOffRoute ? '⚠️ KELUAR JALUR' : '📍 SEDANG BERJALAN'}
              </span>
              <span class="text-[10px] text-slate-500 font-mono">
                ${new Date(runner.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            <div class="text-sm font-extrabold text-slate-900 leading-tight">
              ${runner.name}
            </div>
            ${runner.institution ? `<div class="text-[11px] text-slate-600 font-medium">${runner.institution}</div>` : ''}

            <div class="mt-2.5 pt-2 border-t border-slate-200 space-y-1.5 text-xs">
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Posisi Saat Ini:</span>
                <span class="font-extrabold text-slate-800">${runner.currentPOS}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-slate-500">Kemajuan Rute:</span>
                <span class="font-bold text-emerald-600">${runner.progress}%</span>
              </div>
              ${
                typeof runner.speed === 'number'
                  ? `<div class="flex items-center justify-between">
                      <span class="text-slate-500">Kecepatan:</span>
                      <span class="font-semibold text-slate-700">${runner.speed.toFixed(1)} km/jam</span>
                    </div>`
                  : ''
              }
            </div>
          </div>
        `;

        runnerMarkersRef.current[runner.participantId].bindPopup(popupContent);
      });
    });
  }, [displayedRunners, selectedRunnerId, onSelectRunner]);

  // 6. Fly to selected runner when changed
  useEffect(() => {
    if (!selectedRunnerId || !mapRef.current) return;
    const target = runners.find((r) => r.participantId === selectedRunnerId);
    if (target) {
      mapRef.current.flyTo([target.lastLat, target.lastLng], 17, { duration: 0.8 });
      const marker = runnerMarkersRef.current[selectedRunnerId];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selectedRunnerId, runners]);

  // Fit all participants and route
  const handleFitAll = () => {
    if (!mapRef.current) return;
    import('leaflet').then((L) => {
      const allPoints: [number, number][] = [
        ...config.checkpoints.map((cp) => [cp.lat, cp.lng] as [number, number]),
        ...runners.map((r) => [r.lastLat, r.lastLng] as [number, number]),
      ];

      if (allPoints.length > 0) {
        const bounds = L.latLngBounds(allPoints);
        mapRef.current?.fitBounds(bounds, { padding: [50, 50] });
      }
    });
  };

  const offRouteTotal = runners.filter((r) => r.isOffRoute).length;
  const finishedTotal = runners.filter((r) => r.finished).length;
  const onRouteTotal = runners.filter((r) => !r.isOffRoute && !r.finished).length;

  return (
    <div className="space-y-2">
      {/* Map Header Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white">PETA RADAR SELURUH PESERTA</h4>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-black text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE ({runners.length})
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Pantau lokasi live semua peserta di sepanjang rute Pasirwangi
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-xl font-bold transition ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Semua ({runners.length})
          </button>
          <button
            onClick={() => setFilterStatus('on_route')}
            className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
              filterStatus === 'on_route'
                ? 'bg-blue-700 text-white shadow'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Di Jalur</span>
            <span className="bg-blue-900/60 px-1 rounded text-[10px]">{onRouteTotal}</span>
          </button>
          <button
            onClick={() => setFilterStatus('off_route')}
            className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
              filterStatus === 'off_route'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-950 text-rose-400 hover:text-rose-200 border border-rose-900/40'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-300" />
            <span>Keluar Jalur</span>
            <span className="bg-rose-950 px-1 rounded text-[10px] font-mono">{offRouteTotal}</span>
          </button>
          <button
            onClick={() => setFilterStatus('finished')}
            className={`px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 ${
              filterStatus === 'finished'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-950 text-emerald-400 hover:text-emerald-200 border border-emerald-900/40'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
            <span>Finish</span>
            <span className="bg-emerald-950 px-1 rounded text-[10px] font-mono">{finishedTotal}</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Search box inside toolbar */}
          <div className="relative w-36 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              placeholder="Cari peserta di peta..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleFitAll}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-1 transition"
            title="Lihat Seluruh Peserta & Rute"
          >
            <Maximize2 className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Fit Zoom</span>
          </button>

          <button
            onClick={() => setTileType((prev) => (prev === 'standard' ? 'satellite' : 'standard'))}
            className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-1 transition"
            title="Ganti Jenis Peta (Standard / Satelit)"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{tileType === 'standard' ? 'Satelit' : 'Standard'}</span>
          </button>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative w-full h-[52vh] min-h-[420px] max-h-[650px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Quick Legend at bottom of map */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-3 text-[11px] text-slate-300 font-semibold pointer-events-auto">
          <span className="text-[10px] uppercase font-black text-slate-400 hidden sm:inline">LEGENDA:</span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Di Jalur
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" /> Keluar Jalur
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Finish
          </span>
          <span className="flex items-center gap-1 text-amber-400 hidden md:flex">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Pos Rute
          </span>
        </div>
      </div>
    </div>
  );
};
