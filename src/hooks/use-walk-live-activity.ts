import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { after, type LiveActivity } from "expo-widgets";

import WalkActivity, {
  type WalkActivityProps,
} from "@/live-activities/walk-activity";
import {
  hydrateActiveWalk,
  useActiveWalkStore,
} from "@/lib/active-walk-store";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IS_IOS = Platform.OS === "ios";

/** Fixed deep link (opens the Home tab); never built from user input. */
const DEEP_LINK_URL = "treadpeak://home";

/**
 * How often live stats are pushed to the activity. Matches the Home pedometer
 * polling cadence and stays well under ActivityKit's update throttling. The
 * elapsed timer ticks natively, so it needs no updates.
 */
const UPDATE_INTERVAL_MS = 5_000;

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
  /**
   * When the walk really began (epoch ms). Lets the Lock Screen timer stay
   * correct if the walk is resumed after a relaunch; defaults to "now".
   */
  startedAtMs?: number | null;
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

/**
 * Recover Live Activities left over from a previous JS session.
 *
 * Returns the first active instance (to be re-attached) and ends any extras
 * immediately so duplicates never pile up. Returns null when none exist or
 * when ActivityKit is unavailable.
 */
function adoptExistingActivity(): LiveActivity<WalkActivityProps> | null {
  try {
    const [first, ...extras] = WalkActivity.getInstances();
    for (const extra of extras) {
      extra
        .end("immediate")
        .catch((error: unknown) => warn("end duplicate failed", error));
    }
    return first ?? null;
  } catch (error) {
    warn("getInstances failed", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Mirrors the active walk into an iOS Live Activity (Lock Screen banner and
 * Dynamic Island).
 *
 * Lifecycle:
 * - Starts one Live Activity when `isTracking` becomes true. An already
 *   running activity (from `getInstances()`) is re-attached instead, so a
 *   second one is never created.
 * - Every 5 s while tracking, pushes fresh steps, distance and pace. Updates
 *   are skipped when nothing changed since the last one sent.
 * - Ends it with a frozen "Walk complete" summary, removed by the system five
 *   minutes later, when `isTracking` becomes false.
 * - On mount after a relaunch, a walk that is still recording keeps (re-attaches
 *   to) its activity; activities left over from a walk that is no longer in
 *   progress are ended immediately.
 *
 * Limitation: steps, distance and pace refresh only while the app's JS is
 * running (foreground, or briefly after backgrounding). The elapsed time keeps
 * ticking natively. APNs push is out of scope.
 *
 * iOS only: every call is behind `Platform.OS === "ios"`, so Android and web
 * are unaffected.
 */
export function useWalkLiveActivity({
  isTracking,
  steps,
  distanceMetres,
  startedAtMs,
}: WalkLiveActivityInput): void {
  const activityRef = useRef<LiveActivity<WalkActivityProps> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const latestRef = useRef({ steps, distanceMetres, startedAtMs });
  const lastSentKeyRef = useRef<string | null>(null);

  // Keep the latest stats readable from effects without re-running them.
  useEffect(() => {
    latestRef.current = { steps, distanceMetres, startedAtMs };
  }, [steps, distanceMetres, startedAtMs]);

  // ---- Lifecycle: start / end ----------------------------------------------
  useEffect(() => {
    if (!IS_IOS) return;

    if (isTracking) {
      // Only when null so a Fast Refresh re-run mid-walk keeps the timer.
      if (startedAtRef.current === null) {
        startedAtRef.current = latestRef.current.startedAtMs ?? Date.now();
      }

      // Zero-state: the path was just cleared and LocationMap resets the
      // pedometer offset one render later, so `steps` is stale right now.
      const props = buildWalkActivityProps(startedAtRef.current, 0, 0, false);
      lastSentKeyRef.current = null;

      // Re-attach to a running activity (Fast Refresh, relaunch) rather than
      // starting a duplicate.
      const existing = activityRef.current ?? adoptExistingActivity();
      if (existing) {
        activityRef.current = existing;
        existing.update(props).catch((error: unknown) => {
          // The adopted activity may already be gone (ended by the system or
          // a previous session): start a fresh one instead of going dark.
          warn("update failed, starting a new activity", error);
          if (activityRef.current !== existing) return;
          try {
            activityRef.current = WalkActivity.start(props, DEEP_LINK_URL);
          } catch (startError) {
            activityRef.current = null;
            warn("start failed", startError);
          }
        });
        return;
      }

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
    if (!activity) {
      // Mount path after a relaunch. The persisted walk may still be
      // recording (it is resumed once loaded), so leftover activities are only
      // ended when it says nothing is in progress. Ending them blindly here
      // would kill the activity of a walk that is about to be resumed.
      void hydrateActiveWalk().then((saved) => {
        const current = useActiveWalkStore.getState().walk;
        const recording = (current ?? saved)?.endedAt === null;
        if (recording || activityRef.current !== null) return;
        try {
          for (const stale of WalkActivity.getInstances()) {
            stale
              .end("immediate")
              .catch((error: unknown) => warn("end stale failed", error));
          }
        } catch (error) {
          warn("getInstances failed", error);
        }
      });
    }
    activityRef.current = null;
    startedAtRef.current = null;
    lastSentKeyRef.current = null;
  }, [isTracking]);

  // ---- Live stat updates ---------------------------------------------------
  useEffect(() => {
    if (!IS_IOS || !isTracking) return;

    const id = setInterval(() => {
      const activity = activityRef.current;
      const startedAt = startedAtRef.current;
      if (!activity || startedAt === null) return;

      const { steps: s, distanceMetres: m } = latestRef.current;
      const props = buildWalkActivityProps(startedAt, s, m, false);
      // Key on the displayed stats only: `elapsedLabel` changes every second
      // and the native timer already covers it, so it would defeat dedupe.
      const key = JSON.stringify([
        props.stepsLabel,
        props.distanceLabel,
        props.paceLabel,
      ]);
      if (key === lastSentKeyRef.current) return;

      lastSentKeyRef.current = key;
      activity.update(props).catch((error: unknown) => warn("update failed", error));
    }, UPDATE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [isTracking]);
}
