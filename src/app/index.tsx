import { Redirect } from "expo-router";

/**
 * Root index route — redirects to the first tab inside the drawer.
 * Since `(tabs)` is a route group (no URL segment), the home screen
 * lives at `/(tabs)/home`.
 */
export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
