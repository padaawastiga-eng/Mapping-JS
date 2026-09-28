'use client';

import React, { useEffect, useRef } from 'react';
import type { Map as LeafletMap, TileLayer, Polyline, Marker, Circle } from 'leaflet';
import { AppConfig, Checkpoint, RouteCalculation, UserPosition } from '@/lib/types';

interface MapProps {
  config: AppConfig;
  userPos: UserPosition | null;
  telemetry: RouteCalculation | null;
  tileType: 'standard' | 'satellite';
  followUserMode: boolean;
  completedCheckpointIds: string[];
  detailedPolyline?: [number, number][];
  onSelectCheckpoint?: (cp: Checkpoint) => void;
  isSimulating?: boolean;
}

export const MapComponent: React.FC<MapProps> = ({
  config,
  userPos,
  telemetry,
  tileType,
  followUserMode,
  completedCheckpointIds,
  detailedPolyline = [],
  onSelectCheckpoint,
  isSimulating = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);
  const polylineRef = useRef<Polyline | null>(null);
  const markersRef = useRef<Record<string, Marker>>({});
  const userMarkerRef = useRef<Marker | null>(null);
  const userAccuracyCircleRef = useRef<Circle | null>(null);
  const offRouteLineRef = useRef<Polyline | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Load Leaflet dynamically
    import('leaflet').then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;

      const firstCp = config.checkpoints[0] || { lat: -7.2184, lng: 107.8034 };
      const map = L.map(mapContainerRef.current, {
        center: [firstCp.lat, firstCp.lng],
        zoom: 16,
        zoomControl: false,
        attributionControl: false,
      });

      // Standard OSM Tile
      const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      const tileLayer = L.tileLayer(osmUrl, {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
      }).addTo(map);

      tileLayerRef.current = tileLayer;
      mapRef.current = map;

      // Fit bounds to initial checkpoints
      if (config.checkpoints.length > 0) {
        const bounds = L.latLngBounds(config.checkpoints.map((cp) => [cp.lat, cp.lng]));
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [config.checkpoints]);

  // Update Tile Layer (Standard vs Satellite)
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

  // Render/Update Checkpoints & Detailed Road Route Polyline
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // 1. Detailed Road Polyline following street curves and turns
      const latLngs: [number, number][] =
        detailedPolyline.length > 1
          ? detailedPolyline
          : config.checkpoints.map((cp) => [cp.lat, cp.lng]);

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      const polyline = L.polyline(latLngs, {
        color: config.polylineColor || '#2563eb', // Blue road line
        weight: config.polylineWeight || 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylineRef.current = polyline;

      // 2. Checkpoint Markers
      Object.values(markersRef.current).forEach((m) => map.removeLayer(m));
      markersRef.current = {};

      config.checkpoints.forEach((cp, idx) => {
        const isPassed = completedCheckpointIds.includes(cp.id);

        let bgStyle = 'bg-blue-600';
        let badgeContent = `${idx}`;
        let iconHtml = '';

        if (cp.type === 'START') {
          bgStyle = isPassed ? 'bg-emerald-600' : 'bg-emerald-500';
          iconHtml = `<div class="${bgStyle} pos-marker-badge w-9 h-9 text-xs">🚀</div>`;
        } else if (cp.type === 'FINISH') {
          bgStyle = isPassed ? 'bg-purple-600' : 'bg-red-600';
          iconHtml = `<div class="${bgStyle} pos-marker-badge w-10 h-10 text-sm">🏁</div>`;
        } else {
          bgStyle = isPassed ? 'bg-emerald-600' : 'bg-amber-500';
          badgeContent = cp.name.replace('POS ', '');
          iconHtml = `<div class="${bgStyle} pos-marker-badge w-8 h-8 text-xs">${isPassed ? '✓' : badgeContent}</div>`;
        }

        const customIcon = L.divIcon({
          className: 'custom-cp-marker',
          html: iconHtml,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([cp.lat, cp.lng], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div class="p-2 text-slate-900 font-sans min-w-[160px]">
            <div class="text-xs uppercase tracking-wider font-bold text-slate-500">${cp.type}</div>
            <div class="text-base font-bold text-slate-900">${cp.name}</div>
            ${cp.description ? `<div class="text-xs text-slate-600 mt-1">${cp.description}</div>` : ''}
            <div class="mt-2 pt-1 border-t border-slate-200 text-xs font-semibold ${isPassed ? 'text-emerald-600' : 'text-amber-600'}">
              ${isPassed ? '✓ SUDAH TERLEWATI' : '⏳ BELUM MELEWATI'}
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          if (onSelectCheckpoint) onSelectCheckpoint(cp);
        });

        markersRef.current[cp.id] = marker;
      });
    });
  }, [config.checkpoints, config.polylineColor, config.polylineWeight, completedCheckpointIds, detailedPolyline, onSelectCheckpoint]);

  // Update User Position & Off-route Line
  useEffect(() => {
    if (!mapRef.current) return;

    import('leaflet').then((L) => {
      const map = mapRef.current;
      if (!map) return;

      if (!userPos) {
        if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
        if (userAccuracyCircleRef.current) map.removeLayer(userAccuracyCircleRef.current);
        if (offRouteLineRef.current) map.removeLayer(offRouteLineRef.current);
        userMarkerRef.current = null;
        userAccuracyCircleRef.current = null;
        offRouteLineRef.current = null;
        return;
      }

      const userLatLng: [number, number] = [userPos.lat, userPos.lng];

      // 1. User Pulsing Marker
      if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: `
            <div class="user-location-pulse"></div>
            <div class="user-location-dot"></div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        userMarkerRef.current = L.marker(userLatLng, {
          icon: userIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        userMarkerRef.current.bindTooltip(
          isSimulating ? '🏃 SIMULASI POSISI ANDA' : '📍 POSISI ANDA',
          { permanent: false, direction: 'top' }
        );
      } else {
        userMarkerRef.current.setLatLng(userLatLng);
      }

      // 2. Accuracy Circle
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle(userLatLng, {
          radius: Math.max(5, userPos.accuracy || 10),
          color: '#3b82f6',
          fillColor: '#60a5fa',
          fillOpacity: 0.15,
          weight: 1,
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng(userLatLng);
        userAccuracyCircleRef.current.setRadius(Math.max(5, userPos.accuracy || 10));
      }

      // 3. Off-route warning line connecting user to nearest point on route
      if (telemetry && telemetry.isOffRoute) {
        const lineCoords: [number, number][] = [userLatLng, telemetry.nearestPointOnRoute];
        if (!offRouteLineRef.current) {
          offRouteLineRef.current = L.polyline(lineCoords, {
            color: '#ef4444',
            weight: 3,
            dashArray: '6, 8',
          }).addTo(map);
        } else {
          offRouteLineRef.current.setLatLngs(lineCoords);
        }
      } else {
        if (offRouteLineRef.current) {
          map.removeLayer(offRouteLineRef.current);
          offRouteLineRef.current = null;
        }
      }

      // Auto Pan to user when follow user mode is active
      if (followUserMode) {
        map.panTo(userLatLng, { animate: true, duration: 0.5 });
      }
    });
  }, [userPos, telemetry, followUserMode, isSimulating]);

  return (
    <div className="relative w-full h-full min-h-[350px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
