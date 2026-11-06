/**
 * iOS / web path of the third-party `expo-healthkit-module`.
 *
 * Android resolves `legacy-healthkit.android.ts` instead: the package is
 * excluded from Android autolinking (`package.json` -> `expo.autolinking`) and
 * its JS calls `requireNativeModule` at import time, which would throw there.
 */
export {
  authorizeHealthKit,
  getHealthData,
  getPlatformIdentifier,
} from "expo-healthkit-module";
