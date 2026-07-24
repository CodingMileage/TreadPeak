import { Pressable } from "react-native";
import { router, Stack } from "expo-router";
import { SymbolView } from "expo-symbols";

/** Back button used on the history root so users can return to the map. */
function BackButton() {
  return (
    <Pressable onPress={() => router.back()} className="active:opacity-60">
      <SymbolView
        name="chevron.left"
        size={20}
        weight="semibold"
        tintColor="#208AEF"
      />
    </Pressable>
  );
}

/**
 * Stack navigator for the walk history flow.
 *
 * Lives outside the tab group so screens render full-screen (no tab bar).
 * Reached via the clock icon in the Home tab header.
 */
export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerShown: true,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Walk History",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: "Walk Detail" }}
      />
    </Stack>
  );
}
