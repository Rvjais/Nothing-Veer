import React, { useState, useRef, useEffect } from "react";
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
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useThemeStore } from "../store/useThemeStore";
import { NothingColors, NothingFonts, NothingLayout } from "../constants/theme";
import { NothingText } from "../components/common/NothingText";
import { VinylDisc } from "../components/player/VinylDisc";
import { PlayerControls } from "../components/player/PlayerControls";
import { LyricsOverlay } from "../components/player/LyricsOverlay";
import { QueueModal } from "../components/player/QueueModal";
import { AlbumSheet } from "../components/player/AlbumSheet";

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
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [albumSheetVisible, setAlbumSheetVisible] = useState(false);

  const { colors, isDark } = useThemeStore();
  const translateY = useRef(new Animated.Value(0)).current;

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
  }, [visible]);

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
      translateY.setValue(0);
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
    await downloadTrack(currentTrack);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleDismiss}
      transparent={false}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
            transform: [{ translateY }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          {/* Pull-Down Drag Pill Handle */}
          <View {...pullPanResponder.panHandlers} style={styles.dragHandleWrapper}>
            <View style={[styles.dragHandleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)' }]} />
          </View>

          {/* Top Bar matching Nothing OS + Pull down support */}
          <View {...pullPanResponder.panHandlers} style={styles.topBar}>
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
                YouTube Music
              </NothingText>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleShare}
              style={styles.iconBtn}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={colors.white}
              />
            </TouchableOpacity>
          </View>

          {/* Main Visual: Turntable Disc OR Synced Lyrics */}
          <View style={styles.visualContainer}>
            {showLyrics ? (
              <View {...pullPanResponder.panHandlers} style={styles.lyricsWrapper}>
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
                onPress={() => setShowLyrics(true)}
                onSeek={seekTo}
              />
            )}
          </View>

          {/* Track Info Row: Queue/Album Icon, Title Capsule, Star Icon */}
          <View style={styles.trackInfoRow}>
            {/* Show Album button if track has albumId, else Queue button */}
            {currentTrack.albumId ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setAlbumSheetVisible(true);
                }}
                style={styles.actionCircleBtn}
              >
                <Ionicons name="disc-outline" size={18} color={colors.whiteDim} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                  setQueueModalVisible(true);
                }}
                style={styles.actionCircleBtn}
              >
                <Ionicons name="albums-outline" size={18} color={colors.whiteDim} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setInfoModalVisible(true)}
              style={[styles.titleCapsule, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}
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
            volume={volume}
            onVolumeChange={(v) => setVolume(v)}
            onDownload={handleDownload}
            isDownloaded={isDownloaded}
            isDownloading={isDownloading}
            positionMillis={positionMillis}
            durationMillis={durationMillis}
            onSeek={seekTo}
            showLyrics={showLyrics}
            onToggleLyrics={() => setShowLyrics(!showLyrics)}
          />
        </SafeAreaView>

        {/* Queue Modal */}
        <QueueModal
          visible={queueModalVisible}
          onClose={() => setQueueModalVisible(false)}
        />

        {/* Album Track List Sheet */}
        {currentTrack.albumId && (
          <AlbumSheet
            visible={albumSheetVisible}
            browseId={currentTrack.albumId}
            albumName={currentTrack.album || "Album"}
            albumArtist={currentTrack.artist}
            albumArtwork={currentTrack.artwork}
            onClose={() => setAlbumSheetVisible(false)}
          />
        )}

        {/* Info Modal */}
        <Modal
          visible={infoModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} onPress={() => setInfoModalVisible(false)}>
            <TouchableWithoutFeedback>
              <View style={{ width: '85%', backgroundColor: colors.surfaceLow, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: colors.borderSubtle }}>
                <NothingText variant="h3" color="white" style={{ marginBottom: 16, textAlign: 'center' }}>
                  {currentTrack.title}
                </NothingText>
                <NothingText variant="bodyMedium" color="dim" style={{ marginBottom: 8, textAlign: 'center' }}>
                  {currentTrack.artist}
                </NothingText>
                {currentTrack.album && (
                  <NothingText variant="body" color="grey" style={{ textAlign: 'center' }}>
                    {currentTrack.album}
                  </NothingText>
                )}
                
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setInfoModalVisible(false)}
                  style={{ marginTop: 24, paddingVertical: 12, backgroundColor: colors.red, borderRadius: 24, alignItems: 'center' }}
                >
                  <NothingText variant="dot" size={12} color="white">
                    CLOSE
                  </NothingText>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </Modal>
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
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 4,
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
    marginVertical: 12,
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
