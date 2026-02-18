import { useEffect } from "react";
import { View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type ProgressVariant = "brand" | "reward" | "success" | "energy";

const fillColors: Record<ProgressVariant, string> = {
  brand: "#0D9488",
  reward: "#F59E0B",
  success: "#22C55E",
  energy: "#F97316",
};

interface ProgressBarProps {
  /** 0 to 1 */
  progress: number;
  variant?: ProgressVariant;
  height?: number;
  className?: string;
}

export function ProgressBar({
  progress,
  variant = "brand",
  height = 8,
  className = "",
}: ProgressBarProps) {
  const width = useSharedValue(0);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    width.value = withSpring(Math.min(Math.max(progress, 0), 1), {
      damping: 20,
      stiffness: 120,
    });
  }, [progress, width]);

  const trackColor = colorScheme === "dark" ? "#292524" : "#E7E5E4";

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
    height,
    borderRadius: height / 2,
    backgroundColor: fillColors[variant],
  }));

  return (
    <View
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{ height, backgroundColor: trackColor }}
    >
      <Animated.View style={animatedStyle} />
    </View>
  );
}
