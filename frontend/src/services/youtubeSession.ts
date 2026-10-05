import CookieManager from "@react-native-cookies/cookies";
import { Platform } from "react-native";

const SESSION_NAMES = ["SID", "__Secure-1PSID", "__Secure-3PSID"];
const YOUTUBE_ORIGINS = [
  "https://www.youtube.com",
  "https://m.youtube.com",
  "https://music.youtube.com",
];

// Native cookie access includes HttpOnly cookies; document.cookie does not.
// Only YouTube cookies are collected, never accounts.google.com cookies.
export async function readYouTubeSession(): Promise<string | null> {
  if (Platform.OS === "android") await CookieManager.flush();
  for (const origin of YOUTUBE_ORIGINS) {
    const cookies = await CookieManager.get(origin, Platform.OS === "ios");
    if (!SESSION_NAMES.some((name) => cookies[name]?.value)) continue;
    const parts = Object.entries(cookies)
      .filter(([name, cookie]) => /^[A-Za-z0-9_-]+$/.test(name) && cookie.value && !/[\r\n;\t]/.test(cookie.value))
      .map(([name, cookie]) => `${name}=${cookie.value}`);
    return parts.join("; ");
  }
  return null;
}
