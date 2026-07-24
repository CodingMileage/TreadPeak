import { View, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      <Text
        className="text-2xl font-bold text-black dark:text-white"
        selectable
      >
        Settings
      </Text>
    </View>
  );
}
