import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { AudioCache, CachedTrack } from "../services/audioCache";
import { ResolvedStream } from "../services/streamResolver";
import { Track } from "../types/music";

interface CacheState {
  tracks: CachedTrack[];
  enabled: boolean;
  limitMB: number;
  hydrated: boolean;
  activeTrackId: string | null;
  progress: number;
  protectedTrackId: string | null;
  load: () => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  setLimit: (mb: number) => Promise<void>;
  protect: (id: string | null) => void;
  find: (id: string) => Promise<CachedTrack | undefined>;
  cache: (track: Track, stream: ResolvedStream) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const KEY = "nothing-audio-cache-v1";
let loading: Promise<void> | null = null;
let jobs: Promise<void> = Promise.resolve();
let writes: Promise<void> = Promise.resolve();
let generation = 0;
const queued = new Set<string>();

function persist(): Promise<void> {
  const { tracks, enabled, limitMB } = useCacheStore.getState();
  const value = JSON.stringify({ tracks, enabled, limitMB });
  writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(KEY, value));
  return writes;
}

async function trim(): Promise<void> {
  const state = useCacheStore.getState();
  let total = state.tracks.reduce((sum, track) => sum + track.fileSize, 0);
  for (const track of [...state.tracks].sort((a, b) => a.lastPlayedAt - b.lastPlayedAt)) {
    if (total <= state.limitMB * 1024 * 1024) break;
    if (track.id === useCacheStore.getState().protectedTrackId) continue;
    await useCacheStore.getState().remove(track.id);
    total -= track.fileSize;
  }
}

export const useCacheStore = create<CacheState>((set, get) => ({
  tracks: [], enabled: true, limitMB: 200, hydrated: false,
  activeTrackId: null, progress: 0, protectedTrackId: null,
  load: async () => {
    if (get().hydrated) return;
    if (!loading) loading = (async () => {
      await AudioCache.prepare();
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        let saved;
        try { saved = JSON.parse(raw); } catch { saved = {}; }
        const tracks = Array.isArray(saved.tracks) ? saved.tracks.filter((track: CachedTrack) => typeof track?.id === "string" && typeof track.localUri === "string" && Number.isFinite(track.fileSize) && track.fileSize > 0 && Number.isFinite(track.lastPlayedAt)) : [];
        const valid: CachedTrack[] = [];
        for (const track of tracks) if (await AudioCache.exists(track)) valid.push(track);
        set({ tracks: valid, enabled: saved.enabled !== false, limitMB: [50, 200, 500].includes(saved.limitMB) ? saved.limitMB : 200 });
      }
      await AudioCache.reconcile(get().tracks);
      set({ hydrated: true });
      await trim();
      await persist();
    })().catch(() => { loading = null; set({ hydrated: true }); });
    await loading;
  },
  setEnabled: (enabled) => { generation++; set({ enabled }); if (!enabled) void AudioCache.cancel(); void persist().catch(() => {}); },
  setLimit: async (limitMB) => { if (![50, 200, 500].includes(limitMB)) return; generation++; set({ limitMB }); await AudioCache.cancel(); await trim(); await persist(); },
  protect: (protectedTrackId) => { set({ protectedTrackId }); void trim().catch(() => {}); },
  find: async (id) => {
    await get().load();
    const track = get().tracks.find(item => item.id === id);
    if (!track) return;
    if (!await AudioCache.exists(track).catch(() => false)) {
      set({ tracks: get().tracks.filter(item => item.id !== id) });
      await persist();
      return;
    }
    const updated = { ...track, lastPlayedAt: Date.now() };
    set({ tracks: get().tracks.map(item => item.id === id ? updated : item) });
    await persist();
    return updated;
  },
  cache: async (track, stream) => {
    await get().load();
    if (!get().enabled || queued.has(track.id) || get().tracks.some(item => item.id === track.id)) return;
    const jobGeneration = generation;
    queued.add(track.id);
    const job = jobs.then(async () => {
      if (!get().enabled || generation !== jobGeneration) return;
      set({ activeTrackId: track.id, progress: 0 });
      let cached: CachedTrack | undefined;
      try {
        cached = await AudioCache.save(track, stream, get().limitMB * 1024 * 1024, progress => set({ progress }));
        if (!get().enabled || generation !== jobGeneration) { await AudioCache.remove(cached); return; }
        set({ tracks: [cached, ...get().tracks.filter(item => item.id !== track.id)] });
        await trim();
        await persist();
      } catch {
        // Caching is optional. A failed cache write must never interrupt playback.
      } finally {
        set({ activeTrackId: null, progress: 0 });
      }
    });
    jobs = job.catch(() => {});
    try { await job; } finally { queued.delete(track.id); }
  },
  remove: async (id) => {
    if (id === get().protectedTrackId) throw new Error("Pause and switch songs before removing the song in use.");
    const track = get().tracks.find(item => item.id === id);
    if (track) await AudioCache.remove(track);
    set({ tracks: get().tracks.filter(item => item.id !== id) });
    await persist();
  },
  clear: async () => {
    generation++;
    await AudioCache.cancel();
    for (const track of [...get().tracks]) if (track.id !== get().protectedTrackId) await get().remove(track.id);
  },
}));
