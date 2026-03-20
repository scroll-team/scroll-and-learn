import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  pollPipelineStep,
  type StudyPlanGenerationOptions,
} from "@/services/study-plan";
import type { Collection, Document, StudyPlan, DocumentStatus, PipelineStep } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";

const LANGUAGES = [
  { label: "Auto-detect", value: "auto" },
  { label: "English", value: "English" },
  { label: "Italian", value: "Italian" },
  { label: "Spanish", value: "Spanish" },
  { label: "French", value: "French" },
  { label: "German", value: "German" },
  { label: "Portuguese", value: "Portuguese" },
];

const DIFFICULTIES: { label: string; value: Difficulty; description: string }[] = [
  { label: "Easy", value: "easy", description: "Basic recall" },
  { label: "Medium", value: "medium", description: "Apply concepts" },
  { label: "Hard", value: "hard", description: "Deep analysis" },
];

// ── StudyPlanOptionsModal ─────────────────────────────────────────────────────

interface StudyPlanOptionsModalProps {
  visible: boolean;
  isDark: boolean;
  onCancel: () => void;
  onConfirm: (options: StudyPlanGenerationOptions) => void;
}

function StudyPlanOptionsModal({
  visible,
  isDark,
  onCancel,
  onConfirm,
}: StudyPlanOptionsModalProps) {
  const [language, setLanguage] = useState("auto");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [focus, setFocus] = useState("");

  const bg = isDark ? "#1C1917" : "#FFFFFF";
  const overlayBg = "rgba(0,0,0,0.6)";
  const border = isDark ? "#44403C" : "#E7E5E4";
  const mutedText = isDark ? "#A8A29E" : "#78716C";
  const inputBg = isDark ? "#292524" : "#F5F5F4";
  const inputBorder = isDark ? "#57534E" : "#D6D3D1";

  function handleConfirm() {
    onConfirm({
      language: language === "auto" ? undefined : language,
      difficulty,
      focus: focus.trim() || undefined,
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: overlayBg, justifyContent: "flex-end" }}
          onPress={onCancel}
        >
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: bg,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 12,
                paddingBottom: Platform.OS === "ios" ? 36 : 24,
                maxHeight: "90%",
              }}
            >
              {/* Drag handle */}
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: isDark ? "#57534E" : "#D6D3D1",
                  alignSelf: "center",
                  marginBottom: 20,
                }}
              />

              <ScrollView
                style={{ paddingHorizontal: 20 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title */}
                <Typography variant="h2" style={{ marginBottom: 4 }}>
                  Study Plan Settings
                </Typography>
                <Typography
                  variant="bodySmall"
                  style={{ color: mutedText, marginBottom: 24 }}
                >
                  Customise how the AI builds your study plan.
                </Typography>

                {/* ── Language ── */}
                <Typography variant="h3" style={{ marginBottom: 10 }}>
                  Language
                </Typography>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 24,
                  }}
                >
                  {LANGUAGES.map((lang) => {
                    const selected = language === lang.value;
                    return (
                      <Pressable
                        key={lang.value}
                        onPress={() => setLanguage(lang.value)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 7,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: selected
                            ? isDark ? "#5EEAD4" : "#0D9488"
                            : border,
                          backgroundColor: selected
                            ? isDark ? "#134E4A" : "#CCFBF1"
                            : "transparent",
                        }}
                      >
                        <Typography
                          variant="bodySmall"
                          style={{
                            color: selected
                              ? isDark ? "#99F6E4" : "#0F766E"
                              : mutedText,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {lang.label}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>

                {/* ── Difficulty ── */}
                <Typography variant="h3" style={{ marginBottom: 10 }}>
                  Quiz Difficulty
                </Typography>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    marginBottom: 24,
                  }}
                >
                  {DIFFICULTIES.map((d) => {
                    const selected = difficulty === d.value;
                    const colors = {
                      easy: { active: "#16A34A", activeBg: isDark ? "#14532D" : "#DCFCE7", activeBorder: isDark ? "#16A34A" : "#86EFAC" },
                      medium: { active: isDark ? "#5EEAD4" : "#0D9488", activeBg: isDark ? "#134E4A" : "#CCFBF1", activeBorder: isDark ? "#5EEAD4" : "#0D9488" },
                      hard: { active: "#DC2626", activeBg: isDark ? "#7F1D1D" : "#FEE2E2", activeBorder: isDark ? "#DC2626" : "#FCA5A5" },
                    }[d.value];
                    return (
                      <Pressable
                        key={d.value}
                        onPress={() => setDifficulty(d.value)}
                        style={{
                          flex: 1,
                          alignItems: "center",
                          paddingVertical: 10,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: selected ? colors.activeBorder : border,
                          backgroundColor: selected ? colors.activeBg : "transparent",
                        }}
                      >
                        <Typography
                          variant="body"
                          style={{
                            color: selected ? colors.active : mutedText,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {d.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          style={{
                            color: selected ? colors.active : mutedText,
                            marginTop: 2,
                            opacity: 0.8,
                          }}
                        >
                          {d.description}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>

                {/* ── Focus ── */}
                <Typography variant="h3" style={{ marginBottom: 4 }}>
                  Focus
                </Typography>
                <Typography
                  variant="caption"
                  style={{ color: mutedText, marginBottom: 10 }}
                >
                  Tell the AI what to prioritise (optional)
                </Typography>
                <TextInput
                  value={focus}
                  onChangeText={setFocus}
                  placeholder="e.g. Focus on the math part, or emphasise the theory"
                  placeholderTextColor={mutedText}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: inputBg,
                    borderWidth: 1,
                    borderColor: inputBorder,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingTop: 12,
                    paddingBottom: 12,
                    color: isDark ? "#FAFAF9" : "#1C1917",
                    fontSize: 15,
                    lineHeight: 22,
                    minHeight: 80,
                    textAlignVertical: "top",
                    marginBottom: 28,
                  }}
                />

                {/* ── Actions ── */}
                <View style={{ gap: 10, marginBottom: 8 }}>
                  <Button onPress={handleConfirm}>Generate Study Plan</Button>
                  <Button variant="ghost" onPress={onCancel}>
                    Cancel
                  </Button>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Pipeline Progress Indicator ───────────────────────────────────────────────

const PIPELINE_STEPS: { key: PipelineStep; label: string; icon: string }[] = [
  { key: "extracting", label: "Reading PDFs", icon: "📄" },
  { key: "planning", label: "Designing curriculum", icon: "🏗️" },
  { key: "creating", label: "Creating content", icon: "✍️" },
  { key: "reviewing", label: "Quality review", icon: "🔍" },
  { key: "retrying", label: "Fixing issues", icon: "🔄" },
  { key: "saving", label: "Saving results", icon: "💾" },
];

function PipelineProgress({ step, isDark }: { step: PipelineStep | null; isDark: boolean }) {
  const activeColor = isDark ? "#5EEAD4" : "#0D9488";
  const doneColor = isDark ? "#5EEAD4" : "#0D9488";
  const pendingColor = isDark ? "#57534E" : "#D6D3D1";
  const activeTextColor = isDark ? "#CCFBF1" : "#0F766E";
  const pendingTextColor = isDark ? "#78716C" : "#A8A29E";

  const currentIdx = step ? PIPELINE_STEPS.findIndex((s) => s.key === step) : -1;
  const visibleSteps = PIPELINE_STEPS.filter((s) => s.key !== "retrying" || step === "retrying");

  return (
    <View style={{ gap: 6 }}>
      {visibleSteps.map((s) => {
        const idx = PIPELINE_STEPS.findIndex((ps) => ps.key === s.key);
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        const dotColor = isDone ? doneColor : isActive ? activeColor : pendingColor;
        const textColor = isDone || isActive ? activeTextColor : pendingTextColor;

        return (
          <View key={s.key} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: isDone ? dotColor : "transparent",
                borderWidth: 2,
                borderColor: dotColor,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isDone ? (
                <Typography variant="caption" style={{ color: isDark ? "#0C0A09" : "#FFFFFF", fontSize: 11 }}>
                  ✓
                </Typography>
              ) : isActive ? (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
              ) : null}
            </View>
            <Typography
              variant="bodySmall"
              style={{
                color: textColor,
                fontWeight: isActive ? "600" : "400",
              }}
            >
              {s.icon} {s.label}{isActive ? "…" : ""}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}

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
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function handleGeneratePlan() {
    if (!user || !id || !collection) return;
    if (documents.length === 0) {
      Alert.alert("No files", "Upload at least one PDF before generating a study plan.");
      return;
    }
    setShowOptionsModal(true);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => () => stopPolling(), []);

  async function handleConfirmGenerate(options: StudyPlanGenerationOptions) {
    if (!user || !id || !collection) return;
    setShowOptionsModal(false);
    setIsGenerating(true);
    setPipelineStep("extracting");
    setCollection((prev) => (prev ? { ...prev, status: "processing" } : prev));

    // Start polling for pipeline progress
    pollRef.current = setInterval(async () => {
      const { step, status } = await pollPipelineStep(id);
      if (step) setPipelineStep(step);
      if (status === "ready" || status === "error") {
        stopPolling();
      }
    }, 3000);

    const { success, studyPlanId, error } = await generateStudyPlan(
      id,
      collection.title,
      user.id,
      options,
      (step) => setPipelineStep(step),
    );

    stopPolling();

    if (success && studyPlanId) {
      setPipelineStep("ready");
      setCollection((prev) => (prev ? { ...prev, status: "ready" } : prev));
      const { studyPlan: freshPlan } = await fetchStudyPlanForCollection(id);
      if (freshPlan) setStudyPlan(freshPlan);
    } else {
      setPipelineStep("error");
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
      <StudyPlanOptionsModal
        visible={showOptionsModal}
        isDark={isDark}
        onCancel={() => setShowOptionsModal(false)}
        onConfirm={handleConfirmGenerate}
      />
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
            <View>
              <View className="mb-3 flex-row items-center gap-3">
                <ActivityIndicator size="small" color="#0D9488" />
                <Typography
                  variant="h3"
                  className="text-teal-800 dark:text-teal-200"
                >
                  Generating Study Plan…
                </Typography>
              </View>
              <PipelineProgress step={pipelineStep} isDark={isDark} />
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
