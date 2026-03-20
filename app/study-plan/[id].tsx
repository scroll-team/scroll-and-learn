import { useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Typography, PressableCard, IconButton, SkeletonCard } from "@/components/ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import { fetchLessonsForPlan } from "@/services/study-plan";
import type { StudyPlan, Lesson } from "@/types";

export default function StudyPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const [planRes, lessonsRes] = await Promise.all([
        supabase.from("study_plans").select("*").eq("id", id).single(),
        fetchLessonsForPlan(id),
      ]);

      if (planRes.data) {
        setStudyPlan({
          id: planRes.data.id,
          collectionId: planRes.data.collection_id,
          userId: planRes.data.user_id,
          title: planRes.data.title,
          description: planRes.data.description ?? null,
          status: planRes.data.status,
          pipelineStep: planRes.data.pipeline_step ?? null,
          createdAt: planRes.data.created_at,
        });
      }
      setLessons(lessonsRes.lessons);
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
          <ActivityIndicator size="large" color="#0D9488" />
          <View className="mt-6 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
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
        {/* Header */}
        <View className="mb-2 flex-row items-center">
          <IconButton size="sm" onPress={() => router.back()} className="mr-3">
            <IconSymbol
              name="chevron.left"
              size={18}
              color={isDark ? "#FAFAF9" : "#1C1917"}
            />
          </IconButton>
          <Typography variant="caption" className="text-teal-600 dark:text-teal-400">
            Study Plan
          </Typography>
        </View>

        <Typography variant="h1" className="mb-1">
          {studyPlan?.title ?? "Study Plan"}
        </Typography>
        {studyPlan?.description ? (
          <Typography variant="body" className="mb-6 text-stone-500 dark:text-stone-400">
            {studyPlan.description}
          </Typography>
        ) : null}

        {/* Progress summary */}
        <View className="mb-6 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800">
          <View className="flex-row items-center justify-between">
            <Typography variant="h3">
              {lessons.length} Lessons
            </Typography>
            <Typography variant="caption">
              {lessons.length * 5} total questions
            </Typography>
          </View>
        </View>

        {/* Lessons */}
        <Typography variant="h2" className="mb-3">
          Lessons
        </Typography>

        {lessons.map((lesson, index) => (
          <PressableCard
            key={lesson.id}
            className="mb-3"
            onPress={() =>
              router.push({
                pathname: "/lesson/[id]",
                params: { id: lesson.id },
              })
            }
          >
            <View className="flex-row items-center">
              {/* Lesson number badge */}
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: isDark ? "#134E4A" : "#CCFBF1",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Typography
                  variant="h3"
                  className="text-teal-700 dark:text-teal-300"
                >
                  {index + 1}
                </Typography>
              </View>

              <View className="flex-1">
                <Typography variant="h3" numberOfLines={2}>
                  {lesson.title}
                </Typography>
                {lesson.summary ? (
                  <Typography
                    variant="bodySmall"
                    numberOfLines={2}
                    className="mt-0.5 text-stone-500 dark:text-stone-400"
                  >
                    {lesson.summary}
                  </Typography>
                ) : null}
                {lesson.quiz ? (
                  <Typography variant="caption" className="mt-1 text-teal-600 dark:text-teal-400">
                    {lesson.quiz.questions.length} questions
                  </Typography>
                ) : null}
              </View>

              <IconSymbol
                name="chevron.right"
                size={16}
                color={isDark ? "#78716C" : "#A8A29E"}
              />
            </View>
          </PressableCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
