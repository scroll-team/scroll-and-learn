import { useCallback, useEffect, useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  Typography,
  PressableCard,
  Badge,
  EmptyState,
  SkeletonCard,
} from "@/components/ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/providers/auth-provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchAllQuizzes } from "@/services/quiz";
import type { Quiz } from "@/types";

type QuizWithDoc = Quiz & { documentTitle?: string };

export default function LearnScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [quizzes, setQuizzes] = useState<QuizWithDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadQuizzes = useCallback(async () => {
    if (!user) return;
    const { quizzes: q } = await fetchAllQuizzes(user.id);
    setQuizzes(q);
  }, [user]);

  useEffect(() => {
    loadQuizzes().finally(() => setIsLoading(false));
  }, [loadQuizzes]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadQuizzes();
    setIsRefreshing(false);
  }

  function renderQuiz({ item }: { item: QuizWithDoc }) {
    return (
      <PressableCard
        className="mb-3"
        onPress={() =>
          router.push({
            pathname: "/quiz/[id]",
            params: { id: item.id },
          })
        }
      >
        <View className="flex-row items-start">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900">
            <IconSymbol name="flame.fill" size={20} color={isDark ? "#FCD34D" : "#D97706"} />
          </View>
          <View className="flex-1">
            <Typography variant="h3" numberOfLines={2}>
              {item.title}
            </Typography>
            {item.documentTitle && (
              <Typography variant="caption" className="mt-0.5" numberOfLines={1}>
                From: {item.documentTitle}
              </Typography>
            )}
            <View className="mt-2 flex-row items-center gap-2">
              <Badge variant="brand">
                {item.questions.length} questions
              </Badge>
              <Badge variant="default">
                {item.difficulty}
              </Badge>
            </View>
          </View>
          <IconSymbol
            name="chevron.right"
            size={16}
            color={isDark ? "#78716C" : "#A8A29E"}
          />
        </View>
      </PressableCard>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }} edges={["top"]}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <Typography variant="h1">Learn</Typography>
          <Typography variant="bodySmall" className="mt-1">
            Your quizzes.
          </Typography>
          <View className="mt-6 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        <Typography variant="h1">Learn</Typography>
        <Typography variant="bodySmall" className="mt-1">
          {quizzes.length
            ? `${quizzes.length} quiz${quizzes.length > 1 ? "zes" : ""} available`
            : "Your quizzes."}
        </Typography>

        {quizzes.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              icon={
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900">
                  <IconSymbol name="flame.fill" size={32} color={isDark ? "#FCD34D" : "#D97706"} />
                </View>
              }
              title="No quizzes yet"
              description="Upload a PDF in the Library tab and generate a quiz to start learning."
            />
          </View>
        ) : (
          <FlatList
            data={quizzes}
            renderItem={renderQuiz}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={isDark ? "#5EEAD4" : "#0D9488"}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
