import { create } from "zustand";
import TrackPlayer, {
  State,
  Event,
  Capability,
  AppKilledPlaybackBehavior,
} from "react-native-track-player";
import { Track } from "../types/music";
import { StreamResolver } from "../services/streamResolver";
import { useLibraryStore } from "./useLibraryStore";

export type RepeatMode = "off" | "all" | "one";

interface PlayerState {
  isReady: boolean;
  playbackError: string | null;
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

  initPlayer: () => Promise<void>;
  clearPlaybackError: () => void;
  playTrack: (track: Track, newQueue?: Track[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  handleQueueEnded: () => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  setVolume: (volume: number) => Promise<void>;
}

let playerSetupPromise: Promise<void> | null = null;
let recoveringTrackId: string | null = null;

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isReady: false,
  playbackError: null,
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

  initPlayer: async () => {
    if (get().isReady) return;
    if (playerSetupPromise) return playerSetupPromise;

    playerSetupPromise = (async () => {
      try {
        await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Fast Refresh can re-run JS while the native service remains initialized.
        if (!message.toLowerCase().includes("already been initialized")) throw error;
      }

      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
        progressUpdateEventInterval: 1,
      });

      TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
        set({
          isPlaying: event.state === State.Playing,
          isBuffering:
            event.state === State.Buffering || event.state === State.Loading,
        });
      });

      TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
        set((state) => ({
          positionMillis: event.position * 1000,
          durationMillis:
            event.duration > 0 ? event.duration * 1000 : state.durationMillis,
        }));
      });

      TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
        if (!event.track) return;
        const track = get().queue.find((item) => item.id === event.track?.id);
        if (track) {
          set({ currentTrack: track });
          void useLibraryStore.getState().addToRecents(track);
        }
      });

      TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
        const { currentTrack, positionMillis } = get();
        const message = event.message || "Unknown playback error.";
        set({ isPlaying: false, isBuffering: false });

        if (
          currentTrack &&
          message.includes("403") &&
          recoveringTrackId !== currentTrack.id
        ) {
          recoveringTrackId = currentTrack.id;
          try {
            const resolved = await StreamResolver.getStreamUrl(
              currentTrack.id,
              useLibraryStore.getState().audioQuality
            );
            if (!resolved) throw new Error("Could not refresh the audio source.");

            await TrackPlayer.reset();
            await TrackPlayer.add({
              id: currentTrack.id,
              url: resolved.url,
              title: currentTrack.title,
              artist: currentTrack.artist,
              artwork: currentTrack.artwork,
              contentType: currentTrack.contentType,
              headers: { "User-Agent": resolved.userAgent },
            });
            if (positionMillis > 0) {
              await TrackPlayer.seekTo(positionMillis / 1000);
            }
            await TrackPlayer.play();
            set({ playbackError: null });
            return;
          } catch (recoveryError) {
            console.warn("[Player] Stream recovery failed:", recoveryError);
          } finally {
            recoveringTrackId = null;
          }
        }

        const label = currentTrack?.title
          ? currentTrack.title + " could not be played. "
          : "Playback failed. ";
        set({ playbackError: label + message });
      });

      set({ isReady: true });
    })();

    try {
      await playerSetupPromise;
    } catch (error) {
      playerSetupPromise = null;
      set({
        isReady: false,
        playbackError:
          "Audio player initialization failed: " +
          (error instanceof Error ? error.message : String(error)),
      });
      console.error("TrackPlayer initialization error", error);
      throw error;
    }
  },

  clearPlaybackError: () => set({ playbackError: null }),

  playTrack: async (track: Track, newQueue?: Track[]) => {
    if (!get().isReady) {
      try {
        await get().initPlayer();
      } catch (error) {
        set({
          isPlaying: false,
          isBuffering: false,
          playbackError:
            error instanceof Error ? error.message : "The audio player is not ready.",
        });
        return;
      }
    }
    if (!get().isReady) {
      set({
        isPlaying: false,
        isBuffering: false,
        playbackError: "The audio player is not ready.",
      });
      return;
    }

    let activeQueue = newQueue || get().queue;
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
      playbackError: null,
    });

    try {
      await TrackPlayer.reset();

      let audioUri: string | undefined = track.localUri;
      let userAgent: string | undefined = undefined;
      const library = useLibraryStore.getState();

      if (!audioUri) {
        const downloaded = library.getDownloadedTrack(track.id);
        if (downloaded?.localUri) {
          audioUri = downloaded.localUri;
          track = downloaded;
        }
      }

      if (!audioUri) {
        const resolved = await StreamResolver.getStreamUrl(
          track.id,
          library.audioQuality
        );
        if (resolved) {
          audioUri = resolved.url;
          userAgent = resolved.userAgent;
        } else {
          audioUri = track.streamUrl;
        }
      }

      if (!audioUri) throw new Error("Unable to resolve audio playback URL");

      await TrackPlayer.add({
        id: track.id,
        url: audioUri,
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        contentType: track.contentType,
        headers: userAgent ? { "User-Agent": userAgent } : undefined,
      });

      await TrackPlayer.play();
    } catch (error) {
      console.error("[Player] playTrack error:", error);
      set({
        isBuffering: false,
        isPlaying: false,
        playbackError:
          error instanceof Error ? error.message : "Unable to start playback.",
      });
    }
  },

  togglePlayPause: async () => {
    const { isPlaying, currentTrack, queue, playTrack } = get();
    try {
      if (isPlaying) {
        await TrackPlayer.pause();
      } else {
        const state = (await TrackPlayer.getPlaybackState()).state;
        if (state === State.None || state === State.Stopped) {
          if (currentTrack) await playTrack(currentTrack);
          else if (queue.length > 0) await playTrack(queue[0]);
        } else {
          await TrackPlayer.play();
        }
      }
    } catch {}
  },

  seekTo: async (seconds: number) => {
    set({ positionMillis: seconds * 1000 });
    try {
      await TrackPlayer.seekTo(seconds);
    } catch {}
  },

  playNext: async () => {
    const { queue, queueIndex, repeatMode, shuffle, playTrack } = get();
    if (queue.length === 0) return;

    let nextIndex = queueIndex + 1;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else if (nextIndex >= queue.length) {
      if (repeatMode === "all") nextIndex = 0;
      else return;
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) await playTrack(nextTrack);
  },

  handleQueueEnded: async () => {
    const { queue, queueIndex, repeatMode, shuffle, currentTrack } = get();
    if (repeatMode === "one" && currentTrack) {
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
      return;
    }
    if (queue.length === 0) {
      set({ isPlaying: false, isBuffering: false });
      return;
    }

    let nextIndex = queueIndex + 1;
    if (shuffle && queue.length > 1) {
      const candidates = queue
        .map((_track, index) => index)
        .filter((index) => index !== queueIndex);
      nextIndex = candidates[Math.floor(Math.random() * candidates.length)];
    } else if (nextIndex >= queue.length) {
      if (repeatMode === "all") nextIndex = 0;
      else {
        set({
          isPlaying: false,
          isBuffering: false,
          positionMillis: get().durationMillis,
        });
        return;
      }
    }

    const nextTrack = queue[nextIndex];
    if (nextTrack) await get().playTrack(nextTrack);
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
    if (prevTrack) await playTrack(prevTrack);
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
      if (index < state.queueIndex) newIdx--;
      else if (index === state.queueIndex && newIdx >= updated.length) {
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
    try {
      await TrackPlayer.setVolume(clamped);
    } catch {}
  },
}));
