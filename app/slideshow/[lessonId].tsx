import { useEffect, useRef, useState } from "react";
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
import type { SlideshowSlide } from "@/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SlideshowScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [slides, setSlides] = useState<SlideshowSlide[]>([]);
  const [lessonTitle, setLessonTitle] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function load() {
      if (!lessonId) return;
      const { data } = await supabase
        .from("lessons")
        .select("title, slideshow_cards")
        .eq("id", lessonId)
        .single();
      if (data) {
        setLessonTitle(data.title);
        setSlides(
          (data.slideshow_cards as SlideshowSlide[]).sort(
            (a, b) => a.order - b.order,
          ),
        );
      }
    }
    load();
  }, [lessonId]);

  function goToSlide(index: number) {
    if (index < 0 || index >= slides.length) return;
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  }

  function handleDone() {
    router.back();
  }

  const bg = isDark ? "#0C0A09" : "#FAFAF9";
  const cardBg = isDark ? "#1C1917" : "#FFFFFF";
  const borderColor = isDark ? "#44403C" : "#E7E5E4";
  const mutedText = isDark ? "#A8A29E" : "#78716C";
  const accentColor = isDark ? "#5EEAD4" : "#0D9488";

  function renderSlide({ item, index }: { item: SlideshowSlide; index: number }) {
    return (
      <View style={{ width: SCREEN_WIDTH, paddingHorizontal: 16 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: cardBg,
            borderRadius: 20,
            borderWidth: 1,
            borderColor,
            padding: 24,
            justifyContent: "center",
          }}
        >
          <Typography
            variant="overline"
            style={{ color: accentColor, marginBottom: 8 }}
          >
            SLIDE {index + 1} OF {slides.length}
          </Typography>
          <Typography variant="h2" style={{ marginBottom: 16 }}>
            {item.title}
          </Typography>
          <Typography
            variant="body"
            style={{ lineHeight: 24, marginBottom: 20, color: isDark ? "#D6D3D1" : "#44403C" }}
          >
            {item.body}
          </Typography>

          {item.keyPoints.length > 0 && (
            <View
              style={{
                backgroundColor: isDark ? "#292524" : "#F5F5F4",
                borderRadius: 12,
                padding: 16,
                marginBottom: item.example ? 16 : 0,
              }}
            >
              <Typography
                variant="caption"
                style={{ color: accentColor, fontWeight: "600", marginBottom: 8 }}
              >
                KEY POINTS
              </Typography>
              {item.keyPoints.map((kp, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Typography variant="body" style={{ color: accentColor, marginRight: 8 }}>
                    •
                  </Typography>
                  <Typography
                    variant="bodySmall"
                    style={{ flex: 1, color: isDark ? "#D6D3D1" : "#57534E" }}
                  >
                    {kp}
                  </Typography>
                </View>
              ))}
            </View>
          )}

          {item.example ? (
            <View
              style={{
                backgroundColor: isDark ? "#422006" : "#FFFBEB",
                borderRadius: 12,
                padding: 16,
                borderLeftWidth: 3,
                borderLeftColor: "#F59E0B",
              }}
            >
              <Typography
                variant="caption"
                style={{ color: "#D97706", fontWeight: "600", marginBottom: 4 }}
              >
                EXAMPLE
              </Typography>
              <Typography
                variant="bodySmall"
                style={{ color: isDark ? "#FDE68A" : "#92400E" }}
              >
                {item.example}
              </Typography>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (!slides.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Typography variant="body" style={{ color: mutedText }}>
            Loading slides…
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
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
            {lessonTitle}
          </Typography>
          {/* Progress dots */}
          <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: i <= currentIndex ? accentColor : (isDark ? "#44403C" : "#E7E5E4"),
                }}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentIndex(idx);
        }}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      {/* Bottom nav */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingBottom: 16,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => goToSlide(currentIndex - 1)}
          disabled={currentIndex === 0}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#292524" : "#F5F5F4",
            opacity: currentIndex === 0 ? 0.4 : 1,
          }}
        >
          <Typography variant="body" style={{ color: isDark ? "#FAFAF9" : "#1C1917" }}>
            Previous
          </Typography>
        </Pressable>
        <Pressable
          onPress={isLastSlide ? handleDone : () => goToSlide(currentIndex + 1)}
          style={{
            flex: 1,
            height: 48,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accentColor,
          }}
        >
          <Typography variant="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
            {isLastSlide ? "Done" : "Next"}
          </Typography>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
