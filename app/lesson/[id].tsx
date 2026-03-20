import { useEffect, useState } from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Typography, Button, IconButton, SkeletonCard, Badge } from "@/components/ui";
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
          slideshowCards: lessonData.slideshow_cards ?? [],
          storyCards: lessonData.story_cards ?? [],
          createdAt: lessonData.created_at,
        });

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

  const bg = isDark ? "#0C0A09" : "#FAFAF9";
  const cardBg = isDark ? "#1C1917" : "#FFFFFF";
  const borderColor = isDark ? "#44403C" : "#E7E5E4";
  const mutedText = isDark ? "#78716C" : "#A8A29E";

  const hasSlides = (lesson?.slideshowCards?.length ?? 0) > 0;
  const hasStories = (lesson?.storyCards?.length ?? 0) > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
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

        <Typography variant="h1" className="mb-2">
          {lesson?.title ?? "Lesson"}
        </Typography>

        {lesson?.summary ? (
          <Typography
            variant="body"
            className="mb-6"
            style={{ color: isDark ? "#A8A29E" : "#78716C", lineHeight: 22 }}
          >
            {lesson.summary}
          </Typography>
        ) : null}

        {/* ── Step 1: Learn (Slideshow) ─────────────────────────────── */}
        {hasSlides && (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#134E4A" : "#CCFBF1",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Typography variant="body" style={{ fontSize: 18 }}>📖</Typography>
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="h3">Learn</Typography>
                <Typography variant="caption" style={{ color: mutedText }}>
                  {lesson!.slideshowCards.length} slides
                </Typography>
              </View>
              <Badge variant="brand">Step 1</Badge>
            </View>
            <Typography
              variant="bodySmall"
              style={{ color: isDark ? "#A8A29E" : "#78716C", marginBottom: 14 }}
            >
              Go through the slideshow to learn the key concepts of this lesson.
            </Typography>
            <Button
              onPress={() =>
                router.push({
                  pathname: "/slideshow/[lessonId]",
                  params: { lessonId: lesson!.id },
                })
              }
            >
              Start Slideshow
            </Button>
          </View>
        )}

        {/* ── Step 2: Quick Review (Story Cards) ───────────────────── */}
        {hasStories && (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              padding: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#4A1D96" : "#EDE9FE",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Typography variant="body" style={{ fontSize: 18 }}>⚡</Typography>
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="h3">Quick Review</Typography>
                <Typography variant="caption" style={{ color: mutedText }}>
                  {lesson!.storyCards.length} cards
                </Typography>
              </View>
              <Badge variant="default">Step 2</Badge>
            </View>
            <Typography
              variant="bodySmall"
              style={{ color: isDark ? "#A8A29E" : "#78716C", marginBottom: 14 }}
            >
              Swipe through short flashcards to reinforce what you just learned.
            </Typography>
            <Button
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/stories/[lessonId]",
                  params: { lessonId: lesson!.id },
                })
              }
            >
              Quick Review
            </Button>
          </View>
        )}

        {/* ── Step 3: Quiz ─────────────────────────────────────────── */}
        {quiz ? (
          <View
            style={{
              backgroundColor: isDark ? "#422006" : "#FFFBEB",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isDark ? "#92400E" : "#FDE68A",
              padding: 20,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDark ? "#78350F" : "#FEF3C7",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Typography variant="body" style={{ fontSize: 18 }}>🎯</Typography>
              </View>
              <View style={{ flex: 1 }}>
                <Typography variant="h3" style={{ color: isDark ? "#FDE68A" : "#92400E" }}>
                  {quiz.title}
                </Typography>
                <Typography variant="caption" style={{ color: isDark ? "#D97706" : "#B45309" }}>
                  {quiz.questions.length} questions
                </Typography>
              </View>
              <Badge variant="warning">Step 3</Badge>
            </View>
            <Typography
              variant="bodySmall"
              style={{ color: isDark ? "#FBBF24" : "#92400E", marginBottom: 14 }}
            >
              Test your understanding with a multiple-choice quiz.
            </Typography>
            <Button
              onPress={() =>
                router.push({
                  pathname: "/quiz/[id]",
                  params: { id: quiz.id },
                })
              }
            >
              Take Quiz
            </Button>
          </View>
        ) : (
          <View
            style={{
              backgroundColor: cardBg,
              borderRadius: 16,
              borderWidth: 1,
              borderColor,
              padding: 20,
            }}
          >
            <Typography
              variant="body"
              style={{ textAlign: "center", color: mutedText }}
            >
              No quiz for this lesson yet.
            </Typography>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
