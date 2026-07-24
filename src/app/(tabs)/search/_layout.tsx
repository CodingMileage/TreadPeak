import { Stack } from "expo-router/stack";
import { HeaderDrawerButton } from "@/components/header-drawer-button";

/**
 * Stack navigator for the Search tab.
 */
export default function SearchLayout() {
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
          title: "Search",
          headerLargeTitle: true,
        }}
      />
    </Stack>
  );
}
