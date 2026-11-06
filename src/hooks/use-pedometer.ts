import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { Pedometer } from "expo-sensors";

import { recordLiveWalkSteps } from "@/lib/active-walk-store";
import { distanceToSteps } from "@/lib/walk-stats";
import {
  getHealthStepsBetween,
  isTreadpeakHealthAvailable,
} from "../../modules/treadpeak-health";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsePedometerResult {
  /** Steps taken since the walk started (`startedAtMs`); 0 when not walking. */
  steps: number;
  /** Whether the hardware pedometer is available. */
  isPedometerAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** How often the step count is re-read from the motion coprocessor. */
const REFRESH_INTERVAL_MS = 3000;

/**
 * How often Android re-reads the walk's steps from Health Connect. Health
 * Connect batches on-device steps at most once a minute and enforces rate
 * quotas, so it must not follow the 3 s pedometer cadence.
 */
const HEALTH_CONNECT_REFRESH_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Approximate steps from distance travelled, used as a fallback when the
 * device pedometer is unavailable (e.g. iPads, some Android devices without
 * hardware step counters).
 */
function stepsFromDistance(distanceMetres: number): number {
  return Math.round(distanceToSteps(distanceMetres));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Counts the steps of the walk that began at `startedAtMs`.
 *
 * - While a walk is active, the count is read from the motion coprocessor's
 *   history for `[startedAtMs, now]`. That history survives the app being
 *   killed, so a force quit and relaunch mid-walk keeps every step.
 * - The live `watchStepCount` stream (steps since this JS context started) is
 *   only a fallback for platforms where history queries are unsupported.
 * - Falls back to a distance-based estimate when no hardware pedometer is
 *   available so the user always sees a step count.
 * - On Android the count is raised to the Health Connect total for the walk
 *   interval (read at walk start, every 30 s and on foreground), so a relaunch
 *   mid-walk recovers the steps recorded meanwhile. The measured count is also
 *   noted for the saved walk (see `recordLiveWalkSteps`).
 *
 * @param startedAtMs Walk start (epoch ms), or `null` when not walking.
 */
export function usePedometer(
  distanceMetres: number,
  startedAtMs: number | null,
): UsePedometerResult {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [historySteps, setHistorySteps] = useState<number | null>(null);
  const [watchSteps, setWatchSteps] = useState(0);
  // Keyed by walk start so a new walk ignores the previous walk's reading
  // without a synchronous reset inside an effect.
  const [healthReading, setHealthReading] = useState<{
    startedAt: number;
    steps: number;
  } | null>(null);

  // Check pedometer availability once.
  useEffect(() => {
    Pedometer.isAvailableAsync().then((available) => {
      setIsPedometerAvailable(available);
    });
  }, []);

  /** Re-read the walk's step count from the pedometer history. */
  const refresh = useCallback(async (start: number) => {
    try {
      const result = await Pedometer.getStepCountAsync(
        new Date(start),
        new Date(),
      );
      setHistorySteps(result.steps);
    } catch {
      // History queries aren't supported here (e.g. Android): the live
      // `watchStepCount` total is used instead.
      setHistorySteps(null);
    }
  }, []);

  // Track the active walk: reset on a new walk, then refresh on mount /
  // relaunch, every few seconds, on each live step event and on foregrounding.
  useEffect(() => {
    setHistorySteps(null);
    setWatchSteps(0);
    if (!isPedometerAvailable || startedAtMs === null) return;

    void refresh(startedAtMs);
    const id = setInterval(() => void refresh(startedAtMs), REFRESH_INTERVAL_MS);
    const sub = Pedometer.watchStepCount(({ steps }) => {
      setWatchSteps(steps);
      void refresh(startedAtMs);
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh(startedAtMs);
    });

    return () => {
      clearInterval(id);
      sub.remove();
      appState.remove();
    };
  }, [isPedometerAvailable, startedAtMs, refresh]);

  // Android only: Health Connect steps for the walk interval. Not gated on
  // `isPedometerAvailable`, so devices without a step sensor still get history.
  useEffect(() => {
    if (
      Platform.OS !== "android" ||
      !isTreadpeakHealthAvailable ||
      startedAtMs === null
    ) {
      return;
    }
    let cancelled = false;

    async function read(start: number) {
      const result = await getHealthStepsBetween(start, Date.now());
      if (!cancelled && result !== null) {
        setHealthReading({ startedAt: start, steps: result });
      }
    }

    void read(startedAtMs);
    const id = setInterval(() => void read(startedAtMs), HEALTH_CONNECT_REFRESH_MS);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void read(startedAtMs);
    });

    return () => {
      cancelled = true;
      clearInterval(id);
      appState.remove();
    };
  }, [startedAtMs]);

  const healthSteps =
    healthReading !== null && healthReading.startedAt === startedAtMs
      ? healthReading.steps
      : null;

  let steps: number;
  if (!isPedometerAvailable) steps = stepsFromDistance(distanceMetres);
  else if (startedAtMs === null) steps = 0;
  else steps = Math.max(0, historySteps ?? watchSteps);
  // `healthSteps` is always null on iOS, so this only changes Android.
  if (startedAtMs !== null && healthSteps !== null) {
    steps = Math.max(steps, healthSteps);
  }

  // Android only: note the measured count so a saved walk can use it if Health
  // Connect lags at the end. An external-store write, not React state. A
  // distance estimate (no pedometer) is never recorded.
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      isPedometerAvailable &&
      startedAtMs !== null
    ) {
      recordLiveWalkSteps(startedAtMs, steps);
    }
  }, [steps, startedAtMs, isPedometerAvailable]);

  return { steps, isPedometerAvailable };
}
