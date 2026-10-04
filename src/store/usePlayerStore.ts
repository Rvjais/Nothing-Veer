import { create } from "zustand";
import { Audio, AVPlaybackStatus } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { Track } from "../types/music";
import { StreamResolver } from "../services/streamResolver";
import { useLibraryStore } from "./useLibraryStore";

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
  sound: Audio.Sound | null;
  volume: number;

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

Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: true,
  playThroughEarpieceAndroid: false,
}).catch(() => {});

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
  sound: null,
  volume: 1.0,

  playTrack: async (track: Track, newQueue?: Track[]) => {
    const { sound: existingSound, queue: existingQueue } = get();

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
      if (existingSound) {
        try {
          await existingSound.stopAsync();
          await existingSound.unloadAsync();
        } catch {}
      }

      // 1. Check if track is available locally for instant offline playback
      let audioUri: string | undefined = track.localUri;
      if (!audioUri) {
        const downloaded = useLibraryStore.getState().getDownloadedTrack(track.id);
        if (downloaded?.localUri) {
          audioUri = downloaded.localUri;
        }
      }

      // 2. If not offline, resolve fresh stream URL
      if (!audioUri) {
        audioUri = (await StreamResolver.getStreamUrl(track.id)) || track.streamUrl;
      }

      if (!audioUri) {
        throw new Error("Unable to resolve audio playback URL");
      }

      console.log("[Player] Resolved audioUri:", audioUri.substring(0, 60));

      // 3. For GoogleVideo streams: cache locally via FileSystem so ExoPlayer avoids 403 Forbidden
      if (audioUri.includes("googlevideo.com")) {
        const cacheFile = `${FileSystem.cacheDirectory}stream_${track.id}.m4a`;
        try {
          const cacheInfo = await FileSystem.getInfoAsync(cacheFile);
          if (cacheInfo.exists && (cacheInfo as any).size > 40000) {
            audioUri = cacheFile;
            console.log("[Player] Using existing cached stream file:", audioUri);
          } else {
            console.log("[Player] Downloading stream to local cache...");
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
            console.log("[Player] Download status:", dlRes?.status);
            const cacheInfo = await FileSystem.getInfoAsync(cacheFile);
            console.log("[Player] Downloaded file size:", (cacheInfo as any).size);
            if (dlRes?.status === 200 || dlRes?.status === 206) {
              audioUri = dlRes.uri;
              console.log("[Player] Stream cached successfully:", audioUri);
            } else {
              console.warn("[Player] Stream download returned non-200 status:", dlRes?.status);
            }
          }
        } catch (cacheErr) {
          console.warn("[Player] Stream caching warning, falling back to direct:", cacheErr);
        }
      }

      const isRemoteGoogleVideo = audioUri.includes("googlevideo.com");
      const { sound: newSound } = await Audio.Sound.createAsync(
        {
          uri: audioUri,
          headers: isRemoteGoogleVideo
            ? {
                "User-Agent":
                  "com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)",
                Referer: "https://www.youtube.com/",
                Origin: "https://www.youtube.com",
              }
            : undefined,
          overrideFileExtensionAndroid: isRemoteGoogleVideo ? "m4a" : undefined,
        },
        {
          shouldPlay: true,
          volume: get().volume,
          progressUpdateIntervalMillis: 250,
        },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;

          set({
            isPlaying: status.isPlaying,
            isBuffering: status.isBuffering,
            positionMillis: status.positionMillis,
            durationMillis: status.durationMillis || (track.duration || 180) * 1000,
          });

          if (status.didJustFinish) {
            const { repeatMode, playNext, seekTo } = get();
            if (repeatMode === "one") {
              seekTo(0);
              newSound.playAsync();
            } else {
              playNext();
            }
          }
        }
      );

      set({ sound: newSound, isPlaying: true, isBuffering: false });
    } catch (error) {
      console.error("[Player] playTrack error:", error);
      set({ isBuffering: false, isPlaying: false });
    }
  },

  togglePlayPause: async () => {
    const { sound, isPlaying, currentTrack, queue, playTrack } = get();
    if (!sound) {
      if (currentTrack) {
        await playTrack(currentTrack);
      } else if (queue.length > 0) {
        await playTrack(queue[0]);
      }
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        set({ isPlaying: false });
      } else {
        await sound.playAsync();
        set({ isPlaying: true });
      }
    } catch (e) {}
  },

  seekTo: async (seconds: number) => {
    const { sound, durationMillis } = get();
    const targetMillis = Math.max(0, Math.min(seconds * 1000, durationMillis));
    set({ positionMillis: targetMillis });

    if (sound) {
      try {
        await sound.setPositionAsync(targetMillis);
      } catch (e) {}
    }
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
    set({ queue: [], queueIndex: -1 });
  },

  setVolume: async (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    set({ volume: clamped });
    const { sound } = get();
    if (sound) {
      try {
        await sound.setVolumeAsync(clamped);
      } catch {}
    }
  },
}));

