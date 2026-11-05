import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

/** Short keys the native module can total with an `HKStatisticsQuery`. */
export const SUPPORTED_QUANTITIES = ["stepCount"] as const;

/** One of the {@link SUPPORTED_QUANTITIES} keys. */
export type CumulativeQuantity = (typeof SUPPORTED_QUANTITIES)[number];

interface TreadpeakHealthNativeModule {
  getCumulativeSum(
    quantity: string,
    startISO: string,
    endISO: string,
  ): Promise<number>;
}

// `null` on Android, web and dev-client binaries built before this module existed.
const nativeModule =
  requireOptionalNativeModule<TreadpeakHealthNativeModule>("TreadpeakHealth");

if (Platform.OS === "ios" && nativeModule == null) {
  console.warn(
    "[treadpeak-health] Native module missing: rebuild the dev client (npx expo run:ios). Daily totals fall back to summing raw samples.",
  );
}

/** `true` when the native statistics module is linked into this binary. */
export const isTreadpeakHealthAvailable: boolean = nativeModule != null;

/** Type guard: is `value` a quantity the native module can total? */
export function isCumulativeQuantity(value: string): value is CumulativeQuantity {
  return (SUPPORTED_QUANTITIES as readonly string[]).includes(value);
}

/**
 * Merged cumulative sum of a HealthKit quantity between two ISO 8601 dates.
 *
 * Overlapping iPhone and Apple Watch samples are deduplicated by HealthKit and
 * user-entered samples are excluded. No data resolves to 0.
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
