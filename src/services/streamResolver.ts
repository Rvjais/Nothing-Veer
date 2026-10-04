import { NativeModules } from "react-native";

interface CachedStream {
  url: string;
  expiresAt: number;
}

const fetchWithTimeout = async (url: string, ms: number) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const streamCache = new Map<string, CachedStream>();

function getDevHost(): string | null {
  try {
    const scriptURL = NativeModules?.SourceCode?.scriptURL;
    if (scriptURL) {
      const match = scriptURL.match(/https?:\/\/([^:\/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch {}
  return null;
}

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://api.piped.privacydev.net",
  "https://piped-api.lunar.icu",
];

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.artemislena.eu",
];

export const StreamResolver = {
  async getStreamUrl(videoId: string): Promise<string | null> {
    if (!videoId) return null;

    // 1. Probe local streaming proxy first for zero-403 smooth playback
    const devHost = getDevHost();
    const candidateHosts = [
      "https://nothing-veer.onrender.com",
      devHost ? `http://${devHost}:3000` : null,
      "http://172.16.128.173:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3000",
    ].filter(Boolean) as string[];

    for (const host of candidateHosts) {
      try {
        const probe = await fetchWithTimeout(`${host}/`, 1000);
        if (probe.ok) {
          console.log(`[StreamResolver] Connected to proxy server at: ${host}`);
          return `${host}/stream?id=${videoId}`;
        }
      } catch (err) {
        console.log(`[StreamResolver] Proxy probe failed for ${host}`);
      }
    }

    const cached = streamCache.get(videoId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    try {
      const directUrl = await this.resolveViaInnertubeIOS(videoId);
      if (directUrl) {
        streamCache.set(videoId, {
          url: directUrl,
          expiresAt: Date.now() + 4 * 60 * 60 * 1000,
        });
        return directUrl;
      }
    } catch (e) {}

    for (const instance of PIPED_INSTANCES) {
      try {
        const pipedUrl = await this.resolveViaPiped(instance, videoId);
        if (pipedUrl) {
          streamCache.set(videoId, {
            url: pipedUrl,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
          });
          return pipedUrl;
        }
      } catch (err) {}
    }

    for (const instance of INVIDIOUS_INSTANCES) {
      try {
        const invidiousUrl = await this.resolveViaInvidious(instance, videoId);
        if (invidiousUrl) {
          streamCache.set(videoId, {
            url: invidiousUrl,
            expiresAt: Date.now() + 2 * 60 * 60 * 1000,
          });
          return invidiousUrl;
        }
      } catch (err) {}
    }

    return null;
  },

  async resolveViaInnertubeIOS(videoId: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch("https://www.youtube.com/youtubei/v1/player", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "IOS",
              clientVersion: "21.03.1",
              deviceModel: "iPhone16,2",
              osVersion: "18.2.22C152",
              hl: "en",
              gl: "US",
            },
          },
          videoId,
        }),
      });

      clearTimeout(timeout);
      if (!res.ok) return null;

      const data = await res.json();
      const formats = data.streamingData?.adaptiveFormats || [];
      const audioFormats = formats.filter(
        (f: any) => f.mimeType && f.mimeType.includes("audio") && f.url
      );

      if (audioFormats.length === 0) return null;

      const bestAudio =
        audioFormats.find((f: any) => f.itag === 140) ||
        audioFormats.find((f: any) => f.itag === 251) ||
        audioFormats.find((f: any) => f.itag === 250) ||
        audioFormats[0];

      return bestAudio ? bestAudio.url : null;
    } finally {
      clearTimeout(timeout);
    }
  },

  async resolveViaPiped(instance: string, videoId: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);
      if (!res.ok) return null;

      const data = await res.json();
      const audioStreams = data.audioStreams || [];
      if (audioStreams.length > 0) {
        audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        return audioStreams[0].url || null;
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  },

  async resolveViaInvidious(instance: string, videoId: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeout);
      if (!res.ok) return null;

      const data = await res.json();
      const adaptiveFormats = data.adaptiveFormats || [];
      const audio = adaptiveFormats.filter((f: any) =>
        f.type?.includes("audio")
      );
      if (audio.length > 0) {
        return audio[0].url || null;
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  },
};
