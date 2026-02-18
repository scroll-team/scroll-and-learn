import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignInScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-3xl font-bold text-brand-dark">
          LearnAnything
        </Text>
        <Text className="mt-2 text-base text-stone-500">
          Sign in to continue
        </Text>
      </View>
    </SafeAreaView>
  );
}
