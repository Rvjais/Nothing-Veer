import * as NativeHaptics from "expo-haptics";
import { usePreferencesStore } from "../store/usePreferencesStore";

export const ImpactFeedbackStyle = NativeHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = NativeHaptics.NotificationFeedbackType;

async function feedback(action: () => Promise<void>): Promise<void> {
  if (!usePreferencesStore.getState().hapticsEnabled) return;
  await action().catch(() => {});
}

export const selectionAsync = () => feedback(() => NativeHaptics.selectionAsync());
export const impactAsync = (style?: NativeHaptics.ImpactFeedbackStyle) =>
  feedback(() => NativeHaptics.impactAsync(style));
export const notificationAsync = (type?: NativeHaptics.NotificationFeedbackType) =>
  feedback(() => NativeHaptics.notificationAsync(type));
