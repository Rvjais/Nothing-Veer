import TrackPlayer, {
  AppKilledBehavior,
  Capability,
  RepeatMode,
  Event,
} from 'react-native-track-player';

export async function setupTrackPlayer() {
  let isSetup = false;
  try {
    // Check if it's already set up
    await TrackPlayer.getCurrentTrack();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer({
      maxCacheSize: 1024 * 50, // 50 MB cache
    });
    
    await TrackPlayer.updateOptions({
      android: {
        appKilledBehavior: AppKilledBehavior.StopPlaybackAndRemoveNotification,
      },
      // Media controls capabilities
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.Stop,
        Capability.SeekTo,
      ],
      // Capabilities that will show up when the notification is in the compact form on Android
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    });
    
    isSetup = true;
  }
  return isSetup;
}

export async function registerTrackPlayerService() {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
}
