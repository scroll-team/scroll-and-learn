import { useState } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Typography } from "./typography";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  helperText,
  containerClassName = "",
  className = "",
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const borderClass = error
    ? "border-red-500"
    : isFocused
      ? "border-teal-600 dark:border-teal-400"
      : "border-stone-200 dark:border-stone-700";

  return (
    <View className={`gap-1.5 ${containerClassName}`}>
      {label && (
        <Typography variant="caption" className="font-inter-semibold text-stone-900 dark:text-stone-100">
          {label}
        </Typography>
      )}

      <TextInput
        className={`h-12 rounded-xl border bg-white px-4 font-inter text-[15px] text-stone-900 dark:bg-stone-800 dark:text-stone-100 ${borderClass} ${className}`}
        placeholderTextColor={isDark ? "#78716C" : "#A8A29E"}
        onFocus={(e) => {
          setIsFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />

      {error && (
        <Typography variant="caption" className="text-red-500">
          {error}
        </Typography>
      )}

      {helperText && !error && (
        <Typography variant="caption">{helperText}</Typography>
      )}
    </View>
  );
}
