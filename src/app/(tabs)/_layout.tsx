import { tint } from "@/theme/colors";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

/**
 * Bottom tab bar using native `UITabBar` (iOS) / `BottomNavigationView`
 * (Android), driven by Expo Router's `NativeTabs`.
 *
 * Each tab wraps a folder with its own `<Stack>` layout so every tab
 * gets independent navigation history and its own header.
 *
 * `tintColor` is the only inline style — it's a native prop that doesn't
 * accept Tailwind classes. All other styling is handled by the system.
 */
export default function TabsLayout() {
  return (
    <NativeTabs
      tintColor={tint}
      blurEffect={Platform.select({ ios: "systemDefault", default: undefined })}
    >
      {/* Home */}
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf="house" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* Search */}
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* Profile */}
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.circle" md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
