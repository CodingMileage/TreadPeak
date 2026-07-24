import { Pressable } from "react-native";
import { useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import { tint } from "@/theme/colors";

/**
 * Accesses the root drawer navigation so we can call `toggleDrawer()`.
 *
 * `useNavigation("/")` returns the root navigator (a Drawer), but the
 * generic `NavigationProp` type does not include drawer-specific methods.
 * At runtime the method is always present when a Drawer is the root layout.
 */
function useDrawerNavigation() {
  return useNavigation("/") as {
    toggleDrawer(): void;
    openDrawer(): void;
    closeDrawer(): void;
  };
}

/**
 * A hamburger button that toggles the root drawer navigator.
 *
 * Renders an SF Symbol in the system tint color with a 44 pt touch target.
 */
export function HeaderDrawerButton() {
  const drawer = useDrawerNavigation();

  return (
    <Pressable
      onPress={() => drawer.toggleDrawer()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={({ pressed }) => ({
        opacity: pressed ? 0.5 : 1,
      })}
      className="h-7 w-7 items-center justify-center"
      accessibilityLabel="Open navigation menu"
      accessibilityRole="button"
    >
      <SymbolView
        name="line.3.horizontal"
        tintColor={tint as string}
        size={22}
        type="hierarchical"
      />
    </Pressable>
  );
}
