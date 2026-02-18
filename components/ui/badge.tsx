import { View, Text } from "react-native";

type BadgeVariant = "default" | "success" | "warning" | "error" | "brand";

const variantClasses: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: "bg-stone-200 dark:bg-stone-700", text: "text-stone-700 dark:text-stone-300" },
  success: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-800 dark:text-green-300" },
  warning: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-800 dark:text-amber-300" },
  error: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-800 dark:text-red-300" },
  brand: { bg: "bg-teal-100 dark:bg-teal-900", text: "text-teal-800 dark:text-teal-300" },
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: string;
  className?: string;
}

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  const styles = variantClasses[variant];

  return (
    <View
      className={`self-start rounded-full px-2.5 py-1 ${styles.bg} ${className}`}
    >
      <Text className={`text-[11px] font-semibold ${styles.text}`}>
        {children}
      </Text>
    </View>
  );
}
