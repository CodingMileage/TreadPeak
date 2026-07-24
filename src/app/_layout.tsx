import "../../global.css";

import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider, useSegments } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { AppState, Platform, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DrawerContent } from "@/components/drawer-content";

// ---------------------------------------------------------------------------
// React Query — refetch on app focus
// ---------------------------------------------------------------------------
focusManager.setEventListener((handleFocus) => {
  if (Platform.OS === "web") {
    if (
      typeof document !== "undefined" &&
      document.visibilityState !== undefined
    ) {
      const subscription = document.addEventListener("visibilitychange", () => {
        handleFocus(document.visibilityState === "visible");
      });
      return () =>
        document.removeEventListener("visibilitychange", subscription!);
    }
  }
  const subscription = AppState.addEventListener("change", (status) => {
    handleFocus(status === "active");
  });
  return () => subscription.remove();
});

// ---------------------------------------------------------------------------
// React Query — refetch when coming back online
// ---------------------------------------------------------------------------
onlineManager.setEventListener((setOnline) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
  return () => unsubscribe();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

// ---------------------------------------------------------------------------
// Inner component — needs `useColorScheme` for theme selection.
// ---------------------------------------------------------------------------
function RootLayoutInner() {
  const colorScheme = useColorScheme();
  const segments = useSegments();

  // Only allow drawer swipe on the top-level tab screens. Disable it on
  // nested routes (history, detail, settings sub-screens, etc.) so the
  // Stack back-swipe gesture isn't stolen by the drawer.
  const isAtRoot = segments.length <= 2;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: Platform.select({ ios: "slide", default: "front" }),
          swipeEdgeWidth: isAtRoot ? 50 : 0,
          swipeEnabled: isAtRoot,
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{ drawerLabel: "Home", title: "Home" }}
        />
        <Drawer.Screen
          name="settings"
          options={{ drawerLabel: "Settings", title: "Settings" }}
        />
      </Drawer>
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------
export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <QueryClientProvider client={queryClient}>
        <RootLayoutInner />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
