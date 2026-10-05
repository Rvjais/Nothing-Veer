import { NativeModules, Platform } from "react-native";
import { AudioQuality } from "../types/music";

export interface ResolvedStream {
  url: string;
  userAgent: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const RESOLVE_TIMEOUT_MS = 20_000;

function getBackendBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (configuredUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(configuredUrl);
    } catch {
      throw new Error("EXPO_PUBLIC_BACKEND_URL must be a valid HTTP or HTTPS URL.");
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("EXPO_PUBLIC_BACKEND_URL must use HTTP or HTTPS.");
    }
    if (!__DEV__ && parsedUrl.protocol !== "https:") {
      throw new Error("Release builds require an HTTPS backend URL.");
    }
    return configuredUrl.replace(/\/+$/, "");
  }

  if (!__DEV__) {
    throw new Error("Set EXPO_PUBLIC_BACKEND_URL to your HTTPS audio backend.");
  }

  const scriptUrl = NativeModules?.SourceCode?.scriptURL as string | undefined;
  const hostMatch = scriptUrl?.match(/^[a-z][a-z0-9+.-]*:\/\/([^/:?#]+)/i);
  const host = hostMatch?.[1];

  if (host && !/(\.expo\.dev|\.exp\.direct)$/i.test(host)) {
    return "http://" + host + ":3000";
  }
  if (host) {
    throw new Error(
      "Expo tunnel mode cannot reach the local audio backend. Set EXPO_PUBLIC_BACKEND_URL to a reachable backend URL."
    );
  }

  // This is the Android emulator's host-machine address. Physical devices
  // should use the Metro host above or an explicit EXPO_PUBLIC_BACKEND_URL.
  if (Platform.OS === "android") return "http://10.0.2.2:3000";
  return "http://127.0.0.1:3000";
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const StreamResolver = {
  async getStreamUrl(
    videoId: string,
    quality: AudioQuality = "high"
  ): Promise<ResolvedStream | null> {
    if (!videoId) return null;

    const baseUrl = getBackendBaseUrl();
    const params = new URLSearchParams({
      id: videoId,
      quality,
    });
    const resolveUrl = baseUrl + "/resolve?" + params.toString();

    let response: Response;
    try {
      response = await fetchWithTimeout(resolveUrl, RESOLVE_TIMEOUT_MS);
    } catch (error) {
      const reason =
        error instanceof Error && error.name === "AbortError"
          ? "The audio backend took too long to resolve this track."
          : "Could not connect to the audio backend. Check its address and that the phone can reach it.";
      throw new Error(reason);
    }

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || "Audio backend returned HTTP " + response.status + ".");
    }

    return {
      url: baseUrl + "/stream?" + params.toString(),
      userAgent: USER_AGENT,
    };
  },

  async clearCache(): Promise<void> {
    const response = await fetchWithTimeout(getBackendBaseUrl() + "/cache", 5000);
    if (!response.ok) {
      throw new Error("The audio backend could not clear its stream cache.");
    }
  },
};
