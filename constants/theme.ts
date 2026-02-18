/**
 * LearnAnything Design Tokens
 *
 * Palette: "Ink & Amber"
 * These tokens are the source of truth for colors used outside of NativeWind
 * (e.g. navigation theme, status bar, native components).
 *
 * For NativeWind/Tailwind usage, refer to global.css @theme block
 * and use class names like `bg-brand`, `text-reward`, etc.
 */

export const palette = {
  brand: {
    DEFAULT: "#0D9488",
    dark: "#134E4A",
    light: "#CCFBF1",
    50: "#F0FDFA",
  },
  reward: {
    DEFAULT: "#F59E0B",
    light: "#FEF3C7",
  },
  energy: {
    DEFAULT: "#F97316",
    light: "#FFF7ED",
  },
  success: "#22C55E",
  error: "#EF4444",
  stone: {
    50: "#FAFAF9",
    100: "#F5F5F4",
    200: "#E7E5E4",
    400: "#A8A29E",
    500: "#78716C",
    900: "#1C1917",
  },
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const Colors = {
  light: {
    text: palette.stone[900],
    textSecondary: palette.stone[500],
    background: palette.stone[50],
    surface: palette.white,
    tint: palette.brand.DEFAULT,
    border: palette.stone[200],
    icon: palette.stone[500],
    tabIconDefault: palette.stone[400],
    tabIconSelected: palette.brand.DEFAULT,
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#9BA1A6",
    background: "#0A0A0A",
    surface: "#1C1C1E",
    tint: palette.brand.light,
    border: "#2C2C2E",
    icon: "#9BA1A6",
    tabIconDefault: "#6B7280",
    tabIconSelected: palette.brand.light,
  },
} as const;

export type ThemeColors = typeof Colors.light;
export type ColorScheme = keyof typeof Colors;
