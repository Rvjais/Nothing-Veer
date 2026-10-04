export interface ThemeColors {
  background: string;
  surfaceLowest: string;
  surfaceLow: string;
  surfaceMid: string;
  surfaceHigh: string;
  surfaceHighest: string;

  // Text & Content
  white: string;
  whiteDim: string;
  grey: string;
  greyDark: string;
  greySubtle: string;

  // Nothing Signature Accents
  red: string;
  redDim: string;
  redGlow: string;
  redLight: string;

  // Borders & Dividers
  borderSubtle: string;
  borderLight: string;
  borderActive: string;

  // Apple Liquid Glass
  glassBackground: string;
  glassBorder: string;
  cardGlow: string;
  blurTint: "dark" | "light" | "default";
}

export const DarkColors: ThemeColors = {
  // Pure AMOLED Black
  background: "#000000",
  surfaceLowest: "#0A0A0A",
  surfaceLow: "#141414",
  surfaceMid: "#1E1E1E",
  surfaceHigh: "#2A2A2A",
  surfaceHighest: "#383838",

  // Text & Content
  white: "#FFFFFF",
  whiteDim: "#D0D0D0",
  grey: "#8E8E93",
  greyDark: "#48484A",
  greySubtle: "#2C2C2E",

  // Nothing Signature Accents
  red: "#D71921",
  redDim: "#A6141A",
  redGlow: "rgba(215, 25, 33, 0.4)",
  redLight: "#FF3B30",

  // Borders & Dividers
  borderSubtle: "#222222",
  borderLight: "#333333",
  borderActive: "#555555",

  // Apple Liquid Glass (Dark)
  glassBackground: "rgba(20, 20, 20, 0.72)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  cardGlow: "rgba(255, 255, 255, 0.05)",
  blurTint: "dark",
};

export const LightColors: ThemeColors = {
  // Clean Crisp White
  background: "#F5F5F7",
  surfaceLowest: "#FFFFFF",
  surfaceLow: "#EBEBED",
  surfaceMid: "#DFDFE2",
  surfaceHigh: "#D0D0D5",
  surfaceHighest: "#BCBCC2",

  // Text & Content (Inverted for Light Mode)
  white: "#000000",
  whiteDim: "#333333",
  grey: "#666666",
  greyDark: "#999999",
  greySubtle: "#E0E0E0",

  // Nothing Signature Accents
  red: "#D71921",
  redDim: "#A6141A",
  redGlow: "rgba(215, 25, 33, 0.2)",
  redLight: "#FF3B30",

  // Borders & Dividers
  borderSubtle: "#E5E5EA",
  borderLight: "#D1D1D6",
  borderActive: "#999999",

  // Apple Liquid Glass (Light)
  glassBackground: "rgba(255, 255, 255, 0.75)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  cardGlow: "rgba(0, 0, 0, 0.03)",
  blurTint: "light",
};

// Default export for backward compatibility
export const NothingColors = DarkColors;

export const NothingFonts = {
  // Dot matrix font (signature Nothing typography)
  dot: "Ndot-77_JP_Extended",
  // Modern clean headline
  headline: "NType82-Headline",
  // Modern clean subhead
  regular: "NType82-Regular",
  // Clean neutral body
  body: "Geist-Regular",
  bodyMedium: "Geist-Medium",
  // Technical monospace
  mono: "GeistMono-Regular",
  monoMedium: "GeistMono-Medium",
};

export const NothingLayout = {
  radiusSm: 8,
  radiusMd: 16,
  radiusLg: 24,
  radiusXl: 32,
  radiusPill: 9999,
  screenPadding: 16,
  bottomBarHeight: 64,
  miniPlayerHeight: 68,
};
