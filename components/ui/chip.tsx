import { Pressable } from "react-native";
import { Typography } from "./typography";

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  className = "",
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`self-start rounded-full border px-3.5 py-1.5 ${
        selected
          ? "border-teal-600 bg-teal-50 dark:border-teal-400 dark:bg-teal-900"
          : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"
      } ${className}`}
    >
      <Typography
        variant="caption"
        className={`font-inter-semibold ${
          selected
            ? "text-teal-800 dark:text-teal-300"
            : "text-stone-600 dark:text-stone-400"
        }`}
      >
        {label}
      </Typography>
    </Pressable>
  );
}
