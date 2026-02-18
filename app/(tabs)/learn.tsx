import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LearnScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={["top"]}>
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-stone-900 dark:text-stone-50">
          Learn
        </Text>
        <Text className="mt-1 text-base text-stone-500 dark:text-stone-400">
          Your learning dashboard.
        </Text>

        <View className="mt-8 flex-1 items-center justify-center">
          <View className="items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900">
              <Text className="text-3xl">🔥</Text>
            </View>
            <Text className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              Start your streak
            </Text>
            <Text className="text-center text-sm text-stone-500 dark:text-stone-400">
              Upload a document and complete a quiz{"\n"}to begin your learning
              journey.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
