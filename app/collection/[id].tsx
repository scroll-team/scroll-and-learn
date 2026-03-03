import { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import {
  Typography,
  Button,
  Badge,
  PressableCard,
  EmptyState,
  SkeletonCard,
  IconButton,
} from "@/components/ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/providers/auth-provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchCollection } from "@/services/collections";
import {
  fetchDocumentsForCollection,
  pickDocument,
  uploadDocument,
  deleteDocument,
} from "@/services/documents";
import {
  generateStudyPlan,
  fetchStudyPlanForCollection,
} from "@/services/study-plan";
import type { Collection, Document, StudyPlan, DocumentStatus } from "@/types";

const statusBadge: Record<
  DocumentStatus,
  { label: string; variant: "default" | "success" | "warning" | "error" | "brand" }
> = {
  uploaded: { label: "Uploaded", variant: "default" },
  processing: { label: "Processing…", variant: "warning" },
  ready: { label: "Ready", variant: "success" },
  error: { label: "Error", variant: "error" },
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [collection, setCollection] = useState<Collection | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [colRes, docsRes, planRes] = await Promise.all([
      fetchCollection(id),
      fetchDocumentsForCollection(id),
      fetchStudyPlanForCollection(id),
    ]);
    if (colRes.collection) setCollection(colRes.collection);
    setDocuments(docsRes.documents);
    if (planRes.studyPlan) setStudyPlan(planRes.studyPlan);
  }, [id]);

  useEffect(() => {
    load().finally(() => setIsLoading(false));
  }, [load]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }

  async function handleUpload() {
    if (!user || !id) return;
    const file = await pickDocument();
    if (!file) return;

    setIsUploading(true);
    const { document, error } = await uploadDocument(user.id, file, id);
    setIsUploading(false);

    if (error) {
      Alert.alert("Upload failed", error);
      return;
    }
    if (document) {
      setDocuments((prev) => [document, ...prev]);
      // Reset collection status to active so the plan can be regenerated
      setCollection((prev) =>
        prev ? { ...prev, status: "active" } : prev,
      );
      setStudyPlan(null);
    }
  }

  async function handleGeneratePlan() {
    if (!user || !id || !collection) return;
    if (documents.length === 0) {
      Alert.alert("No files", "Upload at least one PDF before generating a study plan.");
      return;
    }

    setIsGenerating(true);
    setCollection((prev) => (prev ? { ...prev, status: "processing" } : prev));

    const { success, studyPlanId, error } = await generateStudyPlan(
      id,
      collection.title,
      user.id,
    );

    if (success && studyPlanId) {
      setCollection((prev) => (prev ? { ...prev, status: "ready" } : prev));
      const { studyPlan: freshPlan } = await fetchStudyPlanForCollection(id);
      if (freshPlan) setStudyPlan(freshPlan);
    } else {
      setCollection((prev) => (prev ? { ...prev, status: "error" } : prev));
      Alert.alert("Generation failed", error ?? "Something went wrong");
    }
    setIsGenerating(false);
  }

  function handleDeleteDocument(doc: Document) {
    Alert.alert(
      "Remove file",
      `Remove "${doc.title}" from this collection?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteDocument(doc.id, doc.filePath);
            if (error) {
              Alert.alert("Error", error);
            } else {
              setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
              setStudyPlan(null);
              setCollection((prev) =>
                prev ? { ...prev, status: "active" } : prev,
              );
            }
          },
        },
      ],
    );
  }

  function renderDocument({ item }: { item: Document }) {
    const badge = statusBadge[item.status];
    return (
      <PressableCard className="mb-2">
        <View className="flex-row items-center">
          <View className="mr-3 h-9 w-9 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950">
            <Typography variant="caption" className="font-inter-semibold text-red-500">
              PDF
            </Typography>
          </View>
          <View className="flex-1">
            <Typography variant="body" numberOfLines={1}>
              {item.title}
            </Typography>
            <View className="mt-0.5 flex-row items-center gap-2">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {item.fileSize ? (
                <Typography variant="caption">
                  {formatFileSize(item.fileSize)}
                </Typography>
              ) : null}
            </View>
          </View>
          <IconButton size="sm" onPress={() => handleDeleteDocument(item)}>
            <IconSymbol
              name="trash.fill"
              size={14}
              color={isDark ? "#EF4444" : "#DC2626"}
            />
          </IconButton>
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
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </SafeAreaView>
    );
  }

  const canGenerate =
    documents.length > 0 &&
    !isGenerating &&
    collection?.status !== "processing";
  const hasReadyPlan = studyPlan?.status === "ready";
  const isProcessing =
    isGenerating || collection?.status === "processing";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}
      edges={["top"]}
    >
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        {/* Header */}
        <View className="mb-5 flex-row items-center">
          <IconButton size="sm" onPress={() => router.back()} className="mr-3">
            <IconSymbol
              name="chevron.left"
              size={18}
              color={isDark ? "#FAFAF9" : "#1C1917"}
            />
          </IconButton>
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950">
            <Typography variant="h2">{collection?.emoji ?? "📚"}</Typography>
          </View>
          <View className="flex-1">
            <Typography variant="h2" numberOfLines={1}>
              {collection?.title ?? "Collection"}
            </Typography>
            <Typography variant="caption">
              {documents.length} {documents.length === 1 ? "file" : "files"}
            </Typography>
          </View>
        </View>

        {/* Study Plan Status Card */}
        <View
          className="mb-5 rounded-2xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-950"
        >
          {isProcessing ? (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator size="small" color="#0D9488" />
              <View className="flex-1">
                <Typography
                  variant="h3"
                  className="text-teal-800 dark:text-teal-200"
                >
                  Generating Study Plan…
                </Typography>
                <Typography
                  variant="bodySmall"
                  className="mt-0.5 text-teal-600 dark:text-teal-400"
                >
                  The AI is reading your files and building lessons.
                </Typography>
              </View>
            </View>
          ) : hasReadyPlan ? (
            <View>
              <Typography
                variant="h3"
                className="text-teal-800 dark:text-teal-200"
              >
                Study Plan Ready
              </Typography>
              <Typography
                variant="bodySmall"
                className="mt-0.5 text-teal-600 dark:text-teal-400"
              >
                {studyPlan?.title}
              </Typography>
              <View className="mt-3 gap-2">
                <Button
                  size="sm"
                  onPress={() =>
                    router.push({
                      pathname: "/study-plan/[id]",
                      params: { id: studyPlan!.id },
                    })
                  }
                >
                  Open Study Plan
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={isGenerating}
                  onPress={handleGeneratePlan}
                >
                  Regenerate
                </Button>
              </View>
            </View>
          ) : collection?.status === "error" ? (
            <View>
              <Typography
                variant="h3"
                className="text-red-700 dark:text-red-400"
              >
                Generation Failed
              </Typography>
              <Typography
                variant="bodySmall"
                className="mt-0.5 text-red-600 dark:text-red-400"
              >
                Something went wrong. Try again below.
              </Typography>
              <View className="mt-3">
                <Button
                  size="sm"
                  loading={isGenerating}
                  disabled={!canGenerate}
                  onPress={handleGeneratePlan}
                >
                  Retry Generation
                </Button>
              </View>
            </View>
          ) : (
            <View>
              <Typography
                variant="h3"
                className="text-teal-800 dark:text-teal-200"
              >
                Ready to Generate
              </Typography>
              <Typography
                variant="bodySmall"
                className="mt-0.5 mb-3 text-teal-600 dark:text-teal-400"
              >
                {documents.length === 0
                  ? "Upload your PDFs below, then generate a study plan."
                  : `${documents.length} file${documents.length > 1 ? "s" : ""} uploaded. Tap to generate your AI study plan.`}
              </Typography>
              <Button
                size="sm"
                loading={isGenerating}
                disabled={!canGenerate}
                onPress={handleGeneratePlan}
              >
                Generate Study Plan
              </Button>
            </View>
          )}
        </View>

        {/* Files section */}
        <View className="mb-3 flex-row items-center justify-between">
          <Typography variant="h3">Files</Typography>
          <Button size="sm" variant="secondary" loading={isUploading} onPress={handleUpload}>
            Add PDF
          </Button>
        </View>

        {documents.length === 0 ? (
          <EmptyState
            icon={
              <View className="h-12 w-12 items-center justify-center rounded-xl bg-stone-100 dark:bg-stone-800">
                <IconSymbol
                  name="arrow.up.doc.fill"
                  size={24}
                  color={isDark ? "#78716C" : "#A8A29E"}
                />
              </View>
            }
            title="No files yet"
            description="Upload PDFs for this collection."
            actionLabel="Upload PDF"
            onAction={handleUpload}
          />
        ) : (
          <FlatList
            data={documents}
            renderItem={renderDocument}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 32 }}
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
