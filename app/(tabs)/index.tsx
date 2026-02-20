import { useCallback, useEffect, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import {
  fetchDocuments,
  pickDocument,
  uploadDocument,
  deleteDocument,
} from "@/services/documents";
import type { Document, DocumentStatus } from "@/types";

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
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LibraryScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    const { documents: docs } = await fetchDocuments(user.id);
    setDocuments(docs);
  }, [user]);

  useEffect(() => {
    loadDocuments().finally(() => setIsLoading(false));
  }, [loadDocuments]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await loadDocuments();
    setIsRefreshing(false);
  }

  async function handleUpload() {
    if (!user) return;

    const file = await pickDocument();
    if (!file) return;

    setIsUploading(true);
    const { document, error } = await uploadDocument(user.id, file);
    setIsUploading(false);

    if (error) {
      Alert.alert("Upload failed", error);
      return;
    }

    if (document) {
      setDocuments((prev) => [document, ...prev]);
    }
  }

  function handleDelete(doc: Document) {
    Alert.alert("Delete document", `Remove "${doc.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await deleteDocument(doc.id, doc.filePath);
          if (error) {
            Alert.alert("Error", error);
          } else {
            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
          }
        },
      },
    ]);
  }

  function renderDocument({ item }: { item: Document }) {
    const badge = statusBadge[item.status];
    return (
      <PressableCard className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950">
            <Typography variant="body" className="text-red-500">
              PDF
            </Typography>
          </View>
          <View className="flex-1">
            <Typography variant="h3" numberOfLines={1}>
              {item.title}
            </Typography>
            <View className="mt-1 flex-row items-center gap-2">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {item.pageCount && (
                <Typography variant="caption">
                  {item.pageCount} pages
                </Typography>
              )}
            </View>
          </View>
          <IconButton size="sm" onPress={() => handleDelete(item)}>
            <IconSymbol name="trash.fill" size={16} color={isDark ? "#EF4444" : "#DC2626"} />
          </IconButton>
        </View>
        <View className="mt-2 flex-row items-center justify-between">
          <Typography variant="caption">
            {formatDate(item.createdAt)}
          </Typography>
          <Typography variant="caption">
            {formatFileSize(item.fileSize)}
          </Typography>
        </View>
      </PressableCard>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }} edges={["top"]}>
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
          <Typography variant="h1">Library</Typography>
          <Typography variant="bodySmall" className="mt-1">
            Your uploaded documents.
          </Typography>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }} edges={["top"]}>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Typography variant="h1">Library</Typography>
            <Typography variant="bodySmall" className="mt-1">
              {documents.length
                ? `${documents.length} document${documents.length > 1 ? "s" : ""}`
                : "Your uploaded documents."}
            </Typography>
          </View>
          <Button size="sm" loading={isUploading} onPress={handleUpload}>
            Upload PDF
          </Button>
        </View>

        {documents.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              icon={
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900">
                  <IconSymbol name="book.fill" size={32} color={isDark ? "#5EEAD4" : "#0D9488"} />
                </View>
              }
              title="No documents yet"
              description="Upload a PDF to start generating quizzes and study content."
              actionLabel="Upload your first PDF"
              onAction={handleUpload}
            />
          </View>
        ) : (
          <FlatList
            data={documents}
            renderItem={renderDocument}
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

        {isUploading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View className="items-center gap-3 rounded-2xl bg-white p-6 dark:bg-stone-800" style={{ shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}>
              <ActivityIndicator size="large" color="#0D9488" />
              <Typography variant="h3">Uploading…</Typography>
              <Typography variant="bodySmall">This may take a moment</Typography>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
