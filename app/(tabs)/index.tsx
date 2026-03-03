import { useCallback, useState } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
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
  fetchCollections,
  createCollection,
  deleteCollection,
  randomEmoji,
} from "@/services/collections";
import type { Collection, CollectionStatus } from "@/types";

const EMOJI_OPTIONS = [
  "📚", "🧮", "🔬", "🏛️", "💻", "🎨", "🌍",
  "🧬", "📐", "🎵", "⚗️", "🏆", "🧪", "📊", "🗺️",
];

const statusBadge: Record<
  CollectionStatus,
  { label: string; variant: "default" | "success" | "warning" | "error" | "brand" }
> = {
  active: { label: "No plan yet", variant: "default" },
  processing: { label: "Generating…", variant: "warning" },
  ready: { label: "Ready", variant: "success" },
  error: { label: "Error", variant: "error" },
};

export default function LibraryScreen() {
  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState(randomEmoji());
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { collections: data } = await fetchCollections(user.id);
    setCollections(data);
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

  async function handleCreate() {
    if (!user || !newTitle.trim()) return;
    setIsCreating(true);
    const { collection, error } = await createCollection(
      user.id,
      newTitle.trim(),
      newEmoji,
    );
    setIsCreating(false);
    if (error) {
      Alert.alert("Error", error);
      return;
    }
    if (collection) {
      setCollections((prev) => [collection, ...prev]);
    }
    setShowCreateModal(false);
    setNewTitle("");
    setNewEmoji(randomEmoji());
  }

  function openCreate() {
    setNewTitle("");
    setNewEmoji(randomEmoji());
    setShowCreateModal(true);
  }

  function handleDelete(col: Collection) {
    Alert.alert(
      "Delete Collection",
      `Delete "${col.title}"? This will also delete its study plan and all lessons. PDFs will remain in your account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteCollection(col.id);
            if (error) {
              Alert.alert("Error", error);
            } else {
              setCollections((prev) => prev.filter((c) => c.id !== col.id));
            }
          },
        },
      ],
    );
  }

  function renderCollection({ item }: { item: Collection }) {
    const badge = statusBadge[item.status];
    const docCount = item.documentCount ?? 0;

    return (
      <PressableCard
        className="mb-3"
        onPress={() =>
          router.push({
            pathname: "/collection/[id]",
            params: { id: item.id },
          })
        }
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-950">
            <Typography variant="h2">{item.emoji}</Typography>
          </View>
          <View className="flex-1">
            <Typography variant="h3" numberOfLines={1}>
              {item.title}
            </Typography>
            <View className="mt-1 flex-row items-center gap-2">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              <Typography variant="caption">
                {docCount} {docCount === 1 ? "file" : "files"}
              </Typography>
            </View>
          </View>
          <View className="flex-row items-center gap-1">
            <IconButton size="sm" onPress={() => handleDelete(item)}>
              <IconSymbol
                name="trash.fill"
                size={15}
                color={isDark ? "#EF4444" : "#DC2626"}
              />
            </IconButton>
            <IconSymbol
              name="chevron.right"
              size={16}
              color={isDark ? "#78716C" : "#A8A29E"}
            />
          </View>
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
          <Typography variant="h1">Library</Typography>
          <Typography variant="bodySmall" className="mt-1">
            Your study collections.
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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0C0A09" : "#FAFAF9" }}
      edges={["top"]}
    >
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }}>
        <View className="flex-row items-center justify-between">
          <View>
            <Typography variant="h1">Library</Typography>
            <Typography variant="bodySmall" className="mt-1">
              {collections.length
                ? `${collections.length} collection${collections.length > 1 ? "s" : ""}`
                : "Your study collections."}
            </Typography>
          </View>
          <Button size="sm" onPress={openCreate}>
            New Collection
          </Button>
        </View>

        {collections.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState
              icon={
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 dark:bg-teal-900">
                  <IconSymbol
                    name="book.fill"
                    size={32}
                    color={isDark ? "#5EEAD4" : "#0D9488"}
                  />
                </View>
              }
              title="No collections yet"
              description="Create a collection, upload your PDFs, and let AI build your study plan."
              actionLabel="Create your first collection"
              onAction={openCreate}
            />
          </View>
        ) : (
          <FlatList
            data={collections}
            renderItem={renderCollection}
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

      {/* Create Collection Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowCreateModal(false)}
        >
          <Pressable onPress={() => {}}>
            <View
              style={{
                backgroundColor: isDark ? "#1C1917" : "#FFFFFF",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: 40,
              }}
            >
              <Typography variant="h2" className="mb-6 text-center">
                New Collection
              </Typography>

              {/* Emoji picker */}
              <Typography variant="caption" className="mb-2">
                CHOOSE AN ICON
              </Typography>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-5"
              >
                <View className="flex-row gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => setNewEmoji(emoji)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor:
                          newEmoji === emoji
                            ? isDark
                              ? "#134E4A"
                              : "#CCFBF1"
                            : isDark
                              ? "#292524"
                              : "#F5F5F4",
                        borderWidth: newEmoji === emoji ? 2 : 0,
                        borderColor: "#0D9488",
                      }}
                    >
                      <Typography variant="h3">{emoji}</Typography>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {/* Title input */}
              <Typography variant="caption" className="mb-2">
                COLLECTION NAME
              </Typography>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Mathematics, Biology 101…"
                placeholderTextColor={isDark ? "#78716C" : "#A8A29E"}
                autoFocus
                style={{
                  backgroundColor: isDark ? "#292524" : "#F5F5F4",
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: isDark ? "#FAFAF9" : "#1C1917",
                  marginBottom: 20,
                }}
              />

              <Button
                loading={isCreating}
                onPress={handleCreate}
                disabled={!newTitle.trim()}
              >
                Create Collection
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
