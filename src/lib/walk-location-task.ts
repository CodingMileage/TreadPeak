import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { appendLocations } from "@/lib/active-walk-store";
import { normalizeSpeed } from "@/lib/walk-geo";
import type { WalkPoint } from "@/lib/walk-geo";

/** Name of the background task that records walk GPS fixes. */
export const WALK_LOCATION_TASK = "treadpeak-walk-location";

interface WalkLocationTaskData {
  locations: Location.LocationObject[];
}

function toWalkPoint(location: Location.LocationObject): WalkPoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
    accuracy: location.coords.accuracy,
    speed: normalizeSpeed(location.coords.speed),
  };
}

// `defineTask` must run in the global scope of the bundle, not inside a React
// lifecycle: when iOS relaunches the app in the background no views mount.
// `src/app/_layout.tsx` imports this module for that reason.
TaskManager.defineTask<WalkLocationTaskData>(
  WALK_LOCATION_TASK,
  async ({ data, error }) => {
    if (error || !data?.locations?.length) return;
    await appendLocations(data.locations.map(toWalkPoint));
  },
);

/**
 * Start background GPS updates for a walk. Needs only "While Using" location
 * permission plus the `location` background mode: iOS shows its blue
 * background-location indicator and Android shows a foreground-service
 * notification, so the user always sees that recording is on.
 */
export async function startWalkLocationUpdates(): Promise<void> {
  if (await Location.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK)) return;

  await Location.startLocationUpdatesAsync(WALK_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    // Metres between fixes; also keeps standing still from producing fixes.
    distanceInterval: 5,
    // Android only.
    timeInterval: 3000,
    activityType: Location.ActivityType.Fitness,
    // expo-location's native default is `true`, which can silently stop a walk.
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "TreadPeak",
      notificationBody: "Recording your walk",
    },
  });
}

/** Stop background GPS updates. Safe to call when nothing is running. */
export async function stopWalkLocationUpdates(): Promise<void> {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(WALK_LOCATION_TASK);
    }
  } catch {
    // Already stopped or never started.
  }
}

/** Whether the background task is currently registered. */
export async function isWalkLocationRunning(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK);
  } catch {
    return false;
  }
}
