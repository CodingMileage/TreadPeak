import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { after, type LiveActivity } from "expo-widgets";

import WalkActivity, {
  type WalkActivityProps,
} from "@/live-activities/walk-activity";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IS_IOS = Platform.OS === "ios";

/** Fixed deep link (opens the Home tab); never built from user input. */
const DEEP_LINK_URL = "treadpeak://home";

/** How long the "Walk complete" summary stays on the Lock Screen. */
const END_DISMISS_AFTER_MS = 5 * 60 * 1000;

const FEET_PER_METRE = 3.28084;
const FEET_PER_MILE = 5280;
const METRES_PER_MILE = 1609.344;
/** Below this distance pace is too noisy to show. */
const PACE_MIN_METRES = 50;
/** Slower than this (minutes per mile) is shown as unknown. */
const PACE_MAX_MINUTES_PER_MILE = 60;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WalkLiveActivityInput {
  isTracking: boolean;
  steps: number;
  distanceMetres: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Step count with locale grouping, e.g. "1,234". */
function formatStepsLabel(steps: number): string {
  return steps.toLocaleString();
}

/** Whole feet below one mile, otherwise one-decimal miles (matches Home). */
function formatDistanceLabel(metres: number): string {
  const feet = metres * FEET_PER_METRE;
  if (feet < FEET_PER_MILE) return Math.round(feet) + " ft";
  return (metres / METRES_PER_MILE).toFixed(1) + " mi";
}

/** Pace as `m:ss /mi`, or "--" when distance is too short or pace too slow. */
function formatPaceLabel(elapsedSeconds: number, metres: number): string {
  if (metres < PACE_MIN_METRES) return "--";
  const secondsPerMile = elapsedSeconds / (metres / METRES_PER_MILE);
  if (!Number.isFinite(secondsPerMile)) return "--";
  if (secondsPerMile > PACE_MAX_MINUTES_PER_MILE * 60) return "--";
  const total = Math.round(secondsPerMile);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes + ":" + String(seconds).padStart(2, "0") + " /mi";
}

/** `m:ss`, or `h:mm:ss` from one hour (mirrors SwiftUI's timer style). */
function formatElapsedLabel(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return hours + ":" + String(minutes).padStart(2, "0") + ":" + ss;
  return minutes + ":" + ss;
}

/**
 * Build Live Activity props from raw walk stats. Elapsed time uses wall-clock
 * `Date.now() - startedAtMs`, the same clock the native timer ticks against.
 */
function buildWalkActivityProps(
  startedAtMs: number,
  steps: number,
  metres: number,
  isEnded: boolean,
): WalkActivityProps {
  const elapsedSeconds = Math.max(0, (Date.now() - startedAtMs) / 1000);
  return {
    startedAtMs,
    isEnded,
    elapsedLabel: formatElapsedLabel(elapsedSeconds),
    stepsLabel: formatStepsLabel(steps),
    distanceLabel: formatDistanceLabel(metres),
    paceLabel: formatPaceLabel(elapsedSeconds, metres),
  };
}

/**
 * Report a Live Activity failure in development only.
 *
 * Why: Live Activity failures (user disabled them, unsupported device) must
 * never interrupt walk tracking, so errors are swallowed in production.
 */
function warn(message: string, error: unknown): void {
  if (__DEV__) console.warn("[walk-live-activity] " + message, error);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Mirrors the active walk into an iOS Live Activity (Lock Screen banner and
 * Dynamic Island).
 *
 * - Starts one Live Activity when `isTracking` becomes true.
 * - Ends it with a frozen "Walk complete" summary, removed by the system five
 *   minutes later, when `isTracking` becomes false.
 *
 * iOS only: every call is behind `Platform.OS === "ios"`, so Android and web
 * are unaffected.
 */
export function useWalkLiveActivity({
  isTracking,
  steps,
  distanceMetres,
}: WalkLiveActivityInput): void {
  const activityRef = useRef<LiveActivity<WalkActivityProps> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const latestRef = useRef({ steps, distanceMetres });

  // Keep the latest stats readable from effects without re-running them.
  useEffect(() => {
    latestRef.current = { steps, distanceMetres };
  }, [steps, distanceMetres]);

  // ---- Lifecycle: start / end ----------------------------------------------
  useEffect(() => {
    if (!IS_IOS) return;

    if (isTracking) {
      // Only when null so a Fast Refresh re-run mid-walk keeps the timer.
      if (startedAtRef.current === null) startedAtRef.current = Date.now();

      // Zero-state: the path was just cleared and LocationMap resets the
      // pedometer offset one render later, so `steps` is stale right now.
      const props = buildWalkActivityProps(startedAtRef.current, 0, 0, false);
      try {
        activityRef.current = WalkActivity.start(props, DEEP_LINK_URL);
      } catch (error) {
        warn("start failed", error);
      }
      return;
    }

    const activity = activityRef.current;
    if (activity && startedAtRef.current !== null) {
      const { steps: s, distanceMetres: m } = latestRef.current;
      const finalProps = buildWalkActivityProps(startedAtRef.current, s, m, true);
      activity
        .end(
          after(new Date(Date.now() + END_DISMISS_AFTER_MS)),
          finalProps,
        )
        .catch((error: unknown) => warn("end failed", error));
    }
    activityRef.current = null;
    startedAtRef.current = null;
  }, [isTracking]);
}
