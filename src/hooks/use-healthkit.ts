import { useCallback, useEffect, useState } from "react";
import {
  authorizeHealthKit,
  getHealthData,
  createDateRange,
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
    const { startDate, endDate } = createDateRange("today");

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
  } catch {
    // Silent — HealthKit data is additive.
  }
}

/**
 * Fetch workouts from the past 30 days and merge them into the walk store.
 */
async function fetchAndSyncWorkouts(importWalks: (walks: ReturnType<typeof createWalkEntry>[]) => void) {
  try {
    const endDate = new Date().toISOString();
    const startDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();

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
  } catch {
    // Silent.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useHealthKit(): HealthKitState {
  const [authorized, setAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

    // Wrap in a macrotask so a crashing native module doesn't take down
    // the entire React root.
    const timer = setTimeout(() => {
      authorizeHealthKit()
        .then(async (result) => {
          if (cancelled) return;
          if (result.success) {
            setAuthorized(true);
            await fetchTodayData(
              setTodaySteps,
              setTodayDistance,
              setTodayEnergy,
              setTodayFlights,
            );
            await fetchAndSyncWorkouts(importWalks);
          }
        })
        .catch(() => {
          // Native module unavailable — HealthKit features will be skipped.
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
    todaySteps,
    todayDistance,
    todayEnergy,
    todayFlights,
    refresh,
    syncWorkouts,
  };
}
