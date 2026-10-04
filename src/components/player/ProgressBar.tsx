import React, { useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
} from "react-native";
import { NothingColors, NothingLayout } from "../../constants/theme";
import { NothingText } from "../common/NothingText";

export interface ProgressBarProps {
  positionMillis: number;
  durationMillis: number;
  onSeek: (seconds: number) => void;
}

function formatTime(secondsTotal: number): string {
  if (isNaN(secondsTotal) || secondsTotal < 0) return "00:00";
  const m = Math.floor(secondsTotal / 60);
  const s = Math.floor(secondsTotal % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  positionMillis,
  durationMillis,
  onSeek,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [barWidth, setBarWidth] = useState(1);

  const durationSec = Math.max(1, durationMillis / 1000);
  const currentSec = isScrubbing
    ? scrubPosition
    : Math.min(positionMillis / 1000, durationSec);
  const progressRatio = Math.min(1, Math.max(0, currentSec / durationSec));

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      setIsScrubbing(true);
      const touchX = evt.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, touchX / barWidth));
      setScrubPosition(ratio * durationSec);
    },
    onPanResponderMove: (evt: GestureResponderEvent) => {
      const touchX = evt.nativeEvent.locationX;
      const ratio = Math.max(0, Math.min(1, touchX / barWidth));
      setScrubPosition(ratio * durationSec);
    },
    onPanResponderRelease: () => {
      setIsScrubbing(false);
      onSeek(scrubPosition);
    },
    onPanResponderTerminate: () => {
      setIsScrubbing(false);
    },
  });

  return (
    <View style={styles.container}>
      {/* Progress Track */}
      <View
        style={styles.trackContainer}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width || 1)}
        {...panResponder.panHandlers}
      >
        <View style={styles.trackBackground}>
          <View
            style={[styles.trackFilled, { width: `${progressRatio * 100}%` }]}
          />
        </View>

        {/* Thumb Knob */}
        <View
          style={[
            styles.thumb,
            { left: `${progressRatio * 100}%` },
            isScrubbing && styles.thumbActive,
          ]}
        />
      </View>

      {/* Timestamps */}
      <View style={styles.timeRow}>
        <NothingText variant="mono" size={11} color="grey">
          {formatTime(currentSec)}
        </NothingText>
        <NothingText variant="mono" size={11} color="grey">
          {formatTime(durationSec)}
        </NothingText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingVertical: 8,
  },
  trackContainer: {
    height: 32,
    justifyContent: "center",
    position: "relative",
  },
  trackBackground: {
    height: 4,
    backgroundColor: NothingColors.surfaceHigh,
    borderRadius: NothingLayout.radiusPill,
    overflow: "hidden",
  },
  trackFilled: {
    height: "100%",
    backgroundColor: NothingColors.red,
    borderRadius: NothingLayout.radiusPill,
  },
  thumb: {
    position: "absolute",
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: NothingColors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  thumbActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    backgroundColor: NothingColors.red,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
});

