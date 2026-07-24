import { Platform } from "react-native";
import { Color } from "expo-router";

/**
 * Semantic tint color for native component props that don't accept
 * Tailwind classes (e.g. `NativeTabs.tintColor`, `SymbolView.tintColor`).
 *
 * Uses the `Color` API from expo-router, which wraps `PlatformColor` and
 * auto-adapts to light/dark mode on both iOS and Android.
 *
 * All other styles should use NativeWind utility classes.
 */
export const tint = Platform.select({
  ios: Color.ios.systemBlue,
  android: Color.android.dynamic.primary,
  default: "#007AFF",
})!;
