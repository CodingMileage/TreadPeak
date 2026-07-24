import { Stack } from "expo-router/stack";
import { HeaderDrawerButton } from "@/components/header-drawer-button";

/**
 * Stack navigator for the Profile tab.
 */
export default function ProfileLayout() {
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
          title: "Profile",
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
