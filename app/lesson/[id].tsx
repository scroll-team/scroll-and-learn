import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Typography, Button, IconButton, SkeletonCard } from "@/components/ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import type { Lesson, Quiz } from "@/types";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data: lessonData } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", id)
        .single();

      if (lessonData) {
        setLesson({
          id: lessonData.id,
          studyPlanId: lessonData.study_plan_id,
          userId: lessonData.user_id,
          title: lessonData.title,
          summary: lessonData.summary ?? null,
          orderIndex: lessonData.order_index,
          createdAt: lessonData.created_at,
        });

        // Fetch the quiz for this lesson
        const { data: quizData } = await supabase
          .from("quizzes")
          .select("*")
          .eq("lesson_id", id)
          .limit(1)
          .maybeSingle();

        if (quizData) {
          setQuiz({
            id: quizData.id,
            documentId: quizData.document_id ?? null,
            lessonId: quizData.lesson_id ?? null,
            title: quizData.title,
            questions: quizData.questions,
            difficulty: quizData.difficulty,
            createdAt: quizData.created_at,
          });
        }
      }
    }
    load().finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}
        edges={["top"]}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}
      edges={["top"]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back navigation */}
        <View className="mb-4 flex-row items-center">
          <IconButton size="sm" onPress={() => router.back()} className="mr-3">
            <IconSymbol
              name="chevron.left"
              size={18}
              color={isDark ? "#FAFAF9" : "#1C1917"}
            />
          </IconButton>
          <Typography variant="caption" className="text-teal-600 dark:text-teal-400">
            Lesson {(lesson?.orderIndex ?? 0) + 1}
          </Typography>
        </View>

        <Typography variant="h1" className="mb-4">
          {lesson?.title ?? "Lesson"}
        </Typography>

        {/* Summary card */}
        {lesson?.summary ? (
          <View className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
            <View className="mb-3 flex-row items-center gap-2">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900">
                <IconSymbol
                  name="book.fill"
                  size={12}
                  color={isDark ? "#5EEAD4" : "#0D9488"}
                />
              </View>
              <Typography variant="overline" className="text-teal-600 dark:text-teal-400">
                OVERVIEW
              </Typography>
            </View>
            <Typography variant="body" className="leading-relaxed text-stone-700 dark:text-stone-300">
              {lesson.summary}
            </Typography>
          </View>
        ) : null}

        {/* Quiz card */}
        {quiz ? (
          <View className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950">
            <View className="mb-3 flex-row items-center gap-2">
              <View className="h-6 w-6 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                <IconSymbol
                  name="flame.fill"
                  size={12}
                  color={isDark ? "#FCD34D" : "#D97706"}
                />
              </View>
              <Typography variant="overline" className="text-amber-700 dark:text-amber-400">
                QUIZ
              </Typography>
            </View>
            <Typography variant="h3" className="mb-1 text-amber-900 dark:text-amber-200">
              {quiz.title}
            </Typography>
            <Typography
              variant="bodySmall"
              className="mb-4 text-amber-700 dark:text-amber-400"
            >
              {quiz.questions.length} multiple-choice questions
            </Typography>
            <Button
              onPress={() =>
                router.push({
                  pathname: "/quiz/[id]",
                  params: { id: quiz.id },
                })
              }
            >
              Start Quiz
            </Button>
          </View>
        ) : (
          <View className="rounded-2xl border border-stone-200 bg-stone-50 p-5 dark:border-stone-700 dark:bg-stone-800">
            <Typography variant="body" className="text-center text-stone-500">
              No quiz for this lesson yet.
            </Typography>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
