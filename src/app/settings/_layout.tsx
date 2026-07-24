import { Stack } from "expo-router/stack";
import { HeaderDrawerButton } from "@/components/header-drawer-button";

/**
 * Stack navigator for the Settings drawer screen.
 *
 * Provides a header with a hamburger button so the user can re-open
 * the drawer after navigating here from it.
 */
export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerLeft: () => <HeaderDrawerButton />,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Settings",
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
