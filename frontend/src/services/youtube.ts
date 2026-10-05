import { Track, HomeFeedSection } from "../types/music";

const INNERTUBE_API = "https://music.youtube.com/youtubei/v1";

const INNERTUBE_CLIENT = {
  clientName: "WEB_REMIX",
  clientVersion: "1.20240101.01.00",
  hl: "en",
  gl: "US",
};

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Origin: "https://music.youtube.com",
  Referer: "https://music.youtube.com/",
};

function formatArtwork(url: string | undefined): string {
  if (!url) {
    return "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80";
  }
  if (url.includes("googleusercontent.com") || url.includes("ytimg.com")) {
    return url.replace(/=w\d+-h\d+.*$/, "=w544-h544-l90-rj");
  }
  return url;
}

function parseDuration(durationStr?: string): number {
  if (!durationStr) return 180;
  const parts = durationStr.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 180;
}

function parseTrackItem(item: any): Track | null {
  try {
    const renderer =
      item.musicResponsiveListItemRenderer ||
      item.musicTwoRowItemRenderer ||
      item;

    let id = "";
    let contentType = "song";

    const playNavigation =
      renderer.overlay?.musicItemThumbnailOverlayRenderer?.content
        ?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;
    const titleNavigation =
      renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer
        ?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint;
    const directNavigation = renderer.navigationEndpoint?.watchEndpoint;
    
    const browseEndpoint = renderer.navigationEndpoint?.browseEndpoint || renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.browseEndpoint;

    const pageType = browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    if (pageType === "MUSIC_PAGE_TYPE_ALBUM" || pageType === "MUSIC_PAGE_TYPE_ARTIST" || pageType === "MUSIC_PAGE_TYPE_USER_CHANNEL") {
      id = browseEndpoint.browseId;
      contentType = pageType === "MUSIC_PAGE_TYPE_ALBUM" ? "album" : "artist";
    } else {
      id =
        playNavigation?.videoId ||
        titleNavigation?.videoId ||
        directNavigation?.videoId ||
        renderer.videoId ||
        "";
    }

    if (!id) return null;

    let title = "Unknown Title";
    const titleRuns =
      renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs || renderer.title?.runs;
    if (titleRuns && titleRuns.length > 0) {
      title = titleRuns.map((r: any) => r.text).join("");
    }

    let artist = "Unknown Artist";
    let album = "";
    let duration = 180;

    const subtitleRuns =
      renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs || renderer.subtitle?.runs;

    if (subtitleRuns && subtitleRuns.length > 0) {
      const parts = subtitleRuns
        .map((r: any) => r.text)
        .filter((t: string) => t !== " • " && t !== "•" && t !== "");

      if (parts.length > 0) {
        artist = parts[0];
      }
      if (parts.length > 2) {
        album = parts[1];
        duration = parseDuration(parts[parts.length - 1]);
      } else if (parts.length === 2) {
        if (parts[1].includes(":")) {
          duration = parseDuration(parts[1]);
        } else {
          album = parts[1];
        }
      }
    }

    const thumbnails =
        renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        renderer.thumbnail?.thumbnails ||
        [];
    const artwork = formatArtwork(thumbnails[thumbnails.length - 1]?.url);

    return {
      id,
      title: title.trim(),
      artist: artist.trim(),
      album: album ? album.trim() : undefined,
      artwork,
      duration,
      contentType,
    };
  } catch {
    return null;
  }
}

export const YouTubeService = {
  async search(query: string, filter?: "songs" | "albums" | "artists" | "playlists"): Promise<Track[]> {
    if (!query.trim()) return [];

    try {
      const params = filter === "songs" ? "Eg-KAQwIARAAGAAgACgAMABqChAEEAMQCRAFEAo%3D" : undefined;

      const res = await fetch(`${INNERTUBE_API}/search`, {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          context: { client: INNERTUBE_CLIENT },
          query,
          params,
        }),
      });

      if (!res.ok) throw new Error(`Search failed: ${res.status}`);

      const data = await res.json();
      const tracks: Track[] = [];

      const tabs = data.contents?.tabbedSearchResultsRenderer?.tabs;
      const sectionContents =
        tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
        data.contents?.sectionListRenderer?.contents ||
        [];

      for (const section of sectionContents) {
        const shelf =
          section.musicShelfRenderer ||
          section.musicCardShelfRenderer ||
          section.itemSectionRenderer;

        if (shelf?.contents) {
          for (const item of shelf.contents) {
            const track = parseTrackItem(item);
            if (track && !tracks.some((t) => t.id === track.id)) {
              tracks.push(track);
            }
          }
        }
      }

      if (filter && filter !== "songs") {
        const filtered = tracks.filter(t => t.contentType === (filter === "albums" ? "album" : "artist"));
        if (filtered.length > 0) return filtered;
      }

      if (tracks.length === 0) {
        return await this.searchFallback(query);
      }

      return tracks;
    } catch {
      return await this.searchFallback(query);
    }
  },

  async searchFallback(query: string): Promise<Track[]> {
    try {
      const ytRes = await fetch("https://www.youtube.com/youtubei/v1/search", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20240101.00.00",
              hl: "en",
              gl: "US",
            },
          },
          query: `${query} official audio`,
        }),
      });

      const data = await ytRes.json();
      const tracks: Track[] = [];

      const sections =
        data.contents?.twoColumnSearchResultsRenderer?.primaryContents
          ?.sectionListRenderer?.contents || [];

      for (const sec of sections) {
        const items = sec.itemSectionRenderer?.contents || [];
        for (const it of items) {
          const v = it.videoRenderer;
          if (v && v.videoId) {
            tracks.push({
              id: v.videoId,
              title: v.title?.runs?.[0]?.text || "Unknown Title",
              artist: v.ownerText?.runs?.[0]?.text || query,
              artwork:
                v.thumbnail?.thumbnails?.[v.thumbnail.thumbnails.length - 1]
                  ?.url || "",
              duration: parseDuration(v.lengthText?.simpleText),
            });
          }
        }
      }

      return tracks;
    } catch {
      return [];
    }
  },

  async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query.trim()) return [];
    try {
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
    } catch {
      return [];
    }
  },

  async getHomeFeed(): Promise<HomeFeedSection[]> {
    try {
      const res = await fetch(`${INNERTUBE_API}/browse`, {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({
          context: { client: INNERTUBE_CLIENT },
          browseId: "FEmusic_home",
        }),
      });

      if (!res.ok) throw new Error("Browse failed");

      const data = await res.json();
      const sections: HomeFeedSection[] = [];

      const sectionList =
        data.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
          ?.content?.sectionListRenderer?.contents || [];

      for (const section of sectionList) {
        const shelf =
          section.musicCarouselShelfRenderer || section.musicShelfRenderer;
        if (!shelf) continue;

        const titleRuns = shelf.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs ||
          shelf.header?.musicHeaderRenderer?.title?.runs;
        const title = titleRuns ? titleRuns.map((r: any) => r.text).join("") : "Featured";

        const tracks: Track[] = [];
        const contents = shelf.contents || [];

        for (const item of contents) {
          const track = parseTrackItem(item);
          if (track && !tracks.some((t) => t.id === track.id)) {
            tracks.push(track);
          }
        }

        if (tracks.length > 0) {
          sections.push({
            title,
            items: tracks.slice(0, 10),
          });
        }
      }

      if (sections.length > 0) {
        return sections;
      }
    } catch {}

    return this.getCuratedHomeSections();
  },

  async getCuratedHomeSections(): Promise<HomeFeedSection[]> {
    const popularPicks = await this.search("Top Hits 2026", "songs");
    const newReleases = await this.search("New Releases", "songs");
    const synthwavePicks = await this.search("Cyberpunk Synthwave", "songs");
    const workoutPicks = await this.search("Workout Gym Motivation", "songs");
    const ambientPicks = await this.search("Minimal Lo-Fi Chill", "songs");
    const globalPicks = await this.search("Global Top 50", "songs");

    return [
      {
        title: "QUICK PICKS",
        subtitle: "FRESH & TRENDING",
        items: popularPicks.slice(0, 8),
      },
      {
        title: "NEW RELEASES",
        subtitle: "LATEST DROPS",
        items: newReleases.slice(0, 8),
      },
      {
        title: "SYNTH & GLYPH",
        subtitle: "INSPIRED BY NOTHING",
        items: synthwavePicks.slice(0, 8),
      },
      {
        title: "PUMP & GRIND",
        subtitle: "WORKOUT BEATS",
        items: workoutPicks.slice(0, 8),
      },
      {
        title: "FOCUS & MINIMAL",
        subtitle: "CHILL BEATS",
        items: ambientPicks.slice(0, 8),
      },
      {
        title: "GLOBAL TOP",
        subtitle: "CHART TOPPERS",
        items: globalPicks.slice(0, 8),
      },
    ];
  },

  async getMoodTracks(mood: string): Promise<Track[]> {
    return this.search(`${mood} music hits`, "songs");
  },
};




