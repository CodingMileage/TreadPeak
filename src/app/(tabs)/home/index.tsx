import { View } from "react-native";
import { LocationMap } from "@/components/location-map";

/**
 * Home screen — the landing tab of the app.
 *
 * Displays a full-screen realtime map showing the user's current location.
 * The existing Stack navigator header (with hamburger drawer button and
 * large title) is preserved by the parent layout.
 */
export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <LocationMap />
    </View>
  );
}
