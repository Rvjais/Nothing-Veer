import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AuthState {
  youtubeCookie: string | null;
  signInReason: "session" | "rate-limit" | null;
  requestSignIn: (reason: "session" | "rate-limit") => void;
  dismissSignIn: () => void;
  setYoutubeCookie: (cookie: string) => void;
  clearYoutubeCookie: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      youtubeCookie: null,
      signInReason: null,
      requestSignIn: (signInReason) => set({ signInReason }),
      dismissSignIn: () => set({ signInReason: null }),
      setYoutubeCookie: (cookie) => set({ youtubeCookie: cookie, signInReason: null }),
      clearYoutubeCookie: () => set({ youtubeCookie: null }),
    }),
    {
      name: "nothing-auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ youtubeCookie: state.youtubeCookie }),
    }
  )
);
