import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import { create } from "zustand";

import { createWalkEntry, useWalkStore } from "@/lib/walk-store";
import type { WalkEntry } from "@/lib/walk-store";
import { pathDistance, shouldAcceptPoint } from "@/lib/walk-geo";
import type { WalkPoint } from "@/lib/walk-geo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The walk currently being recorded (or just ended, awaiting save). */
export interface ActiveWalk {
  /** Walk start, epoch milliseconds. */
  startedAt: number;
  /** `true` when auto-detection started the walk rather than the user. */
  isAuto: boolean;
  /** Walk end, epoch milliseconds; `null` while recording. */
  endedAt: number | null;
  /** Accepted GPS fixes, oldest first. */
  points: WalkPoint[];
}

interface ActiveWalkState {
  walk: ActiveWalk | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "treadpeak-active-walk";
/** Walks shorter than this (metres) are discarded instead of saved. */
export const MIN_SAVED_DISTANCE_M = 50;
/** Walks shorter than this (seconds) are discarded instead of saved. */
export const MIN_SAVED_DURATION_S = 60;
/** Average walking stride length in metres, used when no step data exists. */
const AVG_STRIDE_M = 0.762;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * In-memory view of the in-progress walk. It is mirrored to AsyncStorage on
 * every change so a locked phone, a relaunch, or a killed app never loses the
 * route. The background location task writes here too, in a JS context that
 * has no mounted UI.
 */
export const useActiveWalkStore = create<ActiveWalkState>(() => ({
  walk: null,
}));

let hydration: Promise<ActiveWalk | null> | null = null;
let writeChain: Promise<void> = Promise.resolve();
let finalizing: Promise<WalkEntry | null> | null = null;

/** Queue a write so concurrent updates reach storage in order. */
function persist(walk: ActiveWalk | null): void {
  writeChain = writeChain.then(async () => {
    try {
      if (walk) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(walk));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage failures must never interrupt tracking.
    }
  });
}

function setWalk(walk: ActiveWalk | null): void {
  useActiveWalkStore.setState({ walk });
  persist(walk);
}

/**
 * Load the persisted in-progress walk into memory (once per JS context).
 *
 * Every writer awaits this first, so a background launch that delivers
 * locations before the UI mounts can't overwrite a stored walk.
 */
export function hydrateActiveWalk(): Promise<ActiveWalk | null> {
  hydration ??= (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as ActiveWalk) : null;
      // Don't clobber a walk that was begun while we were reading.
      if (useActiveWalkStore.getState().walk === null) {
        useActiveWalkStore.setState({ walk: parsed });
      }
      return useActiveWalkStore.getState().walk;
    } catch {
      return useActiveWalkStore.getState().walk;
    }
  })();
  return hydration;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/** Start recording a new walk, replacing any leftover one. */
export async function beginActiveWalk(isAuto: boolean): Promise<void> {
  await hydrateActiveWalk();
  setWalk({ startedAt: Date.now(), isAuto, endedAt: null, points: [] });
}

/**
 * Append GPS fixes to the active walk, dropping inaccurate, jittery or
 * implausible ones. Safe to call from the headless background task.
 */
export async function appendLocations(fixes: WalkPoint[]): Promise<void> {
  await hydrateActiveWalk();
  const current = useActiveWalkStore.getState().walk;
  if (!current || current.endedAt !== null) return;

  const accepted: WalkPoint[] = [];
  let last = current.points[current.points.length - 1];
  for (const fix of fixes) {
    if (shouldAcceptPoint(last, fix)) {
      accepted.push(fix);
      last = fix;
    }
  }
  if (accepted.length === 0) return;

  setWalk({ ...current, points: [...current.points, ...accepted] });
}

/** Mark the active walk as ended. It stays in storage until it is saved. */
export function endActiveWalk(endedAt: number = Date.now()): void {
  const current = useActiveWalkStore.getState().walk;
  if (!current || current.endedAt !== null) return;
  setWalk({ ...current, endedAt });
}

/** Throw the active walk away without saving it. */
export function discardActiveWalk(): void {
  setWalk(null);
}

/** Distance of the active walk so far, in metres. */
export function getActiveWalkDistance(walk: ActiveWalk | null): number {
  return walk ? pathDistance(walk.points) : 0;
}

// ---------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------

/** Steps taken between two instants, from the motion coprocessor if possible. */
async function stepsBetween(
  startMs: number,
  endMs: number,
): Promise<number | null> {
  try {
    if (!(await Pedometer.isAvailableAsync())) return null;
    const result = await Pedometer.getStepCountAsync(
      new Date(startMs),
      new Date(endMs),
    );
    return result.steps;
  } catch {
    // Not supported on this platform, or outside the retention window.
    return null;
  }
}

/**
 * Turn the active walk into a saved history entry (when it is long enough)
 * and clear it. Safe to call twice: concurrent calls share one result, and a
 * second call finds nothing to save.
 *
 * @param fallbackSteps Used only when the pedometer can't report the interval.
 * @returns The saved entry, or `null` when nothing was saved.
 */
export function finalizeActiveWalk(
  fallbackSteps?: number,
): Promise<WalkEntry | null> {
  finalizing ??= (async () => {
    try {
      await hydrateActiveWalk();
      const walk = useActiveWalkStore.getState().walk;
      if (!walk) return null;

      const lastFix = walk.points[walk.points.length - 1];
      const endedAt = walk.endedAt ?? lastFix?.timestamp ?? walk.startedAt;
      const durationSeconds = Math.max(
        0,
        Math.round((endedAt - walk.startedAt) / 1000),
      );
      const distanceMetres = Math.round(pathDistance(walk.points));

      setWalk(null);

      if (
        walk.points.length < 2 ||
        distanceMetres < MIN_SAVED_DISTANCE_M ||
        durationSeconds < MIN_SAVED_DURATION_S
      ) {
        return null;
      }

      const steps =
        (await stepsBetween(walk.startedAt, endedAt)) ??
        fallbackSteps ??
        Math.round(distanceMetres / AVG_STRIDE_M);

      const entry = createWalkEntry({
        startedAt: new Date(walk.startedAt).toISOString(),
        endedAt: new Date(endedAt).toISOString(),
        durationSeconds,
        distanceMetres,
        steps,
        pathCoordinates: walk.points.map(({ latitude, longitude }) => ({
          latitude,
          longitude,
        })),
      });
      useWalkStore.getState().addWalk(entry);
      return entry;
    } finally {
      finalizing = null;
    }
  })();
  return finalizing;
}
