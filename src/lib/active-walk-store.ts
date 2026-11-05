import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import { Platform } from "react-native";
import { create } from "zustand";

import { createWalkEntry, useWalkStore } from "@/lib/walk-store";
import type { WalkEntry } from "@/lib/walk-store";
import { pathDistance, shouldAcceptPoint } from "@/lib/walk-geo";
import type { WalkPoint } from "@/lib/walk-geo";
import { distanceToSteps } from "@/lib/walk-stats";
import { getHealthStepsBetween } from "../../modules/treadpeak-health";

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
/** Highest measured live step count noted for the current walk (memory only). */
let liveWalkSteps: { startedAt: number; steps: number } | null = null;

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

/**
 * Note the live step count measured for the walk that began at `startedAt`.
 * Android keeps the highest count per walk (a new `startedAt` replaces the
 * entry) and uses it when Health Connect lags at the end of the walk. In
 * memory only: after a kill, Health Connect history covers the walk instead.
 */
export function recordLiveWalkSteps(startedAt: number, steps: number): void {
  if (liveWalkSteps?.startedAt === startedAt) {
    liveWalkSteps.steps = Math.max(liveWalkSteps.steps, steps);
  } else {
    liveWalkSteps = { startedAt, steps };
  }
}

/**
 * Android walk steps: the larger of Health Connect's interval total and the
 * live count, because Health Connect can lag. The distance estimate is used
 * only when both are missing or 0 (today's behaviour with no measurement).
 */
function pickAndroidWalkSteps(
  measured: number | null,
  live: number | undefined,
  distanceMetres: number,
): number {
  const best = Math.round(Math.max(measured ?? 0, live ?? 0));
  return best > 0 ? best : Math.round(distanceToSteps(distanceMetres));
}

/** Steps taken between two instants, from the motion coprocessor if possible. */
async function stepsBetween(
  startMs: number,
  endMs: number,
): Promise<number | null> {
  // Android has no pedometer history; Health Connect is the source. Finalize
  // callers run in foreground hooks (use-location.ts), which satisfies Health
  // Connect's foreground-read rule. A background read rejects, this resolves
  // null, and the live count or the distance estimate is used.
  if (Platform.OS === "android") return getHealthStepsBetween(startMs, endMs);
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
 * @param fallbackSteps iOS: used only when the pedometer can't report the
 *   interval. Android: the saved steps are the larger of the Health Connect
 *   interval total and this value (or, when omitted, the live count noted by
 *   `recordLiveWalkSteps`).
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

      const measured = await stepsBetween(walk.startedAt, endedAt);
      let steps: number;
      if (Platform.OS === "android") {
        const live =
          liveWalkSteps?.startedAt === walk.startedAt
            ? liveWalkSteps.steps
            : undefined;
        steps = pickAndroidWalkSteps(measured, fallbackSteps ?? live, distanceMetres);
      } else {
        steps =
          measured ?? fallbackSteps ?? Math.round(distanceToSteps(distanceMetres));
      }
      if (liveWalkSteps?.startedAt === walk.startedAt) liveWalkSteps = null;

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
