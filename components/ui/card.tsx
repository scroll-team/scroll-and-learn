import { Pressable, View, type PressableProps, type ViewProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const baseClasses =
  "rounded-xl bg-white p-4 border border-stone-200 dark:bg-stone-800 dark:border-stone-700";

interface CardProps extends ViewProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <View className={`${baseClasses} ${className}`} {...rest}>
      {children}
    </View>
  );
}

interface PressableCardProps extends Omit<PressableProps, "children"> {
  className?: string;
  children: React.ReactNode;
}

export function PressableCard({
  className = "",
  children,
  ...rest
}: PressableCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className={`${baseClasses} ${className}`}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
