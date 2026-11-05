import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
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
import { useWalkLiveActivity } from "@/hooks/use-walk-live-activity";
import { pathDistance } from "@/lib/walk-geo";

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

/** Live walk stats pushed upward so the parent can display them. */
export interface WalkStatsSnapshot {
  isTracking: boolean;
  steps: number;
  distanceMetres: number;
  elapsedSeconds: number;
}

export interface LocationMapProps {
  initialRegion?: Region;
  /** Called whenever the live walk stats change (tracking start / update / stop). */
  onWalkStateChange?: (snapshot: WalkStatsSnapshot | null) => void;
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
  onWalkStateChange,
}: LocationMapProps) {
  const {
    location,
    permissionStatus,
    error,
    isLoading,
    requestPermission,
    isTracking,
    isAutoTracking,
    startedAtMs,
    startTracking,
    stopTracking,
    pathCoordinates,
  } = useLocation();

  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [userHasPanned, setUserHasPanned] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { syncWorkouts } = useHealthKit();

  // Sync HealthKit workouts into the walk history on mount.
  useEffect(() => {
    syncWorkouts();
  }, [syncWorkouts]);

  // Position overlays so they don't clash with the large header or tab bar.
  const statsTop = insets.top + 104;
  const buttonBottom = insets.bottom + 64;

  // Distance derived from the (already accuracy-filtered) path.
  const distanceMetres = useMemo(
    () => pathDistance(pathCoordinates),
    [pathCoordinates],
  );

  // Steps since the walk started, read from the pedometer history so they
  // survive a force quit (with a distance-based fallback).
  const { steps } = usePedometer(
    distanceMetres,
    isTracking ? startedAtMs : null,
  );

  // Mirror the active walk into the iOS Live Activity.
  useWalkLiveActivity({ isTracking, steps, distanceMetres, startedAtMs });

  // ---- Clock ---------------------------------------------------------------
  // Elapsed time is derived from the walk's start timestamp, so it stays
  // correct after the app was suspended or relaunched. The interval only
  // re-renders the screen; it is never the source of truth.
  useEffect(() => {
    if (!isTracking) return;

    const id = setInterval(() => setNow(Date.now()), 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [isTracking]);

  const elapsedSeconds =
    isTracking && startedAtMs !== null
      ? Math.max(0, Math.floor((now - startedAtMs) / 1000))
      : 0;

  // ---- Push live walk stats upward ------------------------------------------

  useEffect(() => {
    if (onWalkStateChange) {
      onWalkStateChange(
        isTracking
          ? { isTracking: true, steps, distanceMetres, elapsedSeconds }
          : null,
      );
    }
  }, [isTracking, steps, distanceMetres, elapsedSeconds, onWalkStateChange]);

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
