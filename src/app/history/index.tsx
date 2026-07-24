import { useCallback } from "react";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useWalkStore } from "@/lib/walk-store";
import type { WalkEntry } from "@/lib/walk-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
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

// ---------------------------------------------------------------------------
// Walk Row
// ---------------------------------------------------------------------------

function WalkRow({ walk }: { walk: WalkEntry }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Pressable
      onPress={() => router.push(`/history/${walk.id}`)}
      className={`mx-4 mb-3 rounded-xl px-5 py-4 shadow-sm active:opacity-70 ${
        isDark ? "bg-neutral-800" : "bg-white"
      }`}
      style={styles.card}
    >
      {/* Date + time */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-base font-semibold text-black dark:text-white">
            {formatDate(walk.startedAt)}
          </Text>
          {walk.source === "healthkit" && (
            <View className="rounded-full bg-green-100 px-2 py-0.5 dark:bg-green-800">
              <Text className="text-xs font-medium text-green-700 dark:text-green-200">
                Health
              </Text>
            </View>
          )}
        </View>
        <Text className="text-sm text-gray-500 dark:text-gray-400">
          {formatTime(walk.startedAt)} – {formatTime(walk.endedAt)}
        </Text>
      </View>

      {/* Stats row */}
      <View className="flex-row justify-between">
        <View className="items-center">
          <Text className="text-xl font-bold text-black dark:text-white">
            {formatDistance(walk.distanceMetres)}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Distance
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-black dark:text-white">
            {formatDuration(walk.durationSeconds)}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Duration
          </Text>
        </View>
        <View className="items-center">
          <Text className="text-xl font-bold text-black dark:text-white">
            {formatSteps(walk.steps)}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            Steps
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="mb-2 text-center text-lg font-semibold text-black dark:text-white">
        No walks yet
      </Text>
      <Text className="text-center text-sm leading-5 text-gray-500 dark:text-gray-400">
        Start a walk from the home screen to see your history here.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/**
 * Walk history screen — lists all completed walks, newest first.
 *
 * Accessible from the home tab header. Each row shows the date, time range,
 * and three key stats (distance, duration, steps).
 */
export default function WalkHistoryScreen() {
  const walks = useWalkStore((s) => s.walks);

  const renderItem = useCallback(
    ({ item }: { item: WalkEntry }) => <WalkRow walk={item} />,
    [],
  );

  const keyExtractor = useCallback((item: WalkEntry) => item.id, []);

  return (
    <View style={styles.container} className="bg-gray-50 dark:bg-black">
      <FlashList
        data={walks}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={EmptyState}
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
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    elevation: 2,
  },
});
