import { useCallback, useEffect, useRef, useState } from "react";
import { Pedometer } from "expo-sensors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsePedometerResult {
  /** Total steps taken since `startTracking` was called. */
  steps: number;
  /** Whether the hardware pedometer is available. */
  isPedometerAvailable: boolean;
  /** Reset the step counter. Call when starting a new walk. */
  reset: () => void;
}

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
 * Reads the device's built-in pedometer while active, and resets on demand.
 *
 * - Subscribes to `Pedometer.watchStepCount` for live hardware step counts.
 * - Falls back to a distance-based estimate when a hardware pedometer is
 *   not available so the user always sees a step count.
 * - `reset()` restarts the count from zero (call when starting a new walk).
 */
export function usePedometer(distanceMetres: number): UsePedometerResult {
  const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
  const [rawSteps, setRawSteps] = useState(0);
  const [stepOffset, setStepOffset] = useState(0);
  const subscriptionRef = useRef<ReturnType<
    typeof Pedometer.watchStepCount
  > | null>(null);

  // Check pedometer availability once.
  useEffect(() => {
    Pedometer.isAvailableAsync().then((available) => {
      setIsPedometerAvailable(available);
    });
  }, []);

  // Subscribe to hardware step count when tracking.
  useEffect(() => {
    if (!isPedometerAvailable) return;

    const sub = Pedometer.watchStepCount(({ steps }) => {
      setRawSteps(steps);
    });

    subscriptionRef.current = sub;

    return () => {
      sub?.remove();
    };
  }, [isPedometerAvailable]);

  // The displayed step count is the raw total minus the offset (set at
  // the start of each walk to zero out the count).
  const hardwareSteps = rawSteps - stepOffset;

  // If pedometer is available, use it. Otherwise estimate from distance.
  const steps = isPedometerAvailable
    ? Math.max(0, hardwareSteps)
    : stepsFromDistance(distanceMetres);

  /** Reset the counter for a new walk. */
  const reset = useCallback(() => {
    setStepOffset(rawSteps);
  }, [rawSteps]);

  return { steps, isPedometerAvailable, reset };
}
