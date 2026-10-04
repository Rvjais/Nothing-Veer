import { LyricLine, LyricsData } from "../types/music";

/**
 * Parses LRC format strings:
 * [00:12.34] Hello darkness my old friend
 * into structured LyricLine[]
 */
function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split("\n");
  const result: LyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.?(\d{0,3})\](.*)/;

  for (const line of lines) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const milliseconds = match[3]
        ? parseInt(match[3].padEnd(3, "0"), 10)
        : 0;
      const time = minutes * 60 + seconds + milliseconds / 1000;
      const text = match[4].trim();

      if (text) {
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export const LyricsService = {
  /**
   * Fetch synchronized or plain lyrics from LRCLIB
   */
  async getLyrics(
    title: string,
    artist: string,
    duration?: number
  ): Promise<LyricsData | null> {
    try {
      // 1. Clean track name (remove "Official Video", "(feat. ...)", etc.)
      const cleanTitle = title
        .replace(/\(official.*\)/gi, "")
        .replace(/\[official.*\]/gi, "")
        .replace(/\(lyrics?\)/gi, "")
        .replace(/\[lyrics?\]/gi, "")
        .replace(/\(feat\..*?\)/gi, "")
        .replace(/ft\..*?$/gi, "")
        .trim();

      const cleanArtist = artist.split(",")[0].split("&")[0].trim();

      // 2. Direct get from LRCLIB
      const params = new URLSearchParams({
        track_name: cleanTitle,
        artist_name: cleanArtist,
      });
      if (duration) {
        params.append("duration", Math.round(duration).toString());
      }

      const res = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
        headers: {
          "User-Agent": "NothingMusic/1.0 (https://github.com/MissingCore/Music)",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics) {
          const lines = parseLrc(data.syncedLyrics);
          if (lines.length > 0) {
            return { synced: true, lines, plain: data.plainLyrics };
          }
        }
        if (data.plainLyrics) {
          return {
            synced: false,
            lines: data.plainLyrics
              .split("\n")
              .filter((l: string) => l.trim().length > 0)
              .map((text: string, i: number) => ({ time: i * 5, text })),
            plain: data.plainLyrics,
          };
        }
      }

      // 3. Fallback search on LRCLIB
      const searchRes = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(
          `${cleanTitle} ${cleanArtist}`
        )}`,
        {
          headers: {
            "User-Agent": "NothingMusic/1.0",
          },
        }
      );

      if (searchRes.ok) {
        const items = await searchRes.json();
        if (Array.isArray(items) && items.length > 0) {
          const first = items[0];
          if (first.syncedLyrics) {
            return {
              synced: true,
              lines: parseLrc(first.syncedLyrics),
              plain: first.plainLyrics,
            };
          }
        }
      }

      return null;
    } catch (e) {
      console.warn("Failed to fetch lyrics:", e);
      return null;
    }
  },

  /**
   * Helper to find active line given current playback position
   */
  getActiveLineIndex(lines: LyricLine[], currentTimeSeconds: number): number {
    if (!lines || lines.length === 0) return -1;
    let low = 0;
    let high = lines.length - 1;
    let active = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (lines[mid].time <= currentTimeSeconds) {
        active = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return active;
  },
};

