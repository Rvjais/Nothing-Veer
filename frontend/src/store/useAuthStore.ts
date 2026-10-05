import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthState {
  youtubeCookie: string | null;
  setYoutubeCookie: (cookie: string) => void;
  clearYoutubeCookie: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      youtubeCookie: null,
      setYoutubeCookie: (cookie) => set({ youtubeCookie: cookie }),
      clearYoutubeCookie: () => set({ youtubeCookie: null }),
    }),
    {
      name: "nothing-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
