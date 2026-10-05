import TrackPlayer, { Event } from 'react-native-track-player';
import { usePlayerStore } from '../store/usePlayerStore';

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await usePlayerStore.getState().playNext();
    } catch (error) {
      console.warn("[Player] Remote next failed:", error);
    }
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await usePlayerStore.getState().playPrevious();
    } catch (error) {
      console.warn("[Player] Remote previous failed:", error);
    }
  });
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => TrackPlayer.seekTo(event.position));
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async () => {
    try {
      await usePlayerStore.getState().handleQueueEnded();
    } catch (error) {
      console.warn("[Player] Queue advance failed:", error);
    }
  });
};
