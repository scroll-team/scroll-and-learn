import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-xl",
};

interface IconButtonProps extends Omit<PressableProps, "children"> {
  size?: Size;
  variant?: "default" | "filled";
  children: React.ReactNode;
  className?: string;
}

export function IconButton({
  size = "md",
  variant = "default",
  children,
  className = "",
  disabled,
  ...rest
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bgClass =
    variant === "filled"
      ? "bg-teal-50 dark:bg-teal-900"
      : "bg-transparent";

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        className={`items-center justify-center ${sizeClasses[size]} ${bgClass} ${disabled ? "opacity-50" : ""} ${className}`}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
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
