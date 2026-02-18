import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-stone-950">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-teal-900 dark:text-teal-400">
          LearnAnything
        </Text>
        <Text className="mt-2 text-base text-stone-500 dark:text-stone-400">
          Create your account
        </Text>
      </View>
    </SafeAreaView>
  );
}
