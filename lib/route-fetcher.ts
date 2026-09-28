import { Checkpoint } from './types';
import { calculateHaversineDistance } from './geo-utils';

/**
 * Fetches actual road routing geometry following main street networks
 * using OSRM (Open Source Routing Machine) driving/foot routing engine,
 * while stripping out unwanted side-alley right turn loops around POS 3.
 */
export async function fetchDetailedRoadRoute(
  checkpoints: Checkpoint[]
): Promise<[number, number][]> {
  if (!checkpoints || checkpoints.length < 2) {
    return [];
  }

  const pos3 = checkpoints.find((c) => c.name.includes('POS 3') || c.id.includes('POS_3'));

  try {
    // 1. Try fetching leg by leg using OSRM driving profile to stay on main roads
    const allLegCoordinates: [number, number][] = [];

    for (let i = 0; i < checkpoints.length - 1; i++) {
      const from = checkpoints[i];
      const to = checkpoints[i + 1];

      // Try driving profile first (prefers main roads over small right-turn alleys)
      let legCoords = await fetchSingleLegRoute(from, to, 'driving');

      if (!legCoords || legCoords.length === 0) {
        // Fallback to foot profile for this leg
        legCoords = await fetchSingleLegRoute(from, to, 'foot');
      }

      if (legCoords && legCoords.length > 0) {
        if (allLegCoordinates.length > 0) {
          // Avoid duplicate junction point
          allLegCoordinates.push(...legCoords.slice(1));
        } else {
          allLegCoordinates.push(...legCoords);
        }
      } else {
        // Fallback to straight line segment between checkpoints
        allLegCoordinates.push([from.lat, from.lng], [to.lat, to.lng]);
      }
    }

    // 2. Filter out any right-turn detour loops around POS 3
    if (pos3) {
      return filterRightTurnDetourAroundPOS3(allLegCoordinates, pos3.lat, pos3.lng);
    }

    return allLegCoordinates;
  } catch (error) {
    console.warn('Failed to fetch OSRM road routing:', error);
  }

  // Fallback if API fails or device is offline: return straight checkpoint coordinates
  return checkpoints.map((cp) => [cp.lat, cp.lng]);
}

/**
 * Helper to fetch route for a single leg between two checkpoints.
 */
async function fetchSingleLegRoute(
  from: Checkpoint,
  to: Checkpoint,
  profile: 'driving' | 'foot' = 'driving'
): Promise<[number, number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&continue_straight=true`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();

    if (
      data.code === 'Ok' &&
      data.routes &&
      data.routes.length > 0 &&
      data.routes[0].geometry &&
      data.routes[0].geometry.coordinates
    ) {
      const geoCoordinates: [number, number][] = data.routes[0].geometry.coordinates;
      return geoCoordinates.map(([lng, lat]) => [lat, lng]);
    }
  } catch {
    // Ignore individual leg failure
  }
  return null;
}

/**
 * Filters out right-turn side alley detours near POS 3.
 * Removes intermediate waypoints near POS 3 that veer right/north away from the main road.
 */
function filterRightTurnDetourAroundPOS3(
  coords: [number, number][],
  pos3Lat: number,
  pos3Lng: number
): [number, number][] {
  if (coords.length < 3) return coords;

  const result: [number, number][] = [];

  for (let i = 0; i < coords.length; i++) {
    const [lat, lng] = coords[i];

    // Distance to POS 3
    const distToPOS3 = calculateHaversineDistance(lat, lng, pos3Lat, pos3Lng);

    // If point is within 120m radius of POS 3
    if (distToPOS3 < 120) {
      // Filter out points that turn right (north of latitude -7.21275) into side alleys
      const isRightTurnDetour = lat > -7.21275;
      if (isRightTurnDetour) {
        continue; // Skip this right-turn detour point!
      }
    }

    result.push([lat, lng]);
  }

  return result;
}
