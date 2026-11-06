import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import {
  authorizeHealthKit,
  getHealthData,
  getPlatformIdentifier,
} from "@/lib/legacy-healthkit";

import { createWalkEntry, useWalkStore } from "@/lib/walk-store";
import { distanceToSteps } from "@/lib/walk-stats";
import type { HealthConnectStatus } from "../../modules/treadpeak-health";
import {
  getCumulativeSum,
  getHealthConnectStatus,
  hasHealthConnectPermissions,
  isCumulativeQuantity,
  isTreadpeakHealthAvailable,
  openHealthConnectInstall,
} from "../../modules/treadpeak-health";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthKitState {
  /** Whether HealthKit / Health Connect authorization has been granted. */
  authorized: boolean;
  /** `true` while the initial authorization check is in flight. */
  isLoading: boolean;
  /** Human-readable error from the last authorization or fetch attempt. */
  lastError: string | null;
  /**
   * Today's total step count, or `null` while loading. The value is
   * deduplicated across sources (iPhone + Apple Watch on iOS, Health Connect
   * app priority on Android) and excludes user-entered samples.
   */
  todaySteps: number | null;
  /**
   * Today's total walking + running distance in metres, or `null`. On iOS it
   * is deduplicated across sources and excludes user-entered samples.
   */
  todayDistance: number | null;
  /**
   * Today's active energy burned in kcal, or `null`. On iOS it is
   * deduplicated across sources and excludes user-entered samples.
   */
  todayEnergy: number | null;
  /** Today's flights climbed, or `null`. */
  todayFlights: number | null;
  /**
   * Android Health Connect availability (`available`, `updateRequired` or
   * `unavailable`), or `null` until checked and always `null` on iOS.
   */
  healthConnectStatus: HealthConnectStatus | null;
  /**
   * Open the Play Store flow that installs or updates Health Connect. A no-op
   * on iOS.
   */
  openHealthConnectInstall: () => Promise<void>;
  /** Re-fetch today's data from HealthKit. */
  refresh: () => Promise<void>;
  /**
   * Pull historical workouts from HealthKit into the walk store. A no-op on
   * Android, where Health Connect exercise sessions are out of scope.
   */
  syncWorkouts: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a Date as an ISO 8601 string **without** fractional seconds.
 *
 * JavaScript's `toISOString()` always includes `.SSS` (e.g. `…T12:00:00.000Z`),
 * but the native Swift `ISO8601DateFormatter` (with default options) cannot
 * parse fractional seconds. Stripping them keeps the native layer happy.
 */
function isoDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}/, "");
}

function sumValues(data: { value?: number }[]): number {
  return data.reduce((acc, s) => acc + (s.value ?? 0), 0);
}

type TodayMetric =
  | "stepCount"
  | "distanceWalkingRunning"
  | "activeEnergyBurned"
  | "flightsClimbed";

/**
 * Read one daily total in the hook's exposed units (count, metres, kcal, count),
 * unrounded. Returns `null` when the read fails.
 *
 * On iOS this uses an `HKStatisticsQuery`, which merges overlapping iPhone and
 * Apple Watch samples (no double counting) and excludes user-entered samples.
 * On Android it is a Health Connect aggregate (deduplicated across apps by the
 * user's priority list) minus entries typed in by hand. iOS binaries without
 * the native module sum raw samples instead; on Android the legacy shim reports
 * no samples, so the result is `null`.
 */
async function readTodayTotal(
  metric: TodayMetric,
  startDate: string,
  endDate: string,
): Promise<number | null> {
  try {
    if (isTreadpeakHealthAvailable && isCumulativeQuantity(metric)) {
      // The native module already returns metres for distance.
      return await getCumulativeSum(metric, startDate, endDate);
    }

    const res = await getHealthData({
      identifier: getPlatformIdentifier(metric),
      startDate,
      endDate,
    });
    if (!res.success) return null;
    const total = sumValues(res.data);
    // The legacy native module reports distance in km.
    return metric === "distanceWalkingRunning" ? total * 1000 : total;
  } catch (err) {
    console.warn(`[useHealthKit] readTodayTotal(${metric}) failed:`, err);
    return null;
  }
}

async function fetchTodayData(
  setTodaySteps: (v: number) => void,
  setTodayDistance: (v: number) => void,
  setTodayEnergy: (v: number) => void,
  setTodayFlights: (v: number) => void,
) {
  try {
    const now = new Date();
    const startDate = isoDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    );
    const endDate = isoDate(now);

    const [steps, distance, energy, flights] = await Promise.all([
      readTodayTotal("stepCount", startDate, endDate),
      readTodayTotal("distanceWalkingRunning", startDate, endDate),
      readTodayTotal("activeEnergyBurned", startDate, endDate),
      readTodayTotal("flightsClimbed", startDate, endDate),
    ]);

    if (steps !== null) setTodaySteps(Math.round(steps));
    if (distance !== null) setTodayDistance(Math.round(distance));
    if (energy !== null) setTodayEnergy(Math.round(energy));
    if (flights !== null) setTodayFlights(Math.round(flights));
  } catch (err) {
    console.error("[useHealthKit] fetchTodayData failed:", err);
  }
}

/**
 * Fetch workouts from the past 30 days and merge them into the walk store.
 */
async function fetchAndSyncWorkouts(importWalks: (walks: ReturnType<typeof createWalkEntry>[]) => void) {
  try {
    const endDate = isoDate(new Date());
    const startDate = isoDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );

    const res = await getHealthData({
      identifier: getPlatformIdentifier("workout"),
      startDate,
      endDate,
      limit: 100,
      ascending: false,
    });

    if (!res.success || res.data.length === 0) return;

    const entries = res.data
      .filter(
        (w) =>
          // Only walking workouts.
          w.workoutActivityType?.toLowerCase().includes("walk") &&
          w.duration != null &&
          w.duration > 0,
      )
      .map((w) => {
        const durationSec = Math.round(w.duration ?? 0);
        // HealthKit returns distance in km — convert to metres.
        const distMetres = Math.round((w.totalDistance ?? 0) * 1000);
        // Estimate steps from distance if not directly available (avg stride).
        const steps =
          distMetres > 0 ? Math.round(distanceToSteps(distMetres)) : 0;

        return createWalkEntry({
          startedAt: w.startDate,
          endedAt: w.endDate,
          durationSeconds: durationSec,
          distanceMetres: distMetres,
          steps,
          calories: w.totalEnergyBurned
            ? Math.round(w.totalEnergyBurned)
            : null,
          pathCoordinates: [],
          source: "healthkit",
        });
      });

    if (entries.length > 0) {
      importWalks(entries);
    }
  } catch (err) {
    console.error("[useHealthKit] syncWorkouts failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHealthKit(): HealthKitState {
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [todayDistance, setTodayDistance] = useState<number | null>(null);
  const [todayEnergy, setTodayEnergy] = useState<number | null>(null);
  const [todayFlights, setTodayFlights] = useState<number | null>(null);
  const [healthConnectStatus, setHealthConnectStatus] =
    useState<HealthConnectStatus | null>(null);
  // Bumped to re-run the authorization effect (Android only; never changes on iOS).
  const [authAttempt, setAuthAttempt] = useState(0);
  // Written only from the async callback below, never during render.
  const previousStatus = useRef<HealthConnectStatus | null>(null);

  const importWalks = useWalkStore((s) => s.importWalks);

  const refresh = useCallback(async () => {
    if (!authorized) return;
    await fetchTodayData(
      setTodaySteps,
      setTodayDistance,
      setTodayEnergy,
      setTodayFlights,
    );
  }, [authorized]);

  const syncWorkouts = useCallback(async () => {
    if (!authorized) return;
    await fetchAndSyncWorkouts(importWalks);
  }, [authorized, importWalks]);

  // Authorize → fetch today + sync historical workouts.
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      console.log("[useHealthKit] Calling authorizeHealthKit...");
      authorizeHealthKit()
        .then(async (result) => {
          if (cancelled) return;
          console.log("[useHealthKit] authorizeHealthKit result:", JSON.stringify(result));

          if (result.success) {
            console.log("[useHealthKit] HealthKit authorized, fetching today's data...");
            setAuthorized(true);
            setLastError(null);
            await fetchTodayData(
              setTodaySteps,
              setTodayDistance,
              setTodayEnergy,
              setTodayFlights,
            );
            await fetchAndSyncWorkouts(importWalks);
            console.log("[useHealthKit] Initial data fetch complete.");
          } else {
            // Authorization returned but was not successful.
            const msg = result.error ?? "HealthKit authorization was not granted.";
            console.warn("[useHealthKit] Authorization unsuccessful:", msg);
            setLastError(msg);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("[useHealthKit] authorizeHealthKit threw:", msg);
            setLastError(
              Platform.OS === "android"
                ? `Health Connect unavailable: ${msg}. Make sure you're running a dev-client build (not Expo Go) and Health Connect is installed.`
                : `HealthKit unavailable: ${msg}. Make sure you're running a dev-client build (not Expo Go) and the HealthKit entitlement is enabled.`,
            );
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [importWalks, authAttempt]);

  // Android only: Health Connect can be installed, updated or revoked while the
  // app is backgrounded, so re-check whenever the app returns to the foreground.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    let cancelled = false;

    async function check(fromForeground: boolean) {
      const status = await getHealthConnectStatus();
      if (cancelled) return;
      const previous = previousStatus.current;
      previousStatus.current = status;
      setHealthConnectStatus(status);

      if (!fromForeground || status !== "available") return;
      const permitted = await hasHealthConnectPermissions();
      if (cancelled) return;

      if (authorized && !permitted) {
        // Polling stops because Home's poll effect depends on `authorized`.
        setAuthorized(false);
        setLastError(
          "Health Connect access was turned off. Turn it back on in Health Connect settings.",
        );
      } else if (
        !authorized &&
        (permitted || (previous !== null && previous !== "available"))
      ) {
        // Access was granted in settings, or Health Connect was just installed
        // or updated: try authorizing again.
        setAuthAttempt((n) => n + 1);
      }
    }

    void check(false);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void check(true);
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [authorized]);

  return {
    authorized,
    isLoading,
    lastError,
    todaySteps,
    todayDistance,
    todayEnergy,
    todayFlights,
    healthConnectStatus,
    openHealthConnectInstall,
    refresh,
    syncWorkouts,
  };
}
