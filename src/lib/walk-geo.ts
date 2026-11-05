// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single coordinate pair used for the breadcrumb trail. */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** A GPS fix recorded during a walk. */
export interface WalkPoint extends Coordinate {
  /** Fix time, epoch milliseconds. */
  timestamp: number;
  /** Horizontal accuracy in metres, or `null` when unknown. */
  accuracy: number | null;
  /** Speed in m/s, or `null` when the OS reports it as unknown. */
  speed: number | null;
}

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------

/** Fixes with a worse horizontal accuracy than this (metres) are dropped. */
export const MAX_ACCURACY_M = 30;
/** Fixes closer than this (metres) to the last kept fix are GPS jitter. */
export const MIN_SEGMENT_M = 3;
/** Faster than this (m/s, ~36 km/h) between two fixes is a GPS teleport. */
export const MAX_PLAUSIBLE_SPEED_MPS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Great-circle distance between two coordinates, in metres. */
export function haversineDistance(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Total length of a path, in metres. */
export function pathDistance(points: readonly Coordinate[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

/**
 * Normalise a GPS speed reading.
 *
 * iOS reports `-1` (and some devices `null`) when speed is unknown. Treating
 * that as "standing still" would wrongly end a walk, so unknown becomes `null`.
 */
export function normalizeSpeed(speed: number | null | undefined): number | null {
  if (speed == null || !Number.isFinite(speed) || speed < 0) return null;
  return speed;
}

/**
 * Decide whether a new GPS fix should extend the walk path.
 *
 * Rejects inaccurate fixes, sub-`MIN_SEGMENT_M` jitter, and implausible
 * jumps, so stray fixes can neither inflate distance nor draw spikes.
 */
export function shouldAcceptPoint(
  last: WalkPoint | undefined,
  next: WalkPoint,
): boolean {
  if (next.accuracy != null && (next.accuracy < 0 || next.accuracy > MAX_ACCURACY_M)) {
    return false;
  }
  if (!last) return true;

  const metres = haversineDistance(last, next);
  if (metres < MIN_SEGMENT_M) return false;

  const seconds = (next.timestamp - last.timestamp) / 1000;
  if (seconds > 0 && metres / seconds > MAX_PLAUSIBLE_SPEED_MPS) return false;

  return true;
}
