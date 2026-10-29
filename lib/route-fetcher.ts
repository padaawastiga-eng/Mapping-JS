import { Checkpoint } from './types';
import { calculateHaversineDistance } from './geo-utils';
import { OFFICIAL_PASIRWANGI_ROAD_ROUTE } from './default-config';

/**
 * Fetches actual road routing geometry following main street networks
 * using OSRM (Open Source Routing Machine) driving/foot routing engine,
 * while stripping out unwanted side-alley right turn loops around POS 3.
 */
export async function fetchDetailedRoadRoute(
  checkpoints: Checkpoint[]
): Promise<[number, number][]> {
  if (!checkpoints || checkpoints.length < 2) {
    return OFFICIAL_PASIRWANGI_ROAD_ROUTE;
  }

  // If official checkpoints are used, immediately return the pre-surveyed continuous road polyline
  const isDefaultCheckpoints =
    checkpoints.length === 6 &&
    checkpoints.some((c) => c.id === 'POS_1' && Math.abs(c.lat - (-7.219276)) < 0.0001) &&
    checkpoints.some((c) => c.id === 'POS_2' && Math.abs(c.lat - (-7.216814)) < 0.0001) &&
    checkpoints.some((c) => c.id === 'POS_3' && Math.abs(c.lat - (-7.214637)) < 0.0001) &&
    checkpoints.some((c) => c.id === 'POS_4' && Math.abs(c.lat - (-7.218088)) < 0.0001);

  if (isDefaultCheckpoints) {
    return OFFICIAL_PASIRWANGI_ROAD_ROUTE;
  }

  const pos3 = checkpoints.find((c) => c.name.includes('POS 3') || c.id.includes('POS_3'));

  try {
    // 1. Try fetching leg by leg using OSRM driving profile to stay on main roads
    const allLegCoordinates: [number, number][] = [];

    for (let i = 0; i < checkpoints.length - 1; i++) {
      const from = checkpoints[i];
      const to = checkpoints[i + 1];

      let legCoords: [number, number][] | null = null;

      // Special handling: POS 3 to POS 4 connects via walking footpath through the plantation area
      const isPOS3toPOS4 =
        (from.id === 'POS_3' || from.name.toUpperCase().includes('POS 3')) &&
        (to.id === 'POS_4' || to.name.toUpperCase().includes('POS 4'));

      if (isPOS3toPOS4) {
        legCoords = generatePlantationFootpath(from, to);
      } else {
        // Try driving profile first (prefers main roads over small right-turn alleys)
        legCoords = await fetchSingleLegRoute(from, to, 'driving');

        if (!legCoords || legCoords.length === 0) {
          // Fallback to foot profile for this leg
          legCoords = await fetchSingleLegRoute(from, to, 'foot');
        }
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

    // 2. Filter out any right-turn detour loops around POS 3 if northern alley route was used
    if (pos3 && pos3.lat > -7.2135) {
      return filterRightTurnDetourAroundPOS3(allLegCoordinates, pos3.lat, pos3.lng);
    }

    return allLegCoordinates;
  } catch (error) {
    console.warn('Failed to fetch OSRM road routing:', error);
  }

  // Fallback if API fails or device is offline: return official road-following route
  return OFFICIAL_PASIRWANGI_ROAD_ROUTE;
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

/**
 * Dedicated walking trail through the plantation area connecting POS 3 and POS 4.
 * Traverses the agricultural footpath directly from POS 3 to POS 4
 * without taking the vehicular road detour.
 */
export function generatePlantationFootpath(from: Checkpoint, to: Checkpoint): [number, number][] {
  const defaultPOS3Lat = -7.214637;
  const defaultPOS3Lng = 107.804013;
  const defaultPOS4Lat = -7.218088;
  const defaultPOS4Lng = 107.801311;

  const isDefaultRange =
    Math.abs(from.lat - defaultPOS3Lat) < 0.005 &&
    Math.abs(from.lng - defaultPOS3Lng) < 0.005 &&
    Math.abs(to.lat - defaultPOS4Lat) < 0.005 &&
    Math.abs(to.lng - defaultPOS4Lng) < 0.005;

  if (isDefaultRange) {
    return [
      [from.lat, from.lng],
      [-7.214815, 107.803855], // Awal jalan setapak perkebunan dari POS 3
      [-7.215082, 107.803612], // Jalur perkebunan segmen utara
      [-7.215385, 107.803365], // Melintasi pematang kebun sayur
      [-7.215712, 107.803094], // Jalur tanah padat tengah perkebunan
      [-7.216058, 107.802812], // Kontur tengah kebun warga
      [-7.216442, 107.802518], // Jalur jalan kaki teduh perkebunan
      [-7.216855, 107.802225], // Pematang kebun area selatan
      [-7.217274, 107.801918], // Jalur keluar kebun
      [-7.217688, 107.801615], // Akses jalan setapak desa
      [to.lat, to.lng],        // Tiba di POS 4
    ];
  }

  // Dynamic interpolation along the footpath if user customized coordinates
  const steps = 10;
  const interpolated: [number, number][] = [];
  for (let s = 0; s <= steps; s++) {
    const ratio = s / steps;
    const curveOffset = Math.sin(ratio * Math.PI) * 0.00015;
    const lat = from.lat + (to.lat - from.lat) * ratio;
    const lng = from.lng + (to.lng - from.lng) * ratio - curveOffset;
    interpolated.push([lat, lng]);
  }
  return interpolated;
}
