import { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Typography, IconButton } from "@/components/ui";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { supabase } from "@/lib/supabase";
import type { StoryCardItem } from "@/types";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const CARD_COLORS = [
  { bg: "#0D9488", text: "#FFFFFF", sub: "#CCFBF1" },
  { bg: "#7C3AED", text: "#FFFFFF", sub: "#EDE9FE" },
  { bg: "#DC2626", text: "#FFFFFF", sub: "#FEE2E2" },
  { bg: "#2563EB", text: "#FFFFFF", sub: "#DBEAFE" },
  { bg: "#D97706", text: "#FFFFFF", sub: "#FEF3C7" },
  { bg: "#059669", text: "#FFFFFF", sub: "#D1FAE5" },
  { bg: "#DB2777", text: "#FFFFFF", sub: "#FCE7F3" },
];

export default function StoriesScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [cards, setCards] = useState<StoryCardItem[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function load() {
      if (!lessonId) return;
      const { data } = await supabase
        .from("lessons")
        .select("title, story_cards")
        .eq("id", lessonId)
        .single();
      if (data) {
        setLessonTitle(data.title);
        setCards(
          (data.story_cards as StoryCardItem[]).sort(
            (a, b) => a.order - b.order,
          ),
        );
      }
    }
    load();
  }, [lessonId]);

  const safeAreaBg = isDark ? "#0C0A09" : "#FAFAF9";
  const mutedText = isDark ? "#A8A29E" : "#78716C";

  function renderCard({ item, index }: { item: StoryCardItem; index: number }) {
    const palette = CARD_COLORS[index % CARD_COLORS.length];
    const isLast = index === cards.length - 1;

    return (
      <View
        style={{
          height: SCREEN_HEIGHT - 120,
          width: SCREEN_WIDTH,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: palette.bg,
            borderRadius: 24,
            padding: 32,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography
            variant="h1"
            style={{
              fontSize: 56,
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {item.emoji}
          </Typography>
          <Typography
            variant="h2"
            style={{
              color: palette.text,
              textAlign: "center",
              marginBottom: 16,
              fontSize: 26,
              lineHeight: 34,
            }}
          >
            {item.headline}
          </Typography>
          <Typography
            variant="body"
            style={{
              color: palette.sub,
              textAlign: "center",
              fontSize: 17,
              lineHeight: 26,
              paddingHorizontal: 8,
            }}
          >
            {item.body}
          </Typography>

          {/* Card counter */}
          <View
            style={{
              position: "absolute",
              bottom: 24,
              alignSelf: "center",
              backgroundColor: "rgba(0,0,0,0.2)",
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Typography
              variant="caption"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {index + 1} / {cards.length}
            </Typography>
          </View>

          {isLast && (
            <Pressable
              onPress={() => router.back()}
              style={{
                position: "absolute",
                bottom: 60,
                backgroundColor: "rgba(255,255,255,0.25)",
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 16,
              }}
            >
              <Typography
                variant="body"
                style={{ color: "#FFFFFF", fontWeight: "600" }}
              >
                Done
              </Typography>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (!cards.length) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: safeAreaBg }}
        edges={["top"]}
      >
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Typography variant="body" style={{ color: mutedText }}>
            Loading story cards…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: safeAreaBg }}
      edges={["top"]}
    >
      {/* Header overlay */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <IconButton size="sm" onPress={() => router.back()}>
          <IconSymbol
            name="xmark"
            size={16}
            color={isDark ? "#FAFAF9" : "#1C1917"}
          />
        </IconButton>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Typography variant="caption" numberOfLines={1} style={{ color: mutedText }}>
            {lessonTitle} — Quick Review
          </Typography>
          <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
            {cards.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor:
                    i <= currentIndex
                      ? (isDark ? "#5EEAD4" : "#0D9488")
                      : (isDark ? "#44403C" : "#E7E5E4"),
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Vertical scroll cards */}
      <FlatList
        data={cards}
        renderItem={renderCard}
        keyExtractor={(_, i) => String(i)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT - 120}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.y / (SCREEN_HEIGHT - 120),
          );
          setCurrentIndex(idx);
        }}
      />
    </SafeAreaView>
  );
}
