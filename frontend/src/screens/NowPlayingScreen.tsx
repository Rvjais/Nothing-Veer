import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Share,
  Alert,
  Animated,
  PanResponder,
  Easing,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { NothingText } from "../components/common/NothingText";
import { VinylDisc } from "../components/player/VinylDisc";
import { PlayerControls } from "../components/player/PlayerControls";
import { LyricsOverlay } from "../components/player/LyricsOverlay";
import { QueueModal } from "../components/player/QueueModal";
import { PlaylistPickerModal } from "../components/player/PlaylistPickerModal";
import { SongInfoModal } from "../components/player/SongInfoModal";
import { useThemeStore } from "../store/useThemeStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface NowPlayingScreenProps {
  visible: boolean;
  onClose: () => void;
}

export const NowPlayingScreen: React.FC<NowPlayingScreenProps> = ({
  visible,
  onClose,
}) => {
  const [showLyrics, setShowLyrics] = useState(false);
  const [queueModalVisible, setQueueModalVisible] = useState(false);
  const [playlistPickerVisible, setPlaylistPickerVisible] = useState(false);
  const [songInfoVisible, setSongInfoVisible] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1x");
  const { colors, isDark } = useThemeStore();

  const translateY = useRef(new Animated.Value(0)).current;
  const timelineScrubPreviewRef = useRef<((seconds: number | null) => void) | null>(null);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isBuffering = usePlayerStore((s) => s.isBuffering);
  const positionMillis = usePlayerStore((s) => s.positionMillis);
  const durationMillis = usePlayerStore((s) => s.durationMillis);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeatMode = usePlayerStore((s) => s.repeatMode);
  const volume = usePlayerStore((s) => s.volume);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const playNext = usePlayerStore((s) => s.playNext);
  const playPrevious = usePlayerStore((s) => s.playPrevious);
  const seekTo = usePlayerStore((s) => s.seekTo);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const setVolume = usePlayerStore((s) => s.setVolume);

  const registerTimelineScrubPreview = useCallback(
    (handler: ((seconds: number | null) => void) | null) => {
      timelineScrubPreviewRef.current = handler;
    },
    []
  );

  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const isFavorite = useLibraryStore((s) =>
    currentTrack ? s.isFavorite(currentTrack.id) : false
  );
  const isDownloaded = useLibraryStore((s) =>
    currentTrack ? s.isDownloaded(currentTrack.id) : false
  );
  const activeDownloads = useLibraryStore((s) => s.activeDownloads);
  const downloadTrack = useLibraryStore((s) => s.downloadTrack);
  const isDownloading = currentTrack ? activeDownloads[currentTrack.id] !== undefined : false;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  const handleDismiss = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  // Pull-down-to-dismiss PanResponder
  const pullPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.2;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  if (!currentTrack) return null;

  const handleToggleSpeed = () => {
    try {
      Haptics.selectionAsync();
    } catch {}
    const speeds = ["1x", "1.25x", "1.5x", "0.75x"];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Listening to ${currentTrack.title} by ${currentTrack.artist} on Nothing Music!\nhttps://music.youtube.com/watch?v=${currentTrack.id}`,
      });
    } catch {}
  };

  const handleDownload = async () => {
    if (!currentTrack) return;
    if (isDownloaded) {
      Alert.alert(
        "OFFLINE TRACK",
        `"${currentTrack.title}" is already saved to your device. You can listen offline in Library > Downloads.`
      );
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    try {
      await downloadTrack(currentTrack);
    } catch (error) {
      Alert.alert(
        "Download failed",
        error instanceof Error ? error.message : "Could not save this track."
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={handleDismiss}
      transparent
      statusBarTranslucent
    >
      <Animated.View
        {...pullPanResponder.panHandlers}
        style={[
          styles.container,
          { backgroundColor: colors.background },
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <StatusBar
          barStyle={isDark ? "light-content" : "dark-content"}
          backgroundColor={colors.background}
        />
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          {/* Pull-Down Drag Pill Handle */}
          <View style={styles.dragHandleWrapper}>
            <View style={[styles.dragHandleBar, { backgroundColor: colors.greyDark }]} />
          </View>

          {/* Top bar actions stay taps; only the top handle starts pull-to-dismiss. */}
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleDismiss}
              style={styles.iconBtn}
            >
              <Ionicons
                name="chevron-down"
                size={24}
                color={colors.white}
              />
            </TouchableOpacity>

            <View style={styles.centerTitleWrapper}>
              <NothingText variant="dot" size={10} color="dim" style={styles.playingFromText}>
                Playing from
              </NothingText>
              <NothingText variant="dot" size={11} color="white">
                Global Catalog
              </NothingText>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShare}
              style={styles.iconBtn}
            >
              <Ionicons
                name="share-outline"
                size={21}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* Main Visual: Turntable Disc OR Synced Lyrics */}
          <View style={styles.visualContainer}>
            {showLyrics ? (
              <View style={styles.lyricsWrapper}>
                <LyricsOverlay
                  title={currentTrack.title}
                  artist={currentTrack.artist}
                  duration={currentTrack.duration}
                  positionMillis={positionMillis}
                  onSeek={seekTo}
                  onClose={() => setShowLyrics(false)}
                />
              </View>
            ) : (
              <VinylDisc
                artwork={currentTrack.artwork}
                artist={currentTrack.artist}
                album={currentTrack.album}
                isPlaying={isPlaying}
                positionMillis={positionMillis}
                durationMillis={durationMillis}
                speed={playbackSpeed}
                onToggleSpeed={handleToggleSpeed}
                onPress={() => setSongInfoVisible(true)}
                onSeek={seekTo}
                onScrubPreview={(seconds) => timelineScrubPreviewRef.current?.(seconds)}
              />
            )}
          </View>

          {/* Track Info Row: Queue Icon, Title Capsule, Star Icon */}
          <View style={styles.trackInfoRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                setQueueModalVisible(true);
              }}
              style={styles.actionCircleBtn}
            >
              <Ionicons
                name="albums-outline"
                size={18}
                color={colors.whiteDim}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSongInfoVisible(true)}
              style={[
                styles.titleCapsule,
                { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle },
              ]}
              accessibilityLabel="Show track details"
            >
              <NothingText
                variant="dot"
                size={12}
                color="white"
                numberOfLines={1}
                style={styles.titleCapsuleText}
              >
                {currentTrack.title.toUpperCase()}
              </NothingText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch {}
                toggleFavorite(currentTrack);
              }}
              style={styles.actionCircleBtn}
            >
              <Ionicons
                name={isFavorite ? "star" : "star-outline"}
                size={20}
                color={isFavorite ? colors.red : colors.whiteDim}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.extraActionsRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setPlaylistPickerVisible(true)}
              style={[
                styles.extraActionButton,
                { backgroundColor: colors.glassBackground, borderColor: colors.glassBorder },
              ]}
            >
              <Ionicons name="add-circle-outline" size={17} color={colors.whiteDim} />
              <NothingText variant="dot" size={9} color="dim" numberOfLines={1}>
                ADD TO PLAYLIST
              </NothingText>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowLyrics((current) => !current)}
              style={[
                styles.extraActionButton,
                {
                  backgroundColor: showLyrics ? colors.surfaceMid : colors.glassBackground,
                  borderColor: showLyrics ? colors.borderActive : colors.glassBorder,
                },
              ]}
            >
              <Ionicons
                name={showLyrics ? "disc-outline" : "musical-notes-outline"}
                size={16}
                color={showLyrics ? colors.red : colors.whiteDim}
              />
              <NothingText variant="dot" size={9} color={showLyrics ? "red" : "dim"}>
                {showLyrics ? "HIDE LYRICS" : "LYRICS"}
              </NothingText>
            </TouchableOpacity>
          </View>

          {/* Main Transport Controls & Nothing Dotted Timeline Slider */}
          <PlayerControls
            isPlaying={isPlaying}
            isBuffering={isBuffering}
            shuffle={shuffle}
            repeatMode={repeatMode}
            onPlayPause={togglePlayPause}
            onNext={playNext}
            onPrevious={playPrevious}
            onToggleShuffle={toggleShuffle}
            onCycleRepeat={cycleRepeat}
            onDownload={handleDownload}
            isDownloaded={isDownloaded}
            isDownloading={isDownloading}
            positionMillis={positionMillis}
            durationMillis={durationMillis}
            onSeek={seekTo}
            onRegisterScrubPreview={registerTimelineScrubPreview}
            volume={volume}
            onVolumeChange={setVolume}
          />
        </SafeAreaView>

        {/* Queue Modal */}
        <QueueModal
          visible={queueModalVisible}
          onClose={() => setQueueModalVisible(false)}
        />
        <PlaylistPickerModal
          visible={playlistPickerVisible}
          track={currentTrack}
          onClose={() => setPlaylistPickerVisible(false)}
        />
        <SongInfoModal
          visible={songInfoVisible}
          track={currentTrack}
          onClose={() => setSongInfoVisible(false)}
        />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  safeArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  dragHandleWrapper: {
    width: "100%",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 4,
    height: 50,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTitleWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  playingFromText: {
    marginBottom: 1,
    letterSpacing: 0.8,
  },
  visualContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lyricsWrapper: {
    flex: 1,
    width: "100%",
  },
  trackInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 6,
  },
  extraActionsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 30,
    marginBottom: 4,
  },
  extraActionButton: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  actionCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleCapsule: {
    flex: 1,
    height: 38,
    marginHorizontal: 12,
    borderRadius: 19,
    backgroundColor: "#18181A",
    borderWidth: 1,
    borderColor: "#28282B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  titleCapsuleText: {
    letterSpacing: 1.2,
  },
});


