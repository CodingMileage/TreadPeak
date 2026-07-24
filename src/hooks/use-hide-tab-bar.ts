import { useLayoutEffect } from "react";
import { useNavigation } from "expo-router";

/**
 * Hides the bottom tab bar while the current screen is mounted.
 *
 * Calls `setOptions({ tabBarStyle: { display: "none" } })` on the parent
 * tab navigator on mount, and restores it on unmount so the tab bar comes
 * back when the user navigates away.
 */
export function useHideTabBar() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    parent.setOptions({ tabBarStyle: { display: "none" } });

    return () => {
      parent.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);
}
