import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
  LocationAccuracy,
} from "expo-location";
import type { LocationObject, LocationSubscription } from "expo-location";

import {
  beginActiveWalk,
  discardActiveWalk,
  endActiveWalk,
  finalizeActiveWalk,
  hydrateActiveWalk,
  useActiveWalkStore,
} from "@/lib/active-walk-store";
import { normalizeSpeed } from "@/lib/walk-geo";
import type { Coordinate } from "@/lib/walk-geo";
import {
  isWalkLocationRunning,
  startWalkLocationUpdates,
  stopWalkLocationUpdates,
} from "@/lib/walk-location-task";

export type { Coordinate } from "@/lib/walk-geo";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocationPermissionStatus =
  | "undetermined"
  | "granted"
  | "denied";

export interface UseLocationResult {
  /** The latest location fix, or `null` while loading / before first fix. */
  location: LocationObject | null;
  /** Current permission state. */
  permissionStatus: LocationPermissionStatus;
  /** Human-readable error message, or `null` when there is no error. */
  error: string | null;
  /** `true` while permission is being requested or the first fix is pending. */
  isLoading: boolean;
  /** Call to retry after a denial or error. Re-requests permission. */
  requestPermission: () => Promise<void>;
  /** Whether a walk is being recorded (in the foreground or background). */
  isTracking: boolean;
  /** Whether the current walk was started automatically. */
  isAutoTracking: boolean;
  /** Epoch ms when the current walk started, or `null` when not tracking. */
  startedAtMs: number | null;
  /** Starts recording a walk, including while the screen is locked. */
  startTracking: () => void;
  /** Stops the walk; it is saved to history if it is long enough. */
  stopTracking: () => void;
  /** Throws away the walk in progress without saving it. */
  clearPath: () => void;
  /** Accepted GPS fixes of the current walk, oldest first. */
  pathCoordinates: Coordinate[];
  /** Current speed in m/s (from GPS), or `null` if unavailable. */
  speed: number | null;
  /** Toggle automatic walk detection on/off. */
  autoTrackingEnabled: boolean;
  setAutoTrackingEnabled: (v: boolean) => void;
}

// ---------------------------------------------------------------------------
// Auto-detection tuning
// ---------------------------------------------------------------------------

/** Minimum speed to consider someone "walking" (m/s). ~1.8 km/h */
const WALK_SPEED_MIN = 0.5;
/** Maximum plausible walking speed before we consider it driving/cycling. */
const WALK_SPEED_MAX = 2.8;
/** Consecutive "walking" samples required to auto-start a walk. */
const START_SAMPLES = 3;
/**
 * An auto-started walk ends after this long without a new GPS fix. Standing
 * still produces no fixes (they are distance-gated), so idle time is the
 * signal, and it keeps working while the screen is locked.
 */
const AUTO_STOP_IDLE_MS = 2 * 60 * 1000;
/** How often the idle check runs. */
const IDLE_CHECK_INTERVAL_MS = 10_000;

const NO_POINTS: Coordinate[] = [];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages location permission, the live position, and walk recording.
 *
 * **Recording** runs on a background location task, so a walk keeps being
 * recorded with the screen locked or the app backgrounded. The path lives in
 * a persisted store, so it survives a relaunch: on mount a still-running walk
 * is resumed and an interrupted one is saved.
 *
 * **Auto-tracking**: when enabled, a few consecutive walking-speed fixes while
 * the app is open start a walk automatically. Auto-started walks end by
 * themselves after a period without movement. Manual start / stop always work.
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>("undetermined");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [speed, setSpeed] = useState<number | null>(null);
  const [autoTrackingEnabled, setAutoTrackingEnabledState] = useState(true);

  const walk = useActiveWalkStore((s) => s.walk);
  const isTracking = walk !== null && walk.endedAt === null;
  const isAutoTracking = isTracking && walk.isAuto;
  const startedAtMs = isTracking ? walk.startedAt : null;
  const pathCoordinates = useMemo(() => walk?.points ?? NO_POINTS, [walk]);

  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  // The foreground watcher is created once, so it reads the live toggle
  // through a ref instead of a stale closure.
  const autoEnabledRef = useRef(autoTrackingEnabled);
  const speedBufferRef = useRef<number[]>([]);

  // ---- Walk control ---------------------------------------------------------

  const startWalk = useCallback(async (isAuto: boolean) => {
    const current = useActiveWalkStore.getState().walk;
    if (startingRef.current || (current && current.endedAt === null)) return;

    startingRef.current = true;
    speedBufferRef.current = [];
    try {
      // Save a previous walk that ended but hasn't been written yet.
      await finalizeActiveWalk();
      await beginActiveWalk(isAuto);
      await startWalkLocationUpdates();
    } catch (e) {
      discardActiveWalk();
      if (mountedRef.current) {
        setError(
          e instanceof Error ? e.message : "Failed to start walk recording.",
        );
      }
    } finally {
      startingRef.current = false;
    }
  }, []);

  const startTracking = useCallback(() => {
    void startWalk(false);
  }, [startWalk]);

  const stopTracking = useCallback(() => {
    endActiveWalk();
    void stopWalkLocationUpdates();
  }, []);

  const clearPath = useCallback(() => {
    discardActiveWalk();
    void stopWalkLocationUpdates();
  }, []);

  const setAutoTrackingEnabled = useCallback((v: boolean) => {
    autoEnabledRef.current = v;
    setAutoTrackingEnabledState(v);
  }, []);

  // ---- Auto-start (foreground speed samples) -------------------------------

  const evaluateAutoStart = useCallback(
    (speedMps: number | null) => {
      const current = useActiveWalkStore.getState().walk;
      if (!autoEnabledRef.current || (current && current.endedAt === null)) {
        return;
      }
      // Unknown speed says nothing either way.
      if (speedMps === null) return;

      // Driving / cycling — reset the buffer.
      if (speedMps > WALK_SPEED_MAX) {
        speedBufferRef.current = [];
        return;
      }

      if (speedMps >= WALK_SPEED_MIN) {
        speedBufferRef.current.push(speedMps);
      } else if (speedBufferRef.current.length > 0) {
        // Brief pause (e.g. traffic light) — record it but don't reset yet.
        speedBufferRef.current.push(0);
      }

      speedBufferRef.current = speedBufferRef.current.slice(-START_SAMPLES * 2);

      const recent = speedBufferRef.current.slice(-START_SAMPLES);
      const walkingCount = recent.filter((s) => s >= WALK_SPEED_MIN).length;
      if (walkingCount >= START_SAMPLES) {
        void startWalk(true);
      }
    },
    [startWalk],
  );

  // ---- Foreground position watcher -----------------------------------------

  const startWatching = useCallback(async () => {
    try {
      subscriptionRef.current?.remove();

      const subscription = await watchPositionAsync(
        {
          // Balanced is ~100 m accuracy, too coarse for speed-based detection.
          accuracy: LocationAccuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (newLocation: LocationObject) => {
          if (!mountedRef.current) return;

          const speedMps = normalizeSpeed(newLocation.coords.speed);
          setLocation(newLocation);
          setSpeed(speedMps);
          setIsLoading(false);
          evaluateAutoStart(speedMps);
        },
      );

      if (mountedRef.current) {
        subscriptionRef.current = subscription;
      } else {
        subscription.remove();
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to start location tracking.",
        );
        setIsLoading(false);
      }
    }
  }, [evaluateAutoStart]);

  // ---- Permission flow -----------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        const { status } = await getForegroundPermissionsAsync();
        if (!mountedRef.current) return;

        if (status === "granted") {
          setPermissionStatus("granted");
          await startWatching();
        } else if (status === "denied") {
          setPermissionStatus("denied");
          setIsLoading(false);
        } else {
          const { status: newStatus } =
            await requestForegroundPermissionsAsync();
          if (!mountedRef.current) return;

          if (newStatus === "granted") {
            setPermissionStatus("granted");
            await startWatching();
          } else {
            setPermissionStatus("denied");
            setIsLoading(false);
          }
        }
      } catch (e) {
        if (mountedRef.current) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to request location permission.",
          );
          setIsLoading(false);
        }
      }
    }

    void init();

    return () => {
      mountedRef.current = false;
      subscriptionRef.current?.remove();
    };
  }, [startWatching]);

  // ---- Recovery: resume or save a walk left over from a previous launch ----

  useEffect(() => {
    void (async () => {
      const saved = await hydrateActiveWalk();
      if (!saved) return;
      // Still recording in the background: the store already says so.
      if (saved.endedAt === null && (await isWalkLocationRunning())) return;
      // Interrupted (app killed, or stopped but never saved): save it now.
      await finalizeActiveWalk();
    })();
  }, []);

  // ---- Save a walk as soon as it ends ---------------------------------------

  const hasEnded = walk !== null && walk.endedAt !== null;
  useEffect(() => {
    if (hasEnded) void finalizeActiveWalk();
  }, [hasEnded]);

  // ---- Auto-stop an idle auto-started walk ---------------------------------

  useEffect(() => {
    if (!isAutoTracking) return;

    const id = setInterval(() => {
      const current = useActiveWalkStore.getState().walk;
      if (!current || current.endedAt !== null) return;

      const lastActivity =
        current.points[current.points.length - 1]?.timestamp ??
        current.startedAt;
      if (Date.now() - lastActivity > AUTO_STOP_IDLE_MS) {
        // End the walk when movement stopped, not when we noticed.
        endActiveWalk(lastActivity);
        void stopWalkLocationUpdates();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isAutoTracking]);

  // ---- Permission retry -----------------------------------------------------

  /** Re-requests foreground location permission and restarts the watcher. */
  const requestPermission = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const { status } = await requestForegroundPermissionsAsync();
      if (!mountedRef.current) return;

      if (status === "granted") {
        setPermissionStatus("granted");
        await startWatching();
      } else {
        setPermissionStatus("denied");
        setIsLoading(false);
      }
    } catch {
      if (mountedRef.current) {
        setError("Failed to request location permission.");
        setIsLoading(false);
      }
    }
  }, [startWatching]);

  return {
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
    clearPath,
    pathCoordinates,
    speed,
    autoTrackingEnabled,
    setAutoTrackingEnabled,
  };
}
