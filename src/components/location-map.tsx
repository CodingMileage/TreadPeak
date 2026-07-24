import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import MapView, { Polyline, type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useHealthKit } from "@/hooks/use-healthkit";
import { useLocation } from "@/hooks/use-location";
import { usePedometer } from "@/hooks/use-pedometer";
import { createWalkEntry, useWalkStore } from "@/lib/walk-store";
import type { Coordinate } from "@/hooks/use-location";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_REGION: Region = {
  latitude: 39.8283,
  longitude: -98.5795,
  latitudeDelta: 40,
  longitudeDelta: 40,
};

const USER_ZOOM: Pick<Region, "latitudeDelta" | "longitudeDelta"> = {
  latitudeDelta: 0.005,
  longitudeDelta: 0.005,
};

const TRACE_COLOR = "#208AEF";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LocationMapProps {
  initialRegion?: Region;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function haversineDistance(a: Coordinate, b: Coordinate): number {
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

function totalDistance(coords: Coordinate[]): number {
  if (coords.length < 2) return 0;
  let d = 0;
  for (let i = 1; i < coords.length; i++) {
    d += haversineDistance(coords[i - 1], coords[i]);
  }
  return d;
}

function formatDistance(metres: number): string {
  if (metres < 1) return "0 m";
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

function formatSteps(steps: number): string {
  if (steps < 1000) return String(steps);
  return `${(steps / 1000).toFixed(1)}k`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PermissionDeniedView({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
      <Text className="mb-3 text-center text-lg font-semibold text-black dark:text-white">
        Location Access Required
      </Text>
      <Text className="mb-6 text-center text-sm leading-5 text-gray-600 dark:text-gray-400">
        TreadPeak needs your location to show your current position on the
        map. You can enable location access in your device settings.
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          onPress={onRetry}
          className="rounded-lg bg-blue-500 px-5 py-3 active:opacity-80"
        >
          <Text className="font-semibold text-white">Try Again</Text>
        </Pressable>
        <Pressable
          onPress={() => Linking.openSettings()}
          className="rounded-lg bg-gray-200 px-5 py-3 active:opacity-80 dark:bg-neutral-700"
        >
          <Text className="font-semibold text-black dark:text-white">
            Open Settings
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function LoadingOverlay() {
  return (
    <View className="absolute inset-0 items-center justify-center bg-white/70 dark:bg-black/70">
      <View className="h-10 w-10 animate-pulse rounded-full bg-blue-500/30" />
      <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
        Locating you…
      </Text>
    </View>
  );
}

function ErrorBanner({
  message,
  onRetry,
  topOffset,
}: {
  message: string;
  onRetry: () => void;
  topOffset: number;
}) {
  return (
    <View
      className="absolute left-4 right-4 z-10 rounded-xl bg-red-50 p-4 dark:bg-red-900/30"
      style={{ top: topOffset }}
    >
      <Text className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        className="self-start rounded-md bg-red-500 px-3 py-1.5 active:opacity-80"
      >
        <Text className="text-xs font-semibold text-white">Retry</Text>
      </Pressable>
    </View>
  );
}

/** Daily summary drawn from HealthKit / Health Connect. */
function DailyStats({
  steps,
  distance,
  energy,
  topOffset,
}: {
  steps: number | null;
  distance: number | null;
  energy: number | null;
  topOffset: number;
}) {
  return (
    <View
      className="absolute left-4 right-4 z-10 flex-row justify-center gap-5 rounded-xl bg-white/90 px-4 py-3 shadow-lg dark:bg-black/80"
      style={{ top: topOffset }}
    >
      <View className="items-center">
        <Text className="text-lg font-bold text-black dark:text-white">
          {steps != null ? formatSteps(steps) : "--"}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Steps Today
        </Text>
      </View>
      <View className="w-px bg-gray-300 dark:bg-neutral-600" />
      <View className="items-center">
        <Text className="text-lg font-bold text-black dark:text-white">
          {distance != null ? formatDistance(distance) : "--"}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Distance
        </Text>
      </View>
      <View className="w-px bg-gray-300 dark:bg-neutral-600" />
      <View className="items-center">
        <Text className="text-lg font-bold text-black dark:text-white">
          {energy != null ? `${energy} kcal` : "--"}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Calories
        </Text>
      </View>
    </View>
  );
}

function WalkStats({
  distanceMetres,
  elapsedSeconds,
  steps,
  topOffset,
}: {
  distanceMetres: number;
  elapsedSeconds: number;
  steps: number;
  topOffset: number;
}) {
  return (
    <View
      className="absolute left-4 right-4 z-10 flex-row justify-center gap-5 rounded-xl bg-white/90 px-4 py-3 shadow-lg dark:bg-black/80"
      style={{ top: topOffset }}
    >
      <View className="items-center">
        <Text className="text-lg font-bold text-black dark:text-white">
          {formatDistance(distanceMetres)}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Distance
        </Text>
      </View>
      <View className="w-px bg-gray-300 dark:bg-neutral-600" />
      <View className="items-center">
        <Text className="text-lg font-bold text-black dark:text-white">
          {formatDuration(elapsedSeconds)}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Duration
        </Text>
      </View>
      <View className="w-px bg-gray-300 dark:bg-neutral-600" />
      <View className="items-center">
        <Text className="text-lg font-bold text-black dark:text-white">
          {formatSteps(steps)}
        </Text>
        <Text className="text-xs text-gray-500 dark:text-gray-400">
          Steps
        </Text>
      </View>
    </View>
  );
}

function TrackButton({
  isTracking,
  label,
  disabled,
  onPress,
  bottomOffset,
}: {
  isTracking: boolean;
  label: string;
  disabled: boolean;
  onPress: () => void;
  bottomOffset: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`absolute left-1/2 z-10 -translate-x-1/2 rounded-full px-8 py-4 shadow-lg active:opacity-80 ${
        isTracking ? "bg-red-500" : "bg-[#208AEF]"
      } ${disabled ? "opacity-50" : ""}`}
      style={{ bottom: bottomOffset, elevation: 8 }}
    >
      <Text className="text-base font-bold text-white">{label}</Text>
    </Pressable>
  );
}

function ReCenterButton({
  onPress,
  bottomOffset,
}: {
  onPress: () => void;
  bottomOffset: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute right-4 z-10 rounded-full bg-white px-4 py-2.5 shadow-lg active:opacity-80 dark:bg-neutral-800"
      style={{ bottom: bottomOffset, elevation: 6 }}
    >
      <Text className="text-sm font-semibold text-blue-500">Re-center</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LocationMap({
  initialRegion = DEFAULT_REGION,
}: LocationMapProps) {
  const {
    location,
    permissionStatus,
    error,
    isLoading,
    requestPermission,
    isTracking,
    isAutoTracking,
    startTracking,
    stopTracking,
    pathCoordinates,
  } = useLocation();

  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userHasPanned, setUserHasPanned] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevIsTracking = useRef(false);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const addWalk = useWalkStore((s) => s.addWalk);
  const { todaySteps, todayDistance, todayEnergy, syncWorkouts } =
    useHealthKit();

  // Sync HealthKit workouts into the walk history on mount.
  useEffect(() => {
    syncWorkouts();
  }, [syncWorkouts]);

  // Position overlays so they don't clash with the large header or tab bar.
  const statsTop = insets.top + 104;
  const buttonBottom = insets.bottom + 64;

  // Distance derived from the polyline path.
  const distanceMetres = useMemo(
    () => totalDistance(pathCoordinates),
    [pathCoordinates],
  );

  // Hardware pedometer (with distance-based fallback).
  const { steps, reset: resetPedometer } = usePedometer(distanceMetres);

  // ---- Timer ---------------------------------------------------------------
  useEffect(() => {
    if (isTracking) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking]);

  // ---- Auto-save on walk end -----------------------------------------------
  useEffect(() => {
    // Walk just started — capture the timestamp and reset counters.
    if (!prevIsTracking.current && isTracking) {
      setStartedAt(new Date().toISOString());
      setElapsedSeconds(0);
      resetPedometer();
    }

    // Walk just ended (auto or manual) — save if it meets minimums.
    if (prevIsTracking.current && !isTracking) {
      const minDistance = 50; // metres
      const minDuration = 60; // seconds

      if (
        startedAt &&
        pathCoordinates.length > 1 &&
        distanceMetres >= minDistance &&
        elapsedSeconds >= minDuration
      ) {
        addWalk(
          createWalkEntry({
            startedAt,
            endedAt: new Date().toISOString(),
            durationSeconds: elapsedSeconds,
            distanceMetres: Math.round(distanceMetres),
            steps,
            pathCoordinates,
          }),
        );
      }
    }

    prevIsTracking.current = isTracking;
    // Only run when isTracking toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTracking]);

  // ---- Handlers ------------------------------------------------------------

  const handlePanDrag = useCallback(() => {
    setUserHasPanned(true);
  }, []);

  const handleReCenter = useCallback(() => {
    if (!location) return;
    setUserHasPanned(false);
    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...USER_ZOOM,
      },
      500,
    );
  }, [location]);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  const handleStartWalk = useCallback(() => {
    startTracking();
  }, [startTracking]);

  const handleStopWalk = useCallback(() => {
    stopTracking();
  }, [stopTracking]);

  // ---- Auto-follow effect --------------------------------------------------

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!location || !mapReady || userHasPanned) return;

    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        ...USER_ZOOM,
      },
      1000,
    );
  }, [location, mapReady, userHasPanned]);

  // ---- Render --------------------------------------------------------------

  if (permissionStatus === "denied") {
    return <PermissionDeniedView onRetry={requestPermission} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={permissionStatus === "granted"}
        userInterfaceStyle={
          colorScheme === "dark" ? "dark" : "light"
        }
        onMapReady={handleMapReady}
        onPanDrag={handlePanDrag}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {pathCoordinates.length > 1 && (
          <Polyline
            coordinates={pathCoordinates}
            strokeColor={TRACE_COLOR}
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}
      </MapView>

      {/* Daily HealthKit summary (idle state) */}
      {!isTracking && !isLoading && (
        <DailyStats
          steps={todaySteps}
          distance={todayDistance}
          energy={todayEnergy}
          topOffset={statsTop}
        />
      )}

      {/* Live walk stats (tracking state) */}
      {isTracking && (
        <WalkStats
          distanceMetres={distanceMetres}
          elapsedSeconds={elapsedSeconds}
          steps={steps}
          topOffset={statsTop}
        />
      )}

      {isLoading && <LoadingOverlay />}

      {error && !isTracking && (
        <ErrorBanner
          message={error}
          onRetry={requestPermission}
          topOffset={statsTop}
        />
      )}

      {permissionStatus === "granted" && !isLoading && (
        <TrackButton
          isTracking={isTracking}
          label={
            isTracking
              ? isAutoTracking
                ? "Stop Tracking"
                : "Stop Walk"
              : "Start Walk"
          }
          disabled={!location}
          onPress={isTracking ? handleStopWalk : handleStartWalk}
          bottomOffset={buttonBottom}
        />
      )}

      {permissionStatus === "granted" && !isLoading && userHasPanned && (
        <ReCenterButton
          onPress={handleReCenter}
          bottomOffset={buttonBottom}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
