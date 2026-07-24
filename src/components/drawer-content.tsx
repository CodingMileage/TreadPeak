import {
  DrawerContentScrollView,
  DrawerItemList,
} from "expo-router/drawer";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Routes that should never appear as drawer items. */
const HIDDEN_ROUTES = new Set(["index", "+not-found", "history"]);

/**
 * Custom drawer content rendered inside the slide-out drawer panel.
 *
 * Expo Router auto-registers every route file in `app/` as a drawer
 * screen — including `index.tsx` (the redirect) and `+not-found.tsx`.
 * We filter those out so only explicitly declared `<Drawer.Screen>`
 * entries appear in the list.
 */
export function DrawerContent(props: DrawerContentComponentProps) {
  const { top } = useSafeAreaInsets();
  const { state, navigation, descriptors } = props;

  // Build a filtered state that excludes hidden routes, recalculating
  // the index so the currently focused route stays highlighted.
  const visibleRoutes = state.routes.filter(
    (route) => !HIDDEN_ROUTES.has(route.name)
  );
  const focusedRoute = state.routes[state.index];
  const newIndex = visibleRoutes.findIndex(
    (route) => route.key === focusedRoute?.key
  );
  const filteredState = {
    ...state,
    routes: visibleRoutes,
    index: newIndex >= 0 ? newIndex : 0,
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-neutral-900">
      {/* App branding header */}
      <View
        style={{ paddingTop: top + 20 }}
        className="px-5 pb-4"
      >
        <Text
          className="text-3xl font-bold text-black dark:text-white"
          selectable
        >
          TreadPeak
        </Text>
      </View>

      {/* Scrollable drawer items — only the routes we want */}
      <DrawerContentScrollView {...props}>
        <DrawerItemList
          state={filteredState}
          navigation={navigation}
          descriptors={descriptors}
        />
      </DrawerContentScrollView>
    </View>
  );
}
