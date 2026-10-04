import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { DarkColors, LightColors, ThemeColors } from "../constants/theme";

export type ThemeMode = "dark" | "light" | "system";

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  initTheme: () => Promise<void>;
}

const THEME_STORAGE_KEY = "@nothing_music_theme_mode_v1";

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "system") {
    const sys = Appearance.getColorScheme();
    return sys !== "light"; // default to dark if unset
  }
  return mode === "dark";
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "dark",
  isDark: true,
  colors: DarkColors,

  setMode: async (mode: ThemeMode) => {
    const isDark = resolveIsDark(mode);
    set({
      mode,
      isDark,
      colors: isDark ? DarkColors : LightColors,
    });
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  },

  initTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      const mode: ThemeMode =
        saved === "light" || saved === "dark" || saved === "system"
          ? (saved as ThemeMode)
          : "dark";
      const isDark = resolveIsDark(mode);
      set({
        mode,
        isDark,
        colors: isDark ? DarkColors : LightColors,
      });
    } catch {
      set({
        mode: "dark",
        isDark: true,
        colors: DarkColors,
      });
    }
  },
}));
