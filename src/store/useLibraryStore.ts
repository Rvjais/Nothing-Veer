import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Track } from "../types/music";
import { DownloadManager } from "../services/downloadManager";

interface PlaylistData {
  id: string;
  name: string;
  createdAt: number;
  tracks: Track[];
}

interface LibraryState {
  favorites: Track[];
  recents: Track[];
  playlists: PlaylistData[];
  downloadedTracks: Track[];
  activeDownloads: Record<string, number>; // trackId -> progress 0..1
  audioQuality: "high" | "medium" | "low";

  toggleFavorite: (track: Track) => Promise<void>;
  isFavorite: (trackId: string) => boolean;
  addToRecents: (track: Track) => Promise<void>;
  clearRecents: () => Promise<void>;
  createPlaylist: (name: string) => Promise<string>;
  addToPlaylist: (playlistId: string, track: Track) => Promise<void>;
  removeFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  setAudioQuality: (quality: "high" | "medium" | "low") => Promise<void>;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (trackId: string) => Promise<void>;
  isDownloaded: (trackId: string) => boolean;
  getDownloadedTrack: (trackId: string) => Track | undefined;
  clearAllDownloads: () => Promise<void>;
  loadLibrary: () => Promise<void>;
}

const STORAGE_KEY = "@nothing_music_library_v2";

export const useLibraryStore = create<LibraryState>((set, get) => ({
  favorites: [],
  recents: [],
  playlists: [],
  downloadedTracks: [],
  activeDownloads: {},
  audioQuality: "high",

  toggleFavorite: async (track: Track) => {
    const { favorites } = get();
    const exists = favorites.some((t) => t.id === track.id);
    const updated = exists
      ? favorites.filter((t) => t.id !== track.id)
      : [track, ...favorites];

    set({ favorites: updated });
    await saveState({ ...get(), favorites: updated });
  },

  isFavorite: (trackId: string) => {
    return get().favorites.some((t) => t.id === trackId);
  },

  addToRecents: async (track: Track) => {
    const { recents } = get();
    const filtered = recents.filter((t) => t.id !== track.id);
    const updated = [track, ...filtered].slice(0, 50);

    set({ recents: updated });
    await saveState({ ...get(), recents: updated });
  },

  clearRecents: async () => {
    set({ recents: [] });
    await saveState({ ...get(), recents: [] });
  },

  createPlaylist: async (name: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const newPlaylist: PlaylistData = {
      id,
      name,
      createdAt: Date.now(),
      tracks: [],
    };
    const updated = [...get().playlists, newPlaylist];
    set({ playlists: updated });
    await saveState({ ...get(), playlists: updated });
    return id;
  },

  addToPlaylist: async (playlistId: string, track: Track) => {
    const updated = get().playlists.map((pl) => {
      if (pl.id === playlistId) {
        if (pl.tracks.some((t) => t.id === track.id)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    });
    set({ playlists: updated });
    await saveState({ ...get(), playlists: updated });
  },

  removeFromPlaylist: async (playlistId: string, trackId: string) => {
    const updated = get().playlists.map((pl) => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter((t) => t.id !== trackId) };
      }
      return pl;
    });
    set({ playlists: updated });
    await saveState({ ...get(), playlists: updated });
  },

  deletePlaylist: async (playlistId: string) => {
    const updated = get().playlists.filter((p) => p.id !== playlistId);
    set({ playlists: updated });
    await saveState({ ...get(), playlists: updated });
  },

  setAudioQuality: async (quality: "high" | "medium" | "low") => {
    set({ audioQuality: quality });
    await saveState({ ...get(), audioQuality: quality });
  },

  downloadTrack: async (track: Track) => {
    const { downloadedTracks, activeDownloads } = get();
    if (downloadedTracks.some((t) => t.id === track.id)) return;
    if (activeDownloads[track.id] !== undefined) return;

    // Set initial progress
    set((state) => ({
      activeDownloads: { ...state.activeDownloads, [track.id]: 0.05 },
    }));

    try {
      const savedTrack = await DownloadManager.downloadTrack(track, (progress) => {
        set((state) => ({
          activeDownloads: { ...state.activeDownloads, [track.id]: progress },
        }));
      });

      const updatedDownloads = [savedTrack, ...get().downloadedTracks];
      const nextActive = { ...get().activeDownloads };
      delete nextActive[track.id];

      set({
        downloadedTracks: updatedDownloads,
        activeDownloads: nextActive,
      });

      await saveState({ ...get(), downloadedTracks: updatedDownloads });
    } catch (e) {
      console.warn("Download error:", e);
      const nextActive = { ...get().activeDownloads };
      delete nextActive[track.id];
      set({ activeDownloads: nextActive });
    }
  },

  removeDownload: async (trackId: string) => {
    const { downloadedTracks } = get();
    const target = downloadedTracks.find((t) => t.id === trackId);
    if (target?.localUri) {
      await DownloadManager.deleteTrack(target.localUri);
    }
    const updated = downloadedTracks.filter((t) => t.id !== trackId);
    set({ downloadedTracks: updated });
    await saveState({ ...get(), downloadedTracks: updated });
  },

  isDownloaded: (trackId: string) => {
    return get().downloadedTracks.some((t) => t.id === trackId);
  },

  getDownloadedTrack: (trackId: string) => {
    return get().downloadedTracks.find((t) => t.id === trackId);
  },

  clearAllDownloads: async () => {
    const { downloadedTracks } = get();
    for (const track of downloadedTracks) {
      if (track.localUri) {
        await DownloadManager.deleteTrack(track.localUri);
      }
    }
    set({ downloadedTracks: [] });
    await saveState({ ...get(), downloadedTracks: [] });
  },

  loadLibrary: async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          favorites: parsed.favorites || [],
          recents: parsed.recents || [],
          playlists: parsed.playlists || [],
          downloadedTracks: parsed.downloadedTracks || [],
          audioQuality: parsed.audioQuality || "high",
        });
      }
    } catch (e) {}
  },
}));

async function saveState(state: Partial<LibraryState>) {
  try {
    const dataToSave = {
      favorites: state.favorites || [],
      recents: state.recents || [],
      playlists: state.playlists || [],
      downloadedTracks: state.downloadedTracks || [],
      audioQuality: state.audioQuality || "high",
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch (e) {}
}
