import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

/**
 * Short keys the native module can total: an `HKStatisticsQuery` on iOS and a
 * Health Connect `aggregate` on Android.
 */
export const SUPPORTED_QUANTITIES = [
  "stepCount",
  "distanceWalkingRunning",
  "activeEnergyBurned",
  "flightsClimbed",
] as const;

/** One of the {@link SUPPORTED_QUANTITIES} keys. */
export type CumulativeQuantity = (typeof SUPPORTED_QUANTITIES)[number];

interface TreadpeakHealthNativeModule {
  getCumulativeSum(
    quantity: string,
    startISO: string,
    endISO: string,
  ): Promise<number>;
  /** Android only: opens the Health Connect permission dialog. */
  requestAuthorization?(): Promise<boolean>;
}

// `null` on web and on dev-client binaries built before this module existed.
const nativeModule =
  requireOptionalNativeModule<TreadpeakHealthNativeModule>("TreadpeakHealth");

if (Platform.OS === "ios" && nativeModule == null) {
  console.warn(
    "[treadpeak-health] Native module missing: rebuild the dev client (npx expo run:ios). Daily totals fall back to summing raw samples.",
  );
}

if (Platform.OS === "android" && nativeModule == null) {
  console.warn(
    "[treadpeak-health] Native module missing: rebuild the dev client (npx expo run:android). Health Connect totals are unavailable.",
  );
}

/** `true` when the native statistics module is linked into this binary. */
export const isTreadpeakHealthAvailable: boolean = nativeModule != null;

/** Type guard: is `value` a quantity the native module can total? */
export function isCumulativeQuantity(value: string): value is CumulativeQuantity {
  return (SUPPORTED_QUANTITIES as readonly string[]).includes(value);
}

/**
 * Merged cumulative sum of a HealthKit / Health Connect quantity between two
 * ISO 8601 dates.
 *
 * iOS: overlapping iPhone and Apple Watch samples are deduplicated by HealthKit
 * and user-entered samples are excluded. Android: Health Connect deduplicates
 * across apps by the user's priority list and entries typed in by hand are
 * subtracted. No data resolves to 0.
 * Units: steps and flights are counts, distance is metres, energy is kcal.
 */
export async function getCumulativeSum(
  quantity: CumulativeQuantity,
  startISO: string,
  endISO: string,
): Promise<number> {
  if (nativeModule == null) {
    throw new Error("TreadpeakHealth native module is not available");
  }
  return nativeModule.getCumulativeSum(quantity, startISO, endISO);
}

let authorizationInFlight: Promise<boolean> | null = null;

/**
 * Ask for the Health Connect read permissions (steps, distance, active
 * calories, floors). Resolves `true` when at least one is granted, and without
 * a dialog when the user already granted access. Resolves `false` off Android.
 *
 * Concurrent callers share one request so several `useHealthKit` mounts open
 * at most one dialog. Native errors (Health Connect missing, ...) reject.
 */
export async function requestHealthConnectAuthorization(): Promise<boolean> {
  if (Platform.OS !== "android" || nativeModule?.requestAuthorization == null) {
    return false;
  }
  if (authorizationInFlight == null) {
    authorizationInFlight = nativeModule.requestAuthorization().finally(() => {
      authorizationInFlight = null;
    });
  }
  return authorizationInFlight;
}
