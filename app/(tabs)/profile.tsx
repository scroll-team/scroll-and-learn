import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950" edges={["top"]}>
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-stone-900 dark:text-stone-50">
          Profile
        </Text>
        <Text className="mt-1 text-base text-stone-500 dark:text-stone-400">
          Your account and settings.
        </Text>

        <View className="mt-8 flex-1 items-center justify-center">
          <View className="items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-teal-600">
              <Text className="text-2xl font-bold text-white">?</Text>
            </View>
            <Text className="text-lg font-semibold text-stone-900 dark:text-stone-50">
              Not signed in
            </Text>
            <Text className="text-center text-sm text-stone-500 dark:text-stone-400">
              Sign in to sync your progress{"\n"}across devices.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
