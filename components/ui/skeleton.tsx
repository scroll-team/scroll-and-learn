import { useEffect } from "react";
import { View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  className?: string;
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  className = "",
}: SkeletonProps) {
  const opacity = useSharedValue(0.4);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const bgColor = colorScheme === "dark" ? "#44403C" : "#D6D3D1";

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width,
    height,
    borderRadius,
    backgroundColor: bgColor,
  }));

  return (
    <View className={className}>
      <Animated.View style={animatedStyle} />
    </View>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <View
      className={`gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-700 dark:bg-stone-800 ${className}`}
    >
      <Skeleton width="60%" height={14} />
      <Skeleton width="100%" height={10} />
      <Skeleton width="80%" height={10} />
      <View className="mt-1 flex-row gap-2">
        <Skeleton width={60} height={24} borderRadius={12} />
        <Skeleton width={80} height={24} borderRadius={12} />
      </View>
    </View>
  );
}
