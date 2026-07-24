import { useMemo, useRef } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import MapView, { Polyline, type Region } from "react-native-maps";
import { useLocalSearchParams } from "expo-router";

import { useWalkStore } from "@/lib/walk-store";
import type { Coordinate } from "@/hooks/use-location";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRACE_COLOR = "#208AEF";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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
  return steps.toLocaleString();
}

/**
 * Compute a bounding region that fits all coordinates with padding.
 * Returns `null` when there aren't enough coordinates.
 */
function regionForCoordinates(coords: Coordinate[]): Region | null {
  if (coords.length === 0) return null;

  let minLat = coords[0].latitude;
  let maxLat = coords[0].latitude;
  let minLon = coords[0].longitude;
  let maxLon = coords[0].longitude;

  for (const c of coords) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLon) minLon = c.longitude;
    if (c.longitude > maxLon) maxLon = c.longitude;
  }

  const latDelta = (maxLat - minLat) * 1.4 || 0.005;
  const lonDelta = (maxLon - minLon) * 1.4 || 0.005;

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max(latDelta, 0.002),
    longitudeDelta: Math.max(lonDelta, 0.002),
  };
}

// ---------------------------------------------------------------------------
// Stats Card
// ---------------------------------------------------------------------------

function StatsCard({
  distanceMetres,
  durationSeconds,
  steps,
  startedAt,
  endedAt,
}: {
  distanceMetres: number;
  durationSeconds: number;
  steps: number;
  startedAt: string;
  endedAt: string;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View
      className={`rounded-t-2xl px-6 pb-8 pt-5 ${
        isDark ? "bg-neutral-900" : "bg-white"
      }`}
      style={styles.cardShadow}
    >
      {/* Date + time */}
      <Text
        className={`mb-1 text-sm ${
          isDark ? "text-gray-400" : "text-gray-500"
        }`}
      >
        {formatDate(startedAt)}
      </Text>
      <Text className="mb-5 text-sm text-gray-400">
        {formatTime(startedAt)} – {formatTime(endedAt)}
      </Text>

      {/* Stats row */}
      <View className="flex-row justify-around">
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">
            {formatDistance(distanceMetres)}
          </Text>
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Distance
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">
            {formatDuration(durationSeconds)}
          </Text>
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Duration
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-2xl font-bold text-black dark:text-white">
            {formatSteps(steps)}
          </Text>
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Steps
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Walk detail screen — shows a past walk's route on a map with a stats
 * card below.
 *
 * Route param: `[id]` — the walk entry ID. The screen reads the full walk
 * data from `useWalkStore`.
 */
export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const walk = useWalkStore((s) => s.walks.find((w) => w.id === id));
  const colorScheme = useColorScheme();
  const mapRef = useRef<MapView>(null);

  // Compute a region that fits the entire trail.
  const initialRegion = useMemo(
    () => (walk ? regionForCoordinates(walk.pathCoordinates) : null),
    [walk],
  );

  // Not found — malformed or deleted walk.
  if (!walk) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-black">
        <Text className="text-center text-lg font-semibold text-black dark:text-white">
          Walk not found
        </Text>
        <Text className="mt-2 text-center text-sm text-gray-500">
          This walk may have been deleted.
        </Text>
      </View>
    );
  }

  const hasTrail = walk.pathCoordinates.length > 1;
  const isDark = colorScheme === "dark";

  // HealthKit walk — no GPS trail, show full-screen stats.
  if (!hasTrail) {
    return (
      <View
        className={`flex-1 items-center justify-center px-6 ${
          isDark ? "bg-black" : "bg-gray-50"
        }`}
      >
        <View className="mb-4 rounded-full bg-green-100 px-4 py-1.5 dark:bg-green-800">
          <Text className="text-sm font-medium text-green-700 dark:text-green-200">
            Imported from Health
          </Text>
        </View>
        <StatsCard
          distanceMetres={walk.distanceMetres}
          durationSeconds={walk.durationSeconds}
          steps={walk.steps}
          startedAt={walk.startedAt}
          endedAt={walk.endedAt}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion ?? undefined}
        userInterfaceStyle={colorScheme === "dark" ? "dark" : "light"}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Polyline
          coordinates={walk.pathCoordinates}
          strokeColor={TRACE_COLOR}
          strokeWidth={4}
          lineJoin="round"
          lineCap="round"
        />
      </MapView>

      <StatsCard
        distanceMetres={walk.distanceMetres}
        durationSeconds={walk.durationSeconds}
        steps={walk.steps}
        startedAt={walk.startedAt}
        endedAt={walk.endedAt}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    flex: 1,
  },
  cardShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
});
