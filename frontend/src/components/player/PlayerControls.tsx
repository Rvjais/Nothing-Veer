import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { NothingLayout } from "../../constants/theme";
import { useThemeStore } from "../../store/useThemeStore";
import { RepeatMode } from "../../store/usePlayerStore";
import { NothingText } from "../common/NothingText";

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
  onDownload?: () => void;
  isDownloaded?: boolean;
  isDownloading?: boolean;
  positionMillis?: number;
  durationMillis?: number;
  onSeek?: (seconds: number) => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  onRegisterScrubPreview?: (handler: ((seconds: number | null) => void) | null) => void;
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
  onDownload,
  isDownloaded = false,
  isDownloading = false,
  positionMillis = 0,
  durationMillis = 180000,
  onSeek,
  volume = 1,
  onVolumeChange,
  onRegisterScrubPreview,
}) => {
  const { colors, isDark } = useThemeStore();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPositionMillis, setScrubPositionMillis] = useState(positionMillis);
  const [vinylPreviewMillis, setVinylPreviewMillis] = useState<number | null>(null);
  const timelineWidthRef = useRef(1);
  const timelineLeftRef = useRef(0);
  const timelineRef = useRef<View>(null);
  const latestValuesRef = useRef({ durationMillis, onSeek });
  latestValuesRef.current = { durationMillis, onSeek };
  const volumeChangeRef = useRef(onVolumeChange);
  volumeChangeRef.current = onVolumeChange;
  const thumbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const updateVinylPreview = (seconds: number | null) => {
      setVinylPreviewMillis(seconds === null ? null : seconds * 1000);
    };
    onRegisterScrubPreview?.(updateVinylPreview);
    return () => onRegisterScrubPreview?.(null);
  }, [onRegisterScrubPreview]);

  const isThumbActive = isScrubbing || vinylPreviewMillis !== null;
  useEffect(() => {
    if (!isThumbActive) {
      Animated.spring(thumbScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 180,
        friction: 9,
      }).start();
      return;
    }

    Animated.spring(thumbScale, {
      toValue: 1.15,
      useNativeDriver: true,
      tension: 180,
      friction: 6,
    }).start();
  }, [isThumbActive, thumbScale]);

  const handlePress = (callback: () => void) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    callback();
  };

  const updateScrubPosition = (touchX: number) => {
    const { durationMillis: latestDuration } = latestValuesRef.current;
    const ratio = Math.max(0, Math.min(1, touchX / timelineWidthRef.current));
    const nextPosition = ratio * Math.max(0, latestDuration);
    setScrubPositionMillis(nextPosition);
    return nextPosition;
  };

  const timelinePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_event, gestureState) => {
        setIsScrubbing(true);
        updateScrubPosition(gestureState.x0 - timelineLeftRef.current);
      },
      onPanResponderMove: (_event, gestureState) => {
        updateScrubPosition(gestureState.moveX - timelineLeftRef.current);
      },
      onPanResponderRelease: (_event, gestureState) => {
        const nextPosition = updateScrubPosition(gestureState.moveX - timelineLeftRef.current);
        const { onSeek: seek } = latestValuesRef.current;
        if (seek) {
          try {
            Haptics.selectionAsync();
          } catch {}
          seek(nextPosition / 1000);
        }
        setIsScrubbing(false);
      },
      onPanResponderTerminate: () => {
        setIsScrubbing(false);
      },
    })
  ).current;

const visiblePosition = isScrubbing
    ? scrubPositionMillis
    : vinylPreviewMillis ?? positionMillis;
  const progressPercent =
    durationMillis > 0
      ? Math.min(100, Math.max(0, (visiblePosition / durationMillis) * 100))
      : 0;
  const playButtonBackground = isDark ? "#FFFFFF" : "#111111";
  const playButtonForeground = isDark ? "#000000" : "#FFFFFF";

  return (
    <View style={styles.container}>
      <View style={styles.transportRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onPrevious)}
          style={[
            styles.circleBtn,
            {
              backgroundColor: colors.surfaceLowest,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Ionicons name="play-skip-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePress(onPlayPause)}
          style={[
            styles.playPillBtn,
            {
              backgroundColor: playButtonBackground,
              shadowColor: playButtonBackground,
            },
          ]}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color={playButtonForeground} />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={28}
              color={playButtonForeground}
              style={!isPlaying ? { marginLeft: 3 } : null}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onNext)}
          style={[
            styles.circleBtn,
            {
              backgroundColor: colors.surfaceLowest,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <Ionicons name="play-skip-forward" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.timelineWrapper}>
        <View style={styles.timeRow}>
          <NothingText variant="dot" size={11} color="dim">
            {formatTime(visiblePosition)}
          </NothingText>
          <NothingText variant="dot" size={11} color="dim">
            {formatTime(durationMillis)}
          </NothingText>
        </View>

        <View
          ref={timelineRef}
          {...timelinePanResponder.panHandlers}
          style={styles.timelineTouchArea}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width || 1;
            timelineWidthRef.current = width;
            timelineRef.current?.measureInWindow((x) => {
              timelineLeftRef.current = x;
            });
          }}
          accessibilityRole="adjustable"
          accessibilityLabel="Playback position"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progressPercent) }}
        >
          <View style={styles.dottedTrackRow}>
            {Array.from({ length: 32 }).map((_, index) => {
              const dotProgress = (index / 31) * 100;
              const isFilled = dotProgress <= progressPercent;
              return (
                <View
                  key={index}
                  style={[
                    styles.timelineDot,
                    { backgroundColor: isFilled ? colors.whiteDim : colors.greySubtle },
                  ]}
                />
              );
            })}
          </View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.timelineThumb,
              {
                left: `${progressPercent}%`,
                backgroundColor: colors.glassBackground,
                borderColor: colors.glassBorder,
                transform: [{ scale: thumbScale }],
              },
            ]}
          >
            <View
              style={[
                styles.thumbGloss,
                { backgroundColor: isDark ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.82)" },
              ]}
            />
          </Animated.View>
        </View>
      </View>

      <View style={styles.bottomBarRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onToggleShuffle)}
          style={styles.bottomIconBtn}
          accessibilityLabel={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
        >
          <Ionicons
            name="shuffle-outline"
            size={20}
            color={shuffle ? colors.red : colors.whiteDim}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (onDownload) handlePress(onDownload);
          }}
          style={styles.bottomIconBtn}
          disabled={isDownloading}
          accessibilityLabel={isDownloaded ? "Track downloaded" : "Download track"}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.red} />
          ) : (
            <Ionicons
              name={isDownloaded ? "cloud-done" : "download-outline"}
              size={21}
              color={isDownloaded ? colors.red : colors.whiteDim}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onCycleRepeat)}
          style={styles.bottomIconBtn}
          accessibilityLabel={`Repeat ${repeatMode}`}
        >
          <Ionicons
            name={repeatMode === "one" ? "repeat" : "repeat-outline"}
            size={20}
            color={repeatMode !== "off" ? colors.red : colors.whiteDim}
          />
          {repeatMode === "one" && (
            <View style={[styles.repeatBadge, { backgroundColor: colors.background }]}>
              <Ionicons name="ellipse" size={4} color={colors.red} />
            </View>
          )}
        </TouchableOpacity>

        </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    marginTop: 4,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 10,
  },
  circleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playPillBtn: {
    width: 156,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  timelineWrapper: {
    width: "78%",
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timelineTouchArea: {
    height: 28,
    justifyContent: "center",
    position: "relative",
    paddingHorizontal: 1,
  },
  dottedTrackRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 4,
  },
  timelineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  timelineThumb: {
    position: "absolute",
    marginLeft: -13,
    top: 8,
    width: 26,
    height: 12,
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 1,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbGloss: {
    width: "68%",
    height: 2,
    borderRadius: 1,
  },
  bottomBarRow: {
    width: "78%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 2,
  },
  bottomIconBtn: {
    padding: 8,
    position: "relative",
  },
  volumeControl: {
    position: "relative",
    zIndex: 10,
  },
  volumePopover: {
    position: "absolute",
    bottom: 42,
    right: -10,
    width: 42,
    minHeight: 180,
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    paddingBottom: 10,
    zIndex: 20,
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  volumeRail: {
    width: 14,
    height: 120,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "visible",
  },
  volumeFill: {
    position: "absolute",
    bottom: 0,
    width: 2,
    borderRadius: 1,
  },
  volumeThumb: {
    position: "absolute",
    width: 12,
    height: 4,
    borderRadius: 2,
    marginBottom: -2,
    borderWidth: 0,
  },
  muteButton: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  repeatBadge: {
    position: "absolute",
    top: 5,
    right: 5,
  },
});




