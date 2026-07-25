import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

import { useHealthKit } from "@/hooks/use-healthkit";
import { useWalkStore } from "@/lib/walk-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${m}/${d}`;
}

/**
 * Return the start of the current week (Monday at midnight) as epoch ms.
 */
function startOfWeekMs(): number {
  const now = new Date();
  const day = now.getDay();
  // day 0 = Sunday → Monday offset: 0 → -6, 1 → 0, 2 → -1, …, 6 → -5
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + mondayOffset,
  );
  return monday.getTime();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Large avatar placeholder shown at the top of the profile.
 *
 * Uses an SF Symbol person icon in a circle — real user avatars will
 * replace this once auth is wired up.
 */
function AvatarPlaceholder() {
  return (
    <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
      <Text className="text-4xl">🚶</Text>
    </View>
  );
}

/**
 * Horizontal stat row — used for both weekly and all-time summaries.
 */
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <View className="items-center">
      <Text className="text-xl font-bold text-black dark:text-white">
        {value}
      </Text>
      <Text className="text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
    </View>
  );
}

function StatDivider() {
  return <View className="h-8 w-px bg-neutral-200 dark:bg-neutral-700" />;
}

/**
 * A single recent walk row.
 */
function WalkRow({
  distanceMetres,
  durationSeconds,
  steps,
  startedAt,
}: {
  distanceMetres: number;
  durationSeconds: number;
  steps: number;
  startedAt: string;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-800/60">
      <View className="flex-1">
        <Text className="text-sm font-semibold text-black dark:text-white">
          {formatDateLabel(startedAt)}
        </Text>
        <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {formatSteps(steps)} steps
        </Text>
      </View>

      <View className="flex-row items-center gap-4">
        <View className="items-end">
          <Text className="text-sm font-semibold text-black dark:text-white">
            {formatDistance(distanceMetres)}
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            distance
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-semibold text-black dark:text-white">
            {formatDuration(durationSeconds)}
          </Text>
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            time
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
 * Profile screen — the user's identity and activity hub.
 *
 * Shows weekly stats, all-time totals, recent walk history, and a link to
 * app settings. Data is sourced from the persisted walk store (GPS + HealthKit
 * workouts) and live HealthKit daily totals.
 */
export default function ProfileScreen() {
  const walks = useWalkStore((s) => s.walks);
  const { todaySteps, todayDistance, todayEnergy } = useHealthKit();

  // ---- Weekly stats --------------------------------------------------------

  const weeklyStats = useMemo(() => {
    const weekStart = startOfWeekMs();
    const weekWalks = walks.filter(
      (w) => new Date(w.startedAt).getTime() >= weekStart,
    );

    const totalSteps = weekWalks.reduce((sum, w) => sum + w.steps, 0);
    const totalDistance = weekWalks.reduce(
      (sum, w) => sum + w.distanceMetres,
      0,
    );
    const totalCalories = weekWalks.reduce(
      (sum, w) =>
        sum + (w.calories ?? 0) + Math.round(w.distanceMetres * CALORIES_PER_M),
      0,
    );

    return {
      walks: weekWalks.length,
      steps: totalSteps,
      distance: totalDistance,
      calories: totalCalories,
    };
  }, [walks]);

  // ---- All-time stats ------------------------------------------------------

  const allTimeStats = useMemo(() => {
    const totalWalks = walks.length;
    const totalDistance = walks.reduce((sum, w) => sum + w.distanceMetres, 0);
    const totalSteps = walks.reduce((sum, w) => sum + w.steps, 0);

    // Best day — group by date string
    const byDay = new Map<string, number>();
    for (const w of walks) {
      const day = w.startedAt.slice(0, 10); // "YYYY-MM-DD"
      byDay.set(day, (byDay.get(day) ?? 0) + w.steps);
    }
    let bestDaySteps = 0;
    for (const steps of byDay.values()) {
      if (steps > bestDaySteps) bestDaySteps = steps;
    }

    return { totalWalks, totalDistance, totalSteps, bestDaySteps };
  }, [walks]);

  // ---- Recent walks (last 5) -----------------------------------------------

  const recentWalks = useMemo(() => walks.slice(0, 5), [walks]);

  // ---- Render --------------------------------------------------------------

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      contentContainerClassName="pb-12"
      showsVerticalScrollIndicator={false}
    >
      {/* ----- Profile header ----- */}
      <View className="items-center px-4 pt-8">
        <AvatarPlaceholder />
        <Text className="text-2xl font-bold text-black dark:text-white">
          You
        </Text>
        <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Let{"'"}s get moving 🏃‍♂️
        </Text>
      </View>

      {/* ----- This Week ----- */}
      <View className="mt-8 px-4">
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          This Week
        </Text>

        <View className="flex-row items-center justify-center gap-6 rounded-2xl bg-neutral-50 px-4 py-4 dark:bg-neutral-900/50">
          <StatItem value={formatSteps(weeklyStats.steps)} label="STEPS" />
          <StatDivider />
          <StatItem
            value={formatDistance(weeklyStats.distance)}
            label="DISTANCE"
          />
          <StatDivider />
          <StatItem
            value={weeklyStats.calories.toLocaleString()}
            label="CALORIES"
          />
          <StatDivider />
          <StatItem value={String(weeklyStats.walks)} label="WALKS" />
        </View>
      </View>

      {/* ----- All-Time ----- */}
      <View className="mt-6 px-4">
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          All-Time
        </Text>

        <View className="flex-row items-center justify-center gap-6 rounded-2xl bg-neutral-50 px-4 py-4 dark:bg-neutral-900/50">
          <StatItem
            value={String(allTimeStats.totalWalks)}
            label="TOTAL WALKS"
          />
          <StatDivider />
          <StatItem
            value={formatDistance(allTimeStats.totalDistance)}
            label="TOTAL DIST"
          />
          <StatDivider />
          <StatItem
            value={formatSteps(allTimeStats.bestDaySteps)}
            label="BEST DAY"
          />
        </View>
      </View>

      {/* ----- Today ----- */}
      <View className="mt-6 px-4">
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Today (Health)
        </Text>

        <View className="flex-row items-center justify-center gap-6 rounded-2xl bg-emerald-50 px-4 py-4 dark:bg-emerald-900/20">
          <StatItem
            value={todaySteps != null ? formatSteps(todaySteps) : "--"}
            label="STEPS"
          />
          <StatDivider />
          <StatItem
            value={todayDistance != null ? formatDistance(todayDistance) : "--"}
            label="DISTANCE"
          />
          <StatDivider />
          <StatItem
            value={todayEnergy != null ? todayEnergy.toLocaleString() : "--"}
            label="CALORIES"
          />
        </View>
      </View>

      {/* ----- Recent Walks ----- */}
      <View className="mt-8 px-4">
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
          Recent Walks
        </Text>

        {recentWalks.length === 0 ? (
          <View className="items-center rounded-2xl bg-neutral-50 px-4 py-10 dark:bg-neutral-900/50">
            <Text className="text-3xl">👟</Text>
            <Text className="mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              No walks yet
            </Text>
            <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Start a walk from the Home tab to see it here
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {recentWalks.map((walk) => (
              <WalkRow
                key={walk.id}
                distanceMetres={walk.distanceMetres}
                durationSeconds={walk.durationSeconds}
                steps={walk.steps}
                startedAt={walk.startedAt}
              />
            ))}
          </View>
        )}
      </View>

      {/* ----- Settings ----- */}
      {/* <View className="mt-8 px-4">
        <Link
          href="/settings"
          className="flex-row items-center justify-between rounded-2xl bg-neutral-50 px-4 py-4 active:opacity-80 dark:bg-neutral-900/50"
        >
          <View className="flex-row items-center gap-3">
            <Text className="text-lg">⚙️</Text>
            <Text className="text-base font-semibold text-black dark:text-white">
              Settings
            </Text>
          </View>
          <Text className="text-neutral-400 dark:text-neutral-500">›</Text>
        </Link>
      </View> */}
    </ScrollView>
  );
}
