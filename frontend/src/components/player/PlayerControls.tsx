import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { NothingColors } from "../../constants/theme";
import { NothingText } from "../common/NothingText";
import { RepeatMode } from "../../store/usePlayerStore";

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
}) => {
  const [timelineWidth, setTimelineWidth] = useState(260);

  const handlePress = (callback: () => void) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    callback();
  };

  const progressPercent =
    durationMillis > 0
      ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100))
      : 0;

  const handleTimelineScrub = (locationX: number) => {
    if (timelineWidth > 0 && durationMillis > 0 && onSeek) {
      const ratio = Math.max(0, Math.min(1, locationX / timelineWidth));
      try {
        Haptics.selectionAsync();
      } catch {}
      onSeek(ratio * (durationMillis / 1000));
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Main Transport Controls */}
      <View style={styles.transportRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onPrevious)}
          style={styles.circleBtn}
        >
          <Ionicons
            name="play-skip-back"
            size={22}
            color={NothingColors.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handlePress(onPlayPause)}
          style={styles.playPillBtn}
        >
          {isBuffering ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={28}
              color="#000000"
              style={!isPlaying ? { marginLeft: 3 } : null}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onNext)}
          style={styles.circleBtn}
        >
          <Ionicons
            name="play-skip-forward"
            size={22}
            color={NothingColors.white}
          />
        </TouchableOpacity>
      </View>

      {/* 2. Nothing OS Dotted Timeline Scrubber */}
      <View style={styles.timelineWrapper}>
        <View style={styles.timeRow}>
          <NothingText variant="dot" size={11} color="dim">
            {formatTime(positionMillis)}
          </NothingText>
          <NothingText variant="dot" size={11} color="dim">
            {formatTime(durationMillis)}
          </NothingText>
        </View>

        <TouchableOpacity
          activeOpacity={1}
          style={styles.timelineTouchArea}
          onLayout={(e) => setTimelineWidth(e.nativeEvent.layout.width)}
          onPress={(e) => handleTimelineScrub(e.nativeEvent.locationX)}
        >
          {/* Authentic Nothing OS Dotted Track */}
          <View style={styles.dottedTrackRow}>
            {Array.from({ length: 32 }).map((_, index) => {
              const dotProgress = (index / 31) * 100;
              const isFilled = dotProgress <= progressPercent;
              return (
                <View
                  key={index}
                  style={[
                    styles.timelineDot,
                    isFilled && styles.timelineDotActive,
                  ]}
                />
              );
            })}
          </View>

          {/* Dotted Slider Active Progress Line & Glowing Red LED Indicator */}
          <View
            style={[
              styles.timelineThumb,
              { left: `${progressPercent}%` },
            ]}
          >
            <View style={styles.thumbLed} />
          </View>
        </TouchableOpacity>
      </View>

      {/* 3. Volume Slider Row with Nothing Red Scrubber */}
      <View style={styles.volumeRow}>
        <Ionicons
          name="volume-mute-outline"
          size={15}
          color={NothingColors.grey}
        />
        <TouchableOpacity
          activeOpacity={1}
          style={styles.volumeTrack}
          onPress={(e) => {
            const { locationX } = e.nativeEvent;
            const newVol = Math.max(0, Math.min(1, locationX / 190));
            onVolumeChange?.(newVol);
          }}
        >
          <View
            style={[
              styles.volumeFill,
              { width: `${Math.round(volume * 100)}%` },
            ]}
          />
          <View
            style={[
              styles.volumeThumb,
              { left: `${Math.round(volume * 100)}%` },
            ]}
          />
        </TouchableOpacity>
        <Ionicons
          name="volume-high-outline"
          size={15}
          color={NothingColors.grey}
        />
      </View>

      {/* 4. Bottom Action Bar: Shuffle, Offline Download, Repeat */}
      <View style={styles.bottomBarRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onToggleShuffle)}
          style={styles.bottomIconBtn}
        >
          <Ionicons
            name="shuffle-outline"
            size={20}
            color={shuffle ? NothingColors.red : NothingColors.whiteDim}
          />
        </TouchableOpacity>

        {/* Offline Download Action */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            if (onDownload) handlePress(onDownload);
          }}
          style={styles.bottomIconBtn}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={NothingColors.red} />
          ) : (
            <Ionicons
              name={isDownloaded ? "cloud-done" : "download-outline"}
              size={21}
              color={isDownloaded ? NothingColors.red : NothingColors.whiteDim}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handlePress(onCycleRepeat)}
          style={styles.bottomIconBtn}
        >
          <Ionicons
            name={repeatMode === "one" ? "repeat" : "repeat-outline"}
            size={20}
            color={repeatMode !== "off" ? NothingColors.red : NothingColors.whiteDim}
          />
          {repeatMode === "one" && (
            <View style={styles.repeatBadge}>
              <Ionicons name="ellipse" size={4} color={NothingColors.red} />
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
    backgroundColor: NothingColors.surfaceLowest,
    borderWidth: 1,
    borderColor: NothingColors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  playPillBtn: {
    width: 156,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFFFFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  timelineWrapper: {
    width: "78%",
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timelineTouchArea: {
    height: 24,
    justifyContent: "center",
    position: "relative",
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
    backgroundColor: "#2C2C2E",
  },
  timelineDotActive: {
    backgroundColor: NothingColors.white,
  },
  timelineThumb: {
    position: "absolute",
    marginLeft: -6,
    top: 6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbLed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NothingColors.red,
    shadowColor: NothingColors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  volumeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 6,
  },
  volumeTrack: {
    width: 190,
    height: 18,
    justifyContent: "center",
    position: "relative",
  },
  volumeFill: {
    height: 2,
    backgroundColor: NothingColors.red,
    borderRadius: 1,
  },
  volumeThumb: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NothingColors.red,
    marginLeft: -4,
    top: 5,
  },
  bottomBarRow: {
    width: "65%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 2,
  },
  bottomIconBtn: {
    padding: 8,
    position: "relative",
  },
  repeatBadge: {
    position: "absolute",
    top: 5,
    right: 5,
  },
});
