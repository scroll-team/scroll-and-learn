import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Typography } from "./typography";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary: {
    container: "bg-teal-600 dark:bg-teal-500",
    text: "text-white",
  },
  secondary: {
    container: "border border-teal-600 bg-transparent dark:border-teal-400",
    text: "text-teal-600 dark:text-teal-400",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-teal-600 dark:text-teal-400",
  },
  destructive: {
    container: "bg-red-500 dark:bg-red-600",
    text: "text-white",
  },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: "h-9 px-3 rounded-lg", text: "text-sm" },
  md: { container: "h-12 px-5 rounded-xl", text: "text-[15px]" },
  lg: { container: "h-14 px-6 rounded-xl", text: "text-base" },
};

interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: string;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const spinnerColor =
    variant === "secondary" || variant === "ghost" ? "#0D9488" : "#FFFFFF";

  return (
    <Animated.View style={animatedStyle} className={className}>
      <Pressable
        className={`flex-row items-center justify-center ${variantClasses[variant].container} ${sizeClasses[size].container} ${isDisabled ? "opacity-50" : ""}`}
        disabled={isDisabled}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          <Typography
            variant="body"
            className={`font-inter-semibold ${variantClasses[variant].text} ${sizeClasses[size].text}`}
          >
            {children}
          </Typography>
        )}
      </Pressable>
    </Animated.View>
  );
}
