import { Text, type TextProps } from "react-native";

type Variant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodySmall"
  | "caption"
  | "overline";

const variantClasses: Record<Variant, string> = {
  display:
    "text-[32px] leading-[38px] font-inter-bold text-stone-900 dark:text-stone-50",
  h1: "text-2xl leading-[30px] font-inter-bold text-stone-900 dark:text-stone-50",
  h2: "text-xl leading-7 font-inter-semibold text-stone-900 dark:text-stone-50",
  h3: "text-[17px] leading-6 font-inter-semibold text-stone-900 dark:text-stone-50",
  body: "text-[15px] leading-[22px] font-inter text-stone-900 dark:text-stone-100",
  bodySmall: "text-sm leading-5 font-inter text-stone-500 dark:text-stone-400",
  caption:
    "text-[13px] leading-[18px] font-inter-medium text-stone-500 dark:text-stone-400",
  overline:
    "text-[11px] leading-4 font-inter-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500",
};

interface TypographyProps extends TextProps {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
}

export function Typography({
  variant = "body",
  className = "",
  children,
  ...rest
}: TypographyProps) {
  return (
    <Text className={`${variantClasses[variant]} ${className}`} {...rest}>
      {children}
    </Text>
  );
}
