import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { Pedometer } from "expo-sensors";

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Approximate steps from distance travelled.
 *
 * Average walking stride length is ~0.762 m (2.5 ft). This is used as a
 * fallback when the device pedometer is unavailable (e.g. iPads, some
 * Android devices without hardware step counters).
 */
function stepsFromDistance(distanceMetres: number): number {
  const AVG_STRIDE_METRES = 0.762;
  return Math.round(distanceMetres / AVG_STRIDE_METRES);
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

  let steps: number;
  if (!isPedometerAvailable) steps = stepsFromDistance(distanceMetres);
  else if (startedAtMs === null) steps = 0;
  else steps = Math.max(0, historySteps ?? watchSteps);

  return { steps, isPedometerAvailable };
}
