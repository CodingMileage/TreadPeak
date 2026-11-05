import type {
  AuthorizeResult,
  GetHealthDataOptions,
  GetHealthDataResult,
} from "expo-healthkit-module";

import {
  getHealthConnectStatus,
  requestHealthConnectAuthorization,
} from "../../modules/treadpeak-health";

// Only types are imported from `expo-healthkit-module` above: the package is
// not linked into the Android binary, so importing a value would throw.

/**
 * Android replacement for `authorizeHealthKit`: requests the Health Connect
 * read permissions through the local `treadpeak-health` module.
 */
export async function authorizeHealthKit(): Promise<AuthorizeResult> {
  try {
    const status = await getHealthConnectStatus();
    if (status === "unavailable") {
      return {
        success: false,
        granted: [],
        denied: [],
        error: "Health Connect is not supported on this device.",
      };
    }
    if (status === "updateRequired") {
      return {
        success: false,
        granted: [],
        denied: [],
        error: "Health Connect needs to be installed or updated from the Play Store.",
      };
    }
    const granted = await requestHealthConnectAuthorization();
    if (granted) return { success: true, granted: [], denied: [] };
    return {
      success: false,
      granted: [],
      denied: [],
      error: "Health Connect permissions were not granted.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, granted: [], denied: [], error: msg };
  }
}

/**
 * Raw Health Connect samples are not read on Android, so workout sync is a
 * no-op there (exercise sessions are out of scope).
 */
export async function getHealthData(
  _options: GetHealthDataOptions,
): Promise<GetHealthDataResult> {
  return {
    success: false,
    data: [],
    error: {
      code: "unsupported_platform",
      message:
        "Raw Health Connect samples are not read; daily totals use the TreadpeakHealth module.",
    },
  };
}

/** Identifiers are only meaningful to the iOS module; pass through. */
export function getPlatformIdentifier(id: string): string {
  return id;
}
