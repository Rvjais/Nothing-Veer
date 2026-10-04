import { create } from "zustand";
import TrackPlayer, { State } from "react-native-track-player";
import * as FileSystem from "expo-file-system/legacy";
import { Track } from "../types/music";
import { StreamResolver } from "../services/streamResolver";
import { useLibraryStore } from "./useLibraryStore";
import { setupTrackPlayer } from "../services/TrackPlayerService";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  queue: Track[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  volume: number;
  _trackPlayerSetup: boolean;

  initPlayer: () => Promise<void>;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setVolume: (volume: number) => Promise<void>;
}

let progressInterval: NodeJS.Timeout | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isBuffering: false,
  positionMillis: 0,
  durationMillis: 0,
  queue: [],
  queueIndex: -1,
  repeatMode: "off",
  shuffle: false,
  volume: 1.0,
  _trackPlayerSetup: false,

  initPlayer: async () => {
    if (!get()._trackPlayerSetup) {
      const isSetup = await setupTrackPlayer();
      set({ _trackPlayerSetup: isSetup });
    }
  },

  playTrack: async (track: Track, newQueue?: Track[]) => {
    await get().initPlayer();
    const { queue: existingQueue } = get();

    let activeQueue = newQueue || existingQueue;
    let idx = activeQueue.findIndex((t) => t.id === track.id);
    if (idx === -1) {
      activeQueue = [...activeQueue, track];
      idx = activeQueue.length - 1;
    }

    set({
      currentTrack: track,
      queue: activeQueue,
      queueIndex: idx,
      isBuffering: true,
      positionMillis: 0,
      durationMillis: (track.duration || 180) * 1000,
    });

    useLibraryStore.getState().addToRecents(track);
    console.log("[Player] playTrack called for:", track.id, track.title);

    try {
      await TrackPlayer.reset();

      let audioUri: string | undefined = track.localUri;
      if (!audioUri) {
        const downloaded = useLibraryStore.getState().getDownloadedTrack(track.id);
        if (downloaded?.localUri) {
          audioUri = downloaded.localUri;
        }
      }

      if (!audioUri) {
        audioUri = (await StreamResolver.getStreamUrl(track.id)) || track.streamUrl;
      }

      if (!audioUri) {
        throw new Error("Unable to resolve audio playback URL");
      }

      console.log("[Player] Resolved audioUri:", audioUri.substring(0, 60));

      if (audioUri.includes("googlevideo.com")) {
        const cacheFile = `${FileSystem.cacheDirectory}stream_${track.id}.m4a`;
        try {
          const cacheInfo = await FileSystem.getInfoAsync(cacheFile);
          if (cacheInfo.exists && (cacheInfo as any).size > 40000) {
            audioUri = cacheFile;
          } else {
            const download = FileSystem.createDownloadResumable(
              audioUri,
              cacheFile,
              {
                headers: {
                  "User-Agent":
                    "com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)",
                  Referer: "https://www.youtube.com/",
                },
              }
            );
            const dlRes = await download.downloadAsync();
            if (dlRes?.status === 200 || dlRes?.status === 206) {
              audioUri = dlRes.uri;
            }
          }
        } catch {}
      }

      const isRemoteGoogleVideo = audioUri.includes("googlevideo.com");
      
      await TrackPlayer.add({
        id: track.id,
        url: audioUri,
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        duration: track.duration,
        headers: isRemoteGoogleVideo ? {
          "User-Agent": "com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)",
          Referer: "https://www.youtube.com/",
          Origin: "https://www.youtube.com",
        } : undefined,
      });

      await TrackPlayer.setVolume(get().volume);
      await TrackPlayer.play();

      set({ isPlaying: true, isBuffering: false });

      if (progressInterval) clearInterval(progressInterval);
      progressInterval = setInterval(async () => {
        try {
          const progress = await TrackPlayer.getProgress();
          const state = await TrackPlayer.getPlaybackState();
          
          set({ 
            positionMillis: progress.position * 1000,
            durationMillis: progress.duration > 0 ? progress.duration * 1000 : get().durationMillis,
            isPlaying: state.state === State.Playing,
            isBuffering: state.state === State.Buffering || state.state === State.Loading,
          });

          if (state.state === State.Ended) {
            const { repeatMode, playNext, seekTo } = get();
            if (repeatMode === "one") {
              await seekTo(0);
              await TrackPlayer.play();
            } else {
              playNext();
            }
          }
        } catch {}
      }, 250);

    } catch (error) {
      console.error("[Player] playTrack error:", error);
      set({ isBuffering: false, isPlaying: false });
    }
  },

  togglePlayPause: async () => {
    await get().initPlayer();
    const { isPlaying, currentTrack, queue, playTrack } = get();
    
    try {
      const state = await TrackPlayer.getPlaybackState();
      
      if (state.state === State.None || state.state === State.Stopped) {
        if (currentTrack) {
          await playTrack(currentTrack);
        } else if (queue.length > 0) {
          await playTrack(queue[0]);
        }
        return;
      }

      if (isPlaying) {
        await TrackPlayer.pause();
        set({ isPlaying: false });
      } else {
        await TrackPlayer.play();
        set({ isPlaying: true });
      }
    } catch {}
  },

  seekTo: async (seconds: number) => {
    await get().initPlayer();
    try {
      await TrackPlayer.seekTo(seconds);
      set({ positionMillis: seconds * 1000 });
    } catch {}
  },

  playNext: async () => {
    const { queue, queueIndex, repeatMode, shuffle, playTrack } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === "all") {
        nextIndex = 0;
      } else {
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) {
      await playTrack(nextTrack);
    }
  },

  playPrevious: async () => {
    const { queue, queueIndex, positionMillis, seekTo, playTrack } = get();
    if (positionMillis > 3000) {
      await seekTo(0);
      return;
    }

    if (queue.length === 0) return;
    const prevIndex = queueIndex - 1 >= 0 ? queueIndex - 1 : queue.length - 1;
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      await playTrack(prevTrack);
    }
  },

  toggleShuffle: () => {
    set((state) => ({ shuffle: !state.shuffle }));
  },

  cycleRepeat: () => {
    set((state) => {
      const modes: RepeatMode[] = ["off", "all", "one"];
      const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length;
      return { repeatMode: modes[nextIndex] };
    });
  },

  addToQueue: (track: Track) => {
    set((state) => ({ queue: [...state.queue, track] }));
  },

  removeFromQueue: (index: number) => {
    set((state) => {
      const updated = state.queue.filter((_, i) => i !== index);
      let newIdx = state.queueIndex;
      if (index < state.queueIndex) {
        newIdx--;
      } else if (index === state.queueIndex && newIdx >= updated.length) {
        newIdx = Math.max(0, updated.length - 1);
      }
      return { queue: updated, queueIndex: newIdx };
    });
  },

  clearQueue: () => {
    TrackPlayer.reset();
    set({
      queue: [],
      queueIndex: -1,
      currentTrack: null,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 0,
    });
  },

  setVolume: async (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
    try {
      await TrackPlayer.setVolume(clamped);
    } catch {}
  },
}));

