import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ModalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-stone-900">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Modal
        </Text>
        <Text className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Reusable modal route for future features.
        </Text>
      </View>
    </SafeAreaView>
  );
}
