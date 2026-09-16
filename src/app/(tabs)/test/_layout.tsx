import { HeaderDrawerButton } from "@/components/header-drawer-button";
import { Stack } from "expo-router/stack";

/**
 * Stack navigator for the Test tab.
 */
export default function TestLayout() {
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
          title: "Testing",
        }}
      />
    </Stack>
  );
}
