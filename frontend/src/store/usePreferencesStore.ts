import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface Preferences {
  hapticsEnabled: boolean;
  offlineMode: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  setOfflineMode: (enabled: boolean) => void;
}

export const usePreferencesStore = create<Preferences>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      offlineMode: false,
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setOfflineMode: (offlineMode) => set({ offlineMode }),
    }),
    { name: "nothing-preferences", storage: createJSONStorage(() => AsyncStorage) }
  )
);
