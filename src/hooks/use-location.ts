import { useCallback, useEffect, useRef, useState } from "react";
import {
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
  LocationAccuracy,
} from "expo-location";
import type { LocationObject, LocationSubscription } from "expo-location";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LocationPermissionStatus =
  | "undetermined"
  | "granted"
  | "denied";

/** A single coordinate pair used for the breadcrumb trail. */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

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
  /** Whether the user has an active walk tracking session. */
  isTracking: boolean;
  /** Whether the current walk was started automatically. */
  isAutoTracking: boolean;
  /** Starts recording a breadcrumb trail of the user's path. */
  startTracking: () => void;
  /** Stops recording the trail. The path is preserved until `clearPath` is called. */
  stopTracking: () => void;
  /** Clears the recorded path and resets the trail. */
  clearPath: () => void;
  /** Array of coordinates recorded since `startTracking` was called. */
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
/** Consecutive "stationary" samples required to auto-stop a walk. */
const STOP_SAMPLES = 10;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages foreground location permissions, real-time position tracking,
 * walk-path recording, and automatic walk detection.
 *
 * **Auto-tracking**: When enabled, the hook monitors GPS speed. If the user
 * walks consistently for several location updates the walk starts
 * automatically. When the user stays still for enough updates the walk
 * stops and is ready to be saved. Manual start / stop still work as
 * overrides.
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationObject | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus>("undetermined");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [pathCoordinates, setPathCoordinates] = useState<Coordinate[]>([]);
  const [speed, setSpeed] = useState<number | null>(null);
  const [autoTrackingEnabled, setAutoTrackingEnabled] = useState(true);

  const subscriptionRef = useRef<LocationSubscription | null>(null);
  const trackingRef = useRef(false);
  const autoRef = useRef(false);

  // ---- Auto-detection buffers ---------------------------------------------

  const speedBufferRef = useRef<number[]>([]);
  const walkStartTimeRef = useRef<number | null>(null);

  /** Start recording the walk path. */
  const startTracking = useCallback((auto = false) => {
    setPathCoordinates([]);
    trackingRef.current = true;
    autoRef.current = auto;
    setIsTracking(true);
    setIsAutoTracking(auto);
    walkStartTimeRef.current = Date.now();
    speedBufferRef.current = [];
  }, []);

  /** Stop recording without clearing the path. */
  const stopTracking = useCallback(() => {
    trackingRef.current = false;
    autoRef.current = false;
    setIsTracking(false);
    setIsAutoTracking(false);
    walkStartTimeRef.current = null;
  }, []);

  /** Wipe the recorded path. */
  const clearPath = useCallback(() => {
    setPathCoordinates([]);
  }, []);

  // ---- Auto-detection helpers ----------------------------------------------

  function evaluateAutoStart(speedMps: number) {
    if (!autoTrackingEnabled || trackingRef.current) return;

    // Driving / cycling — reset the buffer.
    if (speedMps > WALK_SPEED_MAX) {
      speedBufferRef.current = [];
      return;
    }

    // Walking — accumulate.
    if (speedMps >= WALK_SPEED_MIN) {
      speedBufferRef.current.push(speedMps);
    } else {
      // Brief pause (e.g. traffic light) — don't reset yet.
      // Only trim the buffer if we've been still for a while.
      if (speedBufferRef.current.length > 0) {
        speedBufferRef.current.push(0);
      }
    }

    // Keep only the most recent samples.
    if (speedBufferRef.current.length > START_SAMPLES * 2) {
      speedBufferRef.current = speedBufferRef.current.slice(-START_SAMPLES);
    }

    // Count consecutive walking samples.
    const recent = speedBufferRef.current.slice(-START_SAMPLES);
    const walkingCount = recent.filter((s) => s >= WALK_SPEED_MIN).length;

    if (walkingCount >= START_SAMPLES) {
      startTracking(true);
    }
  }

  function evaluateAutoStop(speedMps: number, coords: Coordinate[]) {
    if (!autoRef.current) return;

    // Still walking — keep going.
    if (speedMps >= WALK_SPEED_MIN) {
      speedBufferRef.current = [];
      return;
    }

    // Stationary or very slow.
    speedBufferRef.current.push(speedMps);
    if (speedBufferRef.current.length > STOP_SAMPLES) {
      speedBufferRef.current = speedBufferRef.current.slice(-STOP_SAMPLES);
    }

    if (speedBufferRef.current.length >= STOP_SAMPLES) {
      const allStill = speedBufferRef.current.every(
        (s) => s < WALK_SPEED_MIN,
      );
      if (allStill) {
        stopTracking();
      }
    }
  }

  // ---- Location subscription -----------------------------------------------

  async function startWatching(isMounted: { current: boolean }) {
    try {
      subscriptionRef.current?.remove();

      const subscription = await watchPositionAsync(
        {
          accuracy: LocationAccuracy.Balanced,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (newLocation: LocationObject) => {
          if (!isMounted.current) return;

          const coord: Coordinate = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          };
          const speedMps = newLocation.coords.speed ?? 0;

          setLocation(newLocation);
          setSpeed(speedMps);
          setIsLoading(false);

          // Auto-detection (runs regardless of tracking state).
          evaluateAutoStart(speedMps);
          evaluateAutoStop(speedMps, []);

          // Append to the breadcrumb trail while tracking.
          if (trackingRef.current) {
            setPathCoordinates((prev) => [...prev, coord]);
          }
        },
      );

      if (isMounted.current) {
        subscriptionRef.current = subscription;
      } else {
        subscription.remove();
      }
    } catch (e) {
      if (isMounted.current) {
        setError(
          e instanceof Error
            ? e.message
            : "Failed to start location tracking.",
        );
        setIsLoading(false);
      }
    }
  }

  // ---- Permission flow -----------------------------------------------------

  useEffect(() => {
    const isMounted = { current: true };

    async function init() {
      try {
        const { status } = await getForegroundPermissionsAsync();

        if (!isMounted.current) return;

        if (status === "granted") {
          setPermissionStatus("granted");
          await startWatching(isMounted);
        } else if (status === "denied") {
          setPermissionStatus("denied");
          setIsLoading(false);
        } else {
          const { status: newStatus } =
            await requestForegroundPermissionsAsync();

          if (!isMounted.current) return;

          if (newStatus === "granted") {
            setPermissionStatus("granted");
            await startWatching(isMounted);
          } else {
            setPermissionStatus("denied");
            setIsLoading(false);
          }
        }
      } catch (e) {
        if (isMounted.current) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to request location permission.",
          );
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted.current = false;
      subscriptionRef.current?.remove();
    };
    // The init function is intentionally only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Re-requests foreground location permission and restarts tracking. */
  async function requestPermission() {
    setError(null);
    setIsLoading(true);

    const isMounted = { current: true };
    try {
      const { status } = await requestForegroundPermissionsAsync();
      if (!isMounted.current) return;

      if (status === "granted") {
        setPermissionStatus("granted");
        await startWatching(isMounted);
      } else {
        setPermissionStatus("denied");
        setIsLoading(false);
      }
    } catch {
      if (isMounted.current) {
        setError("Failed to request location permission.");
        setIsLoading(false);
      }
    }
  }

  return {
    location,
    permissionStatus,
    error,
    isLoading,
    requestPermission,
    isTracking,
    isAutoTracking,
    startTracking: () => startTracking(false),
    stopTracking,
    clearPath,
    pathCoordinates,
    speed,
    autoTrackingEnabled,
    setAutoTrackingEnabled,
  };
}
