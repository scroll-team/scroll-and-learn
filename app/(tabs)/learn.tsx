import { useCallback, useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
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
import { fetchAllStudyPlans } from "@/services/study-plan";
import type { StudyPlan } from "@/types";

type EnrichedStudyPlan = StudyPlan & {
  collectionTitle?: string;
  collectionEmoji?: string;
};

export default function LearnScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [studyPlans, setStudyPlans] = useState<EnrichedStudyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { studyPlans: data } = await fetchAllStudyPlans(user.id);
    setStudyPlans(data);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  function renderStudyPlan({ item }: { item: EnrichedStudyPlan }) {
    return (
      <PressableCard
        className="mb-3"
        onPress={() =>
          router.push({
            pathname: "/study-plan/[id]",
            params: { id: item.id },
          })
        }
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950">
            <Typography variant="h2">
              {item.collectionEmoji ?? "📚"}
            </Typography>
          </View>
          <View className="flex-1">
            <Typography variant="h3" numberOfLines={2}>
              {item.title}
            </Typography>
            {item.collectionTitle ? (
              <Typography
                variant="caption"
                className="mt-0.5 text-stone-500 dark:text-stone-400"
                numberOfLines={1}
              >
                {item.collectionTitle}
              </Typography>
            ) : null}
            {item.description ? (
              <Typography
                variant="bodySmall"
                numberOfLines={2}
                className="mt-1 text-stone-500 dark:text-stone-400"
              >
                {item.description}
              </Typography>
            ) : null}
            <View className="mt-2 flex-row items-center gap-2">
              <Badge variant="success">Ready</Badge>
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
      <SafeAreaView
        style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}
        edges={["top"]}
      >
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <Typography variant="h1">Learn</Typography>
          <Typography variant="bodySmall" className="mt-1">
            Your study plans.
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}
      edges={["top"]}
    >
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        <Typography variant="h1">Learn</Typography>
        <Typography variant="bodySmall" className="mt-1">
          {studyPlans.length
            ? `${studyPlans.length} study plan${studyPlans.length > 1 ? "s" : ""}`
            : "Your study plans."}
        </Typography>

        {studyPlans.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              icon={
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900">
                  <IconSymbol
                    name="flame.fill"
                    size={32}
                    color={isDark ? "#FCD34D" : "#D97706"}
                  />
                </View>
              }
              title="No study plans yet"
              description="Create a collection in the Library tab, upload your PDFs, and generate a study plan."
              actionLabel="Go to Library"
              onAction={() => router.push("/(tabs)")}
            />
          </View>
        ) : (
          <FlatList
            data={studyPlans}
            renderItem={renderStudyPlan}
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
