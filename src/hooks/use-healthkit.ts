import { useCallback, useEffect, useState } from "react";
import {
  authorizeHealthKit,
  getHealthData,
  getPlatformIdentifier,
} from "expo-healthkit-module";

import { createWalkEntry, useWalkStore } from "@/lib/walk-store";

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
  /** Today's total step count (from all sources), or `null` while loading. */
  todaySteps: number | null;
  /** Today's total walking + running distance in metres, or `null`. */
  todayDistance: number | null;
  /** Today's active energy burned in kcal, or `null`. */
  todayEnergy: number | null;
  /** Today's flights climbed, or `null`. */
  todayFlights: number | null;
  /** Re-fetch today's data from HealthKit. */
  refresh: () => Promise<void>;
  /** Pull historical workouts from HealthKit into the walk store. */
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

    const [stepRes, distRes, energyRes, flightsRes] = await Promise.all([
      getHealthData({
        identifier: getPlatformIdentifier("stepCount"),
        startDate,
        endDate,
      }),
      getHealthData({
        identifier: getPlatformIdentifier("distanceWalkingRunning"),
        startDate,
        endDate,
      }),
      getHealthData({
        identifier: getPlatformIdentifier("activeEnergyBurned"),
        startDate,
        endDate,
      }),
      getHealthData({
        identifier: getPlatformIdentifier("flightsClimbed"),
        startDate,
        endDate,
      }),
    ]);

    if (stepRes.success) setTodaySteps(Math.round(sumValues(stepRes.data)));
    if (distRes.success) {
      const km = sumValues(distRes.data);
      setTodayDistance(Math.round(km * 1000));
    }
    if (energyRes.success) setTodayEnergy(Math.round(sumValues(energyRes.data)));
    if (flightsRes.success) setTodayFlights(Math.round(sumValues(flightsRes.data)));
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
          distMetres > 0 ? Math.round(distMetres / 0.762) : 0;

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
              `HealthKit unavailable: ${msg}. Make sure you're running a dev-client build (not Expo Go) and the HealthKit entitlement is enabled.`,
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
  }, [importWalks]);

  return {
    authorized,
    isLoading,
    lastError,
    todaySteps,
    todayDistance,
    todayEnergy,
    todayFlights,
    refresh,
    syncWorkouts,
  };
}
