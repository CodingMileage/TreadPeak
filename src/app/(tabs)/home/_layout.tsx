import { Link } from "expo-router";
import { Pressable } from "react-native";
import { Stack } from "expo-router/stack";
import { SymbolView } from "expo-symbols";
import { HeaderDrawerButton } from "@/components/header-drawer-button";

/**
 * Stack navigator for the Home tab.
 *
 * `ThemeProvider` (wrapping the root Drawer) handles header colors
 * automatically, so we only configure the minimal options here.
 */
export default function HomeLayout() {
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
          title: "Home",
          headerRight: () => (
            <Link href="/history" asChild>
              <Pressable className="active:opacity-60">
                <SymbolView
                  name="clock.arrow.trianglehead.counterclockwise.rotate.90"
                  size={22}
                  weight="semibold"
                  tintColor="#208AEF"
                />
              </Pressable>
            </Link>
          ),
        }}
      />
    </Stack>
  );
}
