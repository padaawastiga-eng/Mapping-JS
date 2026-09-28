import { Checkpoint, RouteCalculation, UserPosition } from './types';

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates the Haversine distance in meters between two lat/lng coordinates.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Calculates the shortest distance from a point to a line segment AB,
 * returning the distance in meters and the coordinates of the closest point on segment AB.
 */
export function pointToSegmentDistance(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): { distance: number; closestPoint: [number, number] } {
  const avgLat = (((aLat + bLat) / 2) * Math.PI) / 180;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(avgLat);

  // Convert A, B, P to local meter offsets relative to A
  const ax = 0;
  const ay = 0;
  const bx = (bLng - aLng) * metersPerDegreeLng;
  const by = (bLat - aLat) * metersPerDegreeLat;
  const px = (pLng - aLng) * metersPerDegreeLng;
  const py = (pLat - aLat) * metersPerDegreeLat;

  const abSquared = bx * bx + by * by;

  let t = 0;
  if (abSquared > 0) {
    t = (px * bx + py * by) / abSquared;
    t = Math.max(0, Math.min(1, t)); // Clamp projection to segment bounds [0, 1]
  }

  // Closest point C on segment AB
  const cx = ax + t * bx;
  const cy = ay + t * by;

  // Convert C back to lat/lng
  const cLat = aLat + cy / metersPerDegreeLat;
  const cLng = aLng + cx / metersPerDegreeLng;

  const dist = calculateHaversineDistance(pLat, pLng, cLat, cLng);

  return { distance: dist, closestPoint: [cLat, cLng] };
}

/**
 * Calculates total route polyline distance across given coordinates array.
 */
export function calculateTotalPolylineDistance(coords: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lat1, lng1] = coords[i];
    const [lat2, lng2] = coords[i + 1];
    total += calculateHaversineDistance(lat1, lng1, lat2, lng2);
  }
  return total;
}

/**
 * Calculates total route polyline distance by summing segment distances across checkpoints in order.
 */
export function calculateTotalRouteDistance(checkpoints: Checkpoint[]): number {
  let total = 0;
  for (let i = 0; i < checkpoints.length - 1; i++) {
    const p1 = checkpoints[i];
    const p2 = checkpoints[i + 1];
    total += calculateHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);
  }
  return total;
}

/**
 * Full route calculation evaluating user position relative to polyline corridor and checkpoints.
 */
export function calculateRouteTelemetry(
  userPos: UserPosition,
  checkpoints: Checkpoint[],
  completedCheckpointIds: string[],
  offRouteToleranceMeters: number = 40,
  checkpointRadiusMeters: number = 30,
  detailedPolyline: [number, number][] = []
): RouteCalculation {
  const totalRouteDist =
    detailedPolyline.length > 1
      ? calculateTotalPolylineDistance(detailedPolyline)
      : calculateTotalRouteDistance(checkpoints);

  if (checkpoints.length < 2) {
    return {
      status: 'ON_ROUTE',
      statusText: 'RUTE BELUM TERKONFIGURASI',
      distanceToNearestRoute: 0,
      nearestPointOnRoute: [userPos.lat, userPos.lng],
      nextCheckpoint: null,
      distanceToNextCheckpoint: 0,
      totalRouteDistance: totalRouteDist,
      remainingDistanceToFinish: 0,
      progressPercentage: 0,
      isOffRoute: false,
      isNearCheckpoint: false,
      isAtFinish: false,
    };
  }

  // 1. Find nearest segment along detailed polyline or checkpoint line
  let minDistanceToRoute = Infinity;
  let overallClosestPoint: [number, number] = [userPos.lat, userPos.lng];

  const polySegments =
    detailedPolyline.length > 1
      ? detailedPolyline
      : checkpoints.map((cp) => [cp.lat, cp.lng] as [number, number]);

  for (let i = 0; i < polySegments.length - 1; i++) {
    const [aLat, aLng] = polySegments[i];
    const [bLat, bLng] = polySegments[i + 1];
    const res = pointToSegmentDistance(
      userPos.lat,
      userPos.lng,
      aLat,
      aLng,
      bLat,
      bLng
    );

    if (res.distance < minDistanceToRoute) {
      minDistanceToRoute = res.distance;
      overallClosestPoint = res.closestPoint;
    }
  }

  // 2. Identify Next Checkpoint
  let nextCheckpointIndex = checkpoints.findIndex(
    (cp) => !completedCheckpointIds.includes(cp.id)
  );
  if (nextCheckpointIndex === -1) {
    // All completed
    nextCheckpointIndex = checkpoints.length - 1;
  }

  const nextCp = checkpoints[nextCheckpointIndex] || null;
  const distToNextCp = nextCp
    ? calculateHaversineDistance(userPos.lat, userPos.lng, nextCp.lat, nextCp.lng)
    : 0;

  // 3. Estimate Remaining Distance to Finish
  const finishCp = checkpoints[checkpoints.length - 1];
  let remainingDist = 0;

  if (nextCheckpointIndex < checkpoints.length) {
    remainingDist += distToNextCp;
    for (let i = nextCheckpointIndex; i < checkpoints.length - 1; i++) {
      remainingDist += calculateHaversineDistance(
        checkpoints[i].lat,
        checkpoints[i].lng,
        checkpoints[i + 1].lat,
        checkpoints[i + 1].lng
      );
    }
  }

  // 4. Calculate Progress Percentage
  const completedSegmentDist = Math.max(0, totalRouteDist - remainingDist);
  const rawProgress = Math.min(
    100,
    Math.max(0, (completedSegmentDist / (totalRouteDist || 1)) * 100)
  );

  // 5. Determine Route Status & Thresholds
  const isOffRoute = minDistanceToRoute > offRouteToleranceMeters;
  const isNearCheckpoint = distToNextCp <= 50; // Within 50m warning
  const isAtFinish =
    finishCp &&
    calculateHaversineDistance(userPos.lat, userPos.lng, finishCp.lat, finishCp.lng) <=
      checkpointRadiusMeters;

  let status: RouteCalculation['status'] = 'ON_ROUTE';
  let statusText = 'ANDA BERADA DI RUTE';

  if (isOffRoute) {
    status = 'OFF_ROUTE';
    statusText = 'ANDA KELUAR DARI RUTE';
  } else if (distToNextCp <= checkpointRadiusMeters) {
    status = 'PASSED_POS';
    statusText = `MEMASUKI ${nextCp?.name || 'POS'}`;
  } else if (isNearCheckpoint) {
    status = 'APPROACHING_POS';
    statusText = `MENDEKATI ${nextCp?.name || 'POS'}`;
  }

  return {
    status,
    statusText,
    distanceToNearestRoute: Math.round(minDistanceToRoute),
    nearestPointOnRoute: overallClosestPoint,
    nextCheckpoint: nextCp,
    distanceToNextCheckpoint: Math.round(distToNextCp),
    totalRouteDistance: Math.round(totalRouteDist),
    remainingDistanceToFinish: Math.round(remainingDist),
    progressPercentage: Math.round(rawProgress),
    isOffRoute,
    isNearCheckpoint,
    isAtFinish,
  };
}

/**
 * Format meters to readable text (e.g. 850m or 2.4 km)
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Format duration in seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
