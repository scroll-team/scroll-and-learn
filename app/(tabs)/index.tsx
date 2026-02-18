import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LibraryScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={["top"]}>
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-bold text-stone-900">Library</Text>
        <Text className="mt-1 text-base text-stone-500">
          Your uploaded documents will appear here.
        </Text>

        <View className="mt-8 flex-1 items-center justify-center">
          <View className="items-center gap-3">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
              <Text className="text-3xl">📚</Text>
            </View>
            <Text className="text-lg font-semibold text-stone-900">
              No documents yet
            </Text>
            <Text className="text-center text-sm text-stone-500">
              Upload a PDF to start generating{"\n"}quizzes and study content.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
