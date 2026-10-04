import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Animated,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { NothingColors, NothingFonts, NothingLayout } from "../../constants/theme";
import { NothingText } from "../common/NothingText";
import { RepeatMode } from "../../store/usePlayerStore";
import { useThemeStore } from "../../store/useThemeStore";

export interface PlayerControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  shuffle: boolean;
  repeatMode: RepeatMode;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  onDownload?: () => void;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  positionMillis?: number;
  durationMillis?: number;
  onSeek?: (seconds: number) => void;
  showLyrics?: boolean;
  onToggleLyrics?: () => void;
}

function formatTime(millis?: number): string {
  if (!millis || isNaN(millis) || millis < 0) return "00:00";
  const totalSecs = Math.floor(millis / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  isBuffering,
  shuffle,
  repeatMode,
  onPlayPause,
  onNext,
  onPrevious,
  onToggleShuffle,
  onCycleRepeat,
  volume = 0.8,
  onVolumeChange,
  onDownload,
  isDownloaded = false,
  isDownloading = false,
  positionMillis = 0,
  durationMillis = 180000,
  onSeek,
  showLyrics = false,
  onToggleLyrics,
}) => {
  const [timelineWidth, setTimelineWidth] = useState(260);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [localVolume, setLocalVolume] = useState(volume);
  const volumeHeight = 150;

  // Keep localVolume in sync with prop
  useEffect(() => {
    if (!showVolumeModal) setLocalVolume(volume);
  }, [volume, showVolumeModal]);

  // Use refs for callbacks so PanResponder always has fresh values
  const onVolumeChangeRef = useRef(onVolumeChange);
  onVolumeChangeRef.current = onVolumeChange;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;
  const durationRef = useRef(durationMillis);
  durationRef.current = durationMillis;
  const timelineWidthRef = useRef(timelineWidth);
  timelineWidthRef.current = timelineWidth;
  const scrubPositionRef = useRef(scrubPosition);
  scrubPositionRef.current = scrubPosition;

  // Animation for Play/Pause
  const playScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(playScale, { toValue: 0.8, duration: 100, useNativeDriver: true }),
      Animated.spring(playScale, { toValue: 1, friction: 4, useNativeDriver: true })
    ]).start();
  }, [isPlaying]);

  const handlePress = (callback: () => void) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    callback();
  };

  const timelinePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrubbing(true);
        const { locationX } = evt.nativeEvent;
        const dur = durationRef.current;
        const w = timelineWidthRef.current;
        const newPos = Math.max(0, Math.min(dur, (locationX / w) * dur));
        setScrubPosition(newPos);
        scrubPositionRef.current = newPos;
      },
      onPanResponderMove: (evt, gestureState) => {
        const dur = durationRef.current;
        const w = timelineWidthRef.current;
        const startX = evt.nativeEvent.locationX - gestureState.dx;
        const currentX = startX + gestureState.dx;
        const newPos = Math.max(0, Math.min(dur, (currentX / w) * dur));
        setScrubPosition(newPos);
        scrubPositionRef.current = newPos;
      },
      onPanResponderRelease: () => {
        setIsScrubbing(false);
        if (onSeekRef.current) {
          try { Haptics.selectionAsync(); } catch {}
          onSeekRef.current(scrubPositionRef.current / 1000);
        }
      }
    })
  ).current;

  const volumePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationY } = evt.nativeEvent;
        const newVol = Math.max(0, Math.min(1, 1 - (locationY / 150)));
        setLocalVolume(newVol);
        onVolumeChangeRef.current?.(newVol);
      },
      onPanResponderMove: (evt, gestureState) => {
        const startY = evt.nativeEvent.locationY - gestureState.dy;
        const currentY = startY + gestureState.dy;
        const newVol = Math.max(0, Math.min(1, 1 - (currentY / 150)));
        setLocalVolume(newVol);
        onVolumeChangeRef.current?.(newVol);
      }
    })
  ).current;

  const currentDisplayPos = isScrubbing ? scrubPosition : positionMillis;
  const progressPercent = durationMillis > 0
      ? Math.min(100, Math.max(0, (currentDisplayPos / durationMillis) * 100))
      : 0;

  const { colors, isDark } = useThemeStore();

  return (
    <View style={styles.container}>
      {/* 1. Main Transport Controls */}
      <View style={styles.transportRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(onPrevious)} style={[styles.circleBtn, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]}>
          <Ionicons name="play-skip-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => handlePress(onPlayPause)}>
          <Animated.View style={[styles.playPillBtn, { backgroundColor: colors.white, transform: [{ scale: playScale }] }]}>
            {isBuffering ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={28}
                color={colors.background}
                style={!isPlaying ? { marginLeft: 3 } : null}
              />
            )}
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(onNext)} style={[styles.circleBtn, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]}>
          <Ionicons name="play-skip-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* 2. Nothing OS Dotted Timeline Scrubber */}
      <View style={styles.timelineWrapper}>
        <View style={styles.timeRow}>
          <NothingText variant="dot" size={11} color="dim">{formatTime(currentDisplayPos)}</NothingText>
          <NothingText variant="dot" size={11} color="dim">{formatTime(durationMillis)}</NothingText>
        </View>

        <View
          style={styles.timelineTouchArea}
          onLayout={(e) => { setTimelineWidth(e.nativeEvent.layout.width); timelineWidthRef.current = e.nativeEvent.layout.width; }}
          {...timelinePanResponder.panHandlers}
        >
          <View style={styles.dottedTrackRow} pointerEvents="none">
            {Array.from({ length: 32 }).map((_, index) => {
              const dotProgress = (index / 31) * 100;
              const isFilled = dotProgress <= progressPercent;
              return (
                <View
                  key={index}
                  style={[styles.timelineDot, { backgroundColor: isDark ? '#222' : '#CCC' }, isFilled && styles.timelineDotActive]}
                />
              );
            })}
          </View>
          <View style={[styles.timelineThumb, { left: `${progressPercent}%` }]} pointerEvents="none">
            <View style={styles.thumbLed} />
          </View>
        </View>
      </View>

      {/* 3. Bottom Action Bar: Shuffle, Lyrics, Download, Repeat, Volume */}
      <View style={styles.bottomBarRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(onToggleShuffle)} style={[styles.bottomIconBtn, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]}>
          <Ionicons name="shuffle-outline" size={20} color={shuffle ? colors.red : colors.whiteDim} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => { if (onToggleLyrics) handlePress(onToggleLyrics); }} style={[styles.bottomIconBtn, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]}>
          <Ionicons name="text-outline" size={20} color={showLyrics ? colors.red : colors.whiteDim} />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => { if (onDownload) handlePress(onDownload); }} style={[styles.bottomIconBtn, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]} disabled={isDownloading}>
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.red} />
          ) : (
            <Ionicons name={isDownloaded ? "cloud-done" : "download-outline"} size={21} color={isDownloaded ? colors.red : colors.whiteDim} />
          )}
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(onCycleRepeat)} style={[styles.bottomIconBtn, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]}>
          <Ionicons
            name={repeatMode === "one" ? "repeat-outline" : "repeat"}
            size={20}
            color={repeatMode !== "off" ? colors.red : colors.whiteDim}
          />
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.7} onPress={() => setShowVolumeModal(true)} style={[styles.bottomIconBtn, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]}>
          <Ionicons name="volume-medium" size={22} color={colors.red} />
        </TouchableOpacity>
      </View>

      {/* Vertical Volume Popover */}
      <Modal visible={showVolumeModal} transparent animationType="fade" onRequestClose={() => setShowVolumeModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowVolumeModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.volumePopover, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}>
                <Ionicons name="volume-high" size={20} color={colors.white} style={{ marginBottom: 12 }} />
                <View style={[styles.verticalVolumeTrack, { height: volumeHeight, backgroundColor: isDark ? '#222' : '#CCC' }]} {...volumePanResponder.panHandlers}>
                  <View style={[styles.verticalVolumeFill, { height: `${Math.round(localVolume * 100)}%` }]} pointerEvents="none" />
                  <View style={[styles.verticalVolumeThumb, { bottom: `${Math.round(localVolume * 100)}%` }]} pointerEvents="none" />
                </View>
                <Ionicons name="volume-mute" size={20} color={colors.grey} style={{ marginTop: 12 }} />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 24,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 30,
    marginBottom: 30,
  },
  playPillBtn: {
    width: 80,
    height: 50,
    borderRadius: 25,
    backgroundColor: NothingColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  timelineWrapper: {
    marginBottom: 20,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  timelineTouchArea: {
    height: 30,
    justifyContent: "center",
  },
  dottedTrackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 4,
    paddingHorizontal: 2,
  },
  timelineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#222",
  },
  timelineDotActive: {
    backgroundColor: NothingColors.red,
    shadowColor: NothingColors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineThumb: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -8,
  },
  thumbLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NothingColors.red,
    shadowColor: NothingColors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  bottomBarRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    marginTop: 10,
  },
  bottomIconBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#181818",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 30,
  },
  volumePopover: {
    backgroundColor: "#111",
    padding: 20,
    borderRadius: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222",
  },
  verticalVolumeTrack: {
    width: 6,
    backgroundColor: "#222",
    borderRadius: 3,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  verticalVolumeFill: {
    width: "100%",
    backgroundColor: NothingColors.red,
    borderRadius: 3,
  },
  verticalVolumeThumb: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: NothingColors.white,
    marginBottom: -8,
  },
});
