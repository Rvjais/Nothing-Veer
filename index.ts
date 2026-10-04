import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import { registerTrackPlayerService } from './src/services/TrackPlayerService';

import App from './App';

registerRootComponent(App);
TrackPlayer.registerPlaybackService(() => registerTrackPlayerService);
