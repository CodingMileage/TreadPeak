import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";

/**
 * Catch-all screen for unmatched routes.
 */
export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-lg font-bold text-gray-800 dark:text-gray-100">
          This screen does not exist.
        </Text>
        <Link
          href="/"
          className="mt-4 text-base text-blue-600 dark:text-blue-400 underline"
        >
          Go to home screen
        </Link>
      </View>
    </>
  );
}
