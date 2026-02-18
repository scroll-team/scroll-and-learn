import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ModalScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-lg font-semibold text-stone-900">Modal</Text>
        <Text className="mt-1 text-sm text-stone-500">
          Reusable modal route for future features.
        </Text>
      </View>
    </SafeAreaView>
  );
}
