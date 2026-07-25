import { Pedometer } from "expo-sensors";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AppStateStatus } from "react-native";
import { AppState, Text, View } from "react-native";

import type { WalkStatsSnapshot } from "@/components/location-map";
import { LocationMap } from "@/components/location-map";
import { useHealthKit } from "@/hooks/use-healthkit";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Average walking stride length in metres (2.5 ft). */
const AVG_STRIDE_M = 0.762;
/** Rough calorie burn rate for walking: ~50 kcal per km. */
const CALORIES_PER_M = 0.05;
/** Metres → feet multiplier. */
const FT_PER_M = 3.28084;
/** Feet in a mile. */
const FT_PER_MI = 5280;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSteps(steps: number): string {
  if (steps < 1000) return steps.toLocaleString();
  return `${(steps / 1000).toFixed(1)}k`;
}

function formatDistance(metres: number): string {
  const ft = Math.round(metres * FT_PER_M);
  if (ft < FT_PER_MI) return `${ft} ft`;
  return `${(ft / FT_PER_MI).toFixed(1)} mi`;
}

/** Estimate distance from step count using average stride length. */
function stepsToDistance(steps: number): number {
  return Math.round(steps * AVG_STRIDE_M);
}

/** Estimate calories burned from distance in metres. */
function distanceToCalories(metres: number): number {
  return Math.round(metres * CALORIES_PER_M);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Horizontal stat bar shown above the map.
 *
 * When a walk is in progress it displays live walk data (steps, distance,
 * estimated calories). When idle it displays today's totals — HealthKit /
 * Health Connect data takes priority, with pedometer estimates as fallback.
 */
/** Format a Date as mm/dd/yy (e.g. "07/25/26"). */
function formatDate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const y = String(date.getFullYear()).slice(-2);
  return `${m}/${d}/${y}`;
}

function DailyStatsCard({
  isTracking,
  liveSteps,
  liveDistance,
  liveCalories,
  dailySteps,
  dailyDistance,
  dailyEnergy,
}: {
  isTracking: boolean;
  liveSteps: number;
  liveDistance: number;
  liveCalories: number;
  dailySteps: number | null;
  dailyDistance: number | null;
  dailyEnergy: number | null;
}) {
  const steps = isTracking ? liveSteps : dailySteps;
  const distance = isTracking ? liveDistance : dailyDistance;
  const calories = isTracking ? liveCalories : dailyEnergy;

  return (
    <View className="items-center px-4 py-3">
      <Text className="mb-2 text-xs font-medium tracking-wide text-neutral-400 dark:text-neutral-500">
        {formatDate(new Date())}
      </Text>
      <View className="flex-row items-center justify-center gap-6">
        {/* Steps */}
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">
            {steps != null ? formatSteps(steps) : "--"}
          </Text>
          <Text className="text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
            STEPS
          </Text>
        </View>

        <View className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />

        {/* Distance */}
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">
            {distance != null ? formatDistance(distance) : "--"}
          </Text>
          <Text className="text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
            DISTANCE
          </Text>
        </View>

        <View className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />

        {/* Calories */}
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">
            {calories != null ? calories.toLocaleString() : "--"}
          </Text>
          <Text className="text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
            CALORIES
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

/**
 * Home screen — the landing tab of the app.
 *
 * Shows a daily stats card (steps, distance, calories) above a realtime map.
 *
 * **Data sources (priority order):**
 * 1. HealthKit / Health Connect — accurate, device-wide totals
 * 2. Pedometer fallback — `Pedometer.getStepCountAsync` estimates distance
 *    and calories from step count when HealthKit is unavailable
 *
 * While a walk is in progress the card switches to live walk data.
 */
export default function HomeScreen() {
  const {
    authorized,
    lastError,
    todaySteps,
    todayDistance,
    todayEnergy,
    refresh,
  } = useHealthKit();

  // Pedometer fallback — used when HealthKit / Health Connect data is
  // unavailable (e.g. Expo Go, simulator, or authorization not yet granted).
  const [pedometerSteps, setPedometerSteps] = useState<number | null>(null);

  const fetchPedometerSteps = useCallback(async () => {
    try {
      const available = await Pedometer.isAvailableAsync();
      if (!available) return;

      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
      );

      const result = await Pedometer.getStepCountAsync(startOfDay, now);
      if (result) {
        setPedometerSteps(result.steps);
      }
    } catch {
      // Pedometer unavailable — silently skip.
    }
  }, []);

  // Live walk state pushed up from LocationMap.
  const [walkState, setWalkState] = useState<WalkStatsSnapshot | null>(null);

  const handleWalkStateChange = useCallback(
    (snapshot: WalkStatsSnapshot | null) => {
      setWalkState(snapshot);
    },
    [],
  );

  const isTracking = walkState?.isTracking ?? false;
  const liveSteps = walkState?.steps ?? 0;
  const liveDistance = walkState?.distanceMetres ?? 0;
  const liveCalories = distanceToCalories(liveDistance);

  // Merge pedometer and HealthKit data.
  //
  // Pedometer leads everywhere — it updates every 5 s from the motion
  // coprocessor so the stats card always feels live. HealthKit serves as
  // a fallback when the pedometer is unavailable (e.g. iPads without the
  // dedicated chip, or a simulator).
  const pedoDistance =
    pedometerSteps != null ? stepsToDistance(pedometerSteps) : null;
  const pedoCalories =
    pedoDistance != null ? distanceToCalories(pedoDistance) : null;

  const dailySteps = pedometerSteps ?? todaySteps;
  const dailyDistance = pedoDistance ?? todayDistance;
  const dailyEnergy = pedoCalories ?? todayEnergy;

  // Fetch pedometer on mount, then poll every 5 s while the screen is mounted.
  // The motion coprocessor read is cheap — always poll regardless of tracking
  // state so daily totals stay fresh even when a walk just ended.
  useEffect(() => {
    fetchPedometerSteps();
    const id = setInterval(fetchPedometerSteps, 5_000);
    return () => clearInterval(id);
  }, [fetchPedometerSteps]);

  // Poll HealthKit every 30 s when authorized for fresher distance / calories.
  useEffect(() => {
    if (!authorized) return;
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [authorized, refresh]);

  // Refetch both sources when the app returns to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active") {
        fetchPedometerSteps();
        if (authorized) refresh();
      }
    });
    return () => sub.remove();
  }, [authorized, refresh, fetchPedometerSteps]);

  // When a walk ends, refetch daily totals so the stats card reflects the
  // steps / distance / calories that were just accumulated.
  const wasTracking = useRef(false);
  useEffect(() => {
    if (wasTracking.current && !isTracking) {
      // Walk just ended — pull fresh daily totals.
      fetchPedometerSteps();
      if (authorized) refresh();
    }
    wasTracking.current = isTracking;
  }, [isTracking, authorized, refresh, fetchPedometerSteps]);

  return (
    <View style={{ flex: 1 }}>
      <DailyStatsCard
        isTracking={isTracking}
        liveSteps={liveSteps}
        liveDistance={liveDistance}
        liveCalories={liveCalories}
        dailySteps={dailySteps}
        dailyDistance={dailyDistance}
        dailyEnergy={dailyEnergy}
      />

      {/* HealthKit status indicator */}
      {/* {lastError ? (
        <View className="mx-4 mb-1 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/30">
          <Text className="text-xs text-amber-800 dark:text-amber-200">
            {lastError}
          </Text>
        </View>
      ) : authorized ? (
        <View className="mx-4 mb-1 flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <Text className="text-xs text-emerald-600 dark:text-emerald-400">
            HealthKit connected
          </Text>
        </View>
      ) : null} */}

      <View style={{ flex: 1 }}>
        <LocationMap onWalkStateChange={handleWalkStateChange} />
      </View>
    </View>
  );
}
