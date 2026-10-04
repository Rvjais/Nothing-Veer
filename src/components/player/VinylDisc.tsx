import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  Image,
  PanResponder,
} from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { NothingColors, NothingFonts } from "../../constants/theme";
import { NothingText } from "../common/NothingText";
import { useThemeStore } from "../../store/useThemeStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DISC_SIZE = Math.min(SCREEN_WIDTH * 0.74, 280);
const RADIUS = DISC_SIZE / 2;
const ARC_RADIUS = RADIUS + 16;

export interface VinylDiscProps {
  artwork: string;
  artist: string;
  album?: string;
  isPlaying: boolean;
  positionMillis: number;
  durationMillis: number;
  onPress?: () => void;
  onSeek?: (seconds: number) => void;
}

export const VinylDisc: React.FC<VinylDiscProps> = ({
  artwork,
  artist,
  album,
  isPlaying,
  positionMillis,
  durationMillis,
  onPress,
  onSeek,
}) => {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scrubAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Manual scrubbing rotation offset
  const scrubAngleRef = useRef(0);
  const lastAngleRef = useRef<number | null>(null);
  const lastHapticTime = useRef(0);

  useEffect(() => {
    if (isPlaying) {
      loopRef.current = Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 18000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loopRef.current.start();
    } else {
      if (loopRef.current) {
        loopRef.current.stop();
      }
    }

    return () => {
      if (loopRef.current) loopRef.current.stop();
    };
  }, [isPlaying]);

  // Rotational DJ turntable scratch/scrub gesture
  const scrubTargetSecs = useRef<number | null>(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const dx = locationX - RADIUS;
        const dy = locationY - RADIUS;
        lastAngleRef.current = Math.atan2(dy, dx);
      },
      onPanResponderMove: (evt) => {
        if (!onSeek || durationMillis <= 0) return;
        const { locationX, locationY } = evt.nativeEvent;
        const dx = locationX - RADIUS;
        const dy = locationY - RADIUS;
        const currentAngle = Math.atan2(dy, dx);

        if (lastAngleRef.current !== null) {
          let delta = currentAngle - lastAngleRef.current;
          // Handle wrap-around across -PI to +PI
          if (delta > Math.PI) delta -= 2 * Math.PI;
          if (delta < -Math.PI) delta += 2 * Math.PI;

          scrubAngleRef.current += delta;
          scrubAnim.setValue(scrubAngleRef.current);

          // 1 full turn (2 * PI) = 30 seconds of seeking
          const secondsDelta = (delta / (2 * Math.PI)) * 30;
          
          const currentSecs = scrubTargetSecs.current !== null ? scrubTargetSecs.current : (positionMillis / 1000);
          const totalSecs = durationMillis / 1000;
          const newSecs = Math.max(0, Math.min(totalSecs, currentSecs + secondsDelta));
          scrubTargetSecs.current = newSecs;

          // Throttle haptics
          const now = Date.now();
          if (now - lastHapticTime.current > 70) {
            lastHapticTime.current = now;
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
          }
        }
        lastAngleRef.current = currentAngle;
      },
      onPanResponderRelease: () => {
        lastAngleRef.current = null;
        if (scrubTargetSecs.current !== null) {
          onSeek!(scrubTargetSecs.current);
          scrubTargetSecs.current = null;
        }
      },
      onPanResponderTerminate: () => {
        lastAngleRef.current = null;
        scrubTargetSecs.current = null;
      },
    })
  ).current;

  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const scrubSpin = scrubAnim.interpolate({
    inputRange: [-Math.PI * 2, Math.PI * 2],
    outputRange: ["-360deg", "360deg"],
  });

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return "00:00";
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progress = durationMillis > 0 ? Math.min(1, Math.max(0, positionMillis / durationMillis)) : 0;
  const arcLength = 2 * Math.PI * ARC_RADIUS;

  const { colors, isDark } = useThemeStore();

  return (
    <View style={styles.container}>
      {/* Main Disc Area with Outer Progress Arc */}
      <View style={styles.discOuterWrapper}>
        {/* SVG Outer Progress Arc */}
        <Svg
          width={DISC_SIZE + 44}
          height={DISC_SIZE + 44}
          style={styles.svgOverlay}
        >
          {/* Subtle outer track */}
          <Circle
            cx={(DISC_SIZE + 44) / 2}
            cy={(DISC_SIZE + 44) / 2}
            r={ARC_RADIUS}
            fill="none"
            stroke={colors.surfaceLow}
            strokeWidth={3}
          />
          {/* Progress Arc */}
          <Circle
            cx={(DISC_SIZE + 44) / 2}
            cy={(DISC_SIZE + 44) / 2}
            r={ARC_RADIUS}
            fill="none"
            stroke={isDark ? "#E0E0E0" : "#222222"}
            strokeWidth={4.5}
            strokeDasharray={`${arcLength * 0.28} ${arcLength}`}
            strokeDashoffset={-arcLength * 0.12 - (arcLength * 0.28 * (1 - progress))}
            strokeLinecap="round"
          />
        </Svg>

        {/* Rotatable Turntable Vinyl Disc */}
        <View {...panResponder.panHandlers}>
          <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
            <Animated.View
              style={[
                styles.disc,
                {
                  width: DISC_SIZE,
                  height: DISC_SIZE,
                  borderRadius: RADIUS,
                  transform: [{ rotate: spin }, { rotate: scrubSpin }],
                  backgroundColor: isDark ? "#161616" : "#EAEAEA",
                  borderColor: isDark ? "#242424" : colors.borderSubtle,
                },
              ]}
            >
              {/* SVG Grooves and Crosshairs */}
              <Svg
                width={DISC_SIZE}
                height={DISC_SIZE}
                viewBox={`0 0 ${DISC_SIZE} ${DISC_SIZE}`}
                style={StyleSheet.absoluteFill}
              >
                {/* Radial subtle crosshairs */}
                <Line
                  x1={RADIUS * 0.2}
                  y1={RADIUS * 0.2}
                  x2={RADIUS * 1.8}
                  y2={RADIUS * 1.8}
                  stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                  strokeWidth={1}
                />
                <Line
                  x1={RADIUS * 1.8}
                  y1={RADIUS * 0.2}
                  x2={RADIUS * 0.2}
                  y2={RADIUS * 1.8}
                  stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                  strokeWidth={1}
                />

                {/* Concentric Vinyl Grooves */}
                <Circle
                  cx={RADIUS}
                  cy={RADIUS}
                  r={RADIUS * 0.9}
                  fill="none"
                  stroke={isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}
                  strokeWidth={1}
                />
                <Circle
                  cx={RADIUS}
                  cy={RADIUS}
                  r={RADIUS * 0.78}
                  fill="none"
                  stroke={isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}
                  strokeWidth={1}
                />
                <Circle
                  cx={RADIUS}
                  cy={RADIUS}
                  r={RADIUS * 0.65}
                  fill="none"
                  stroke={isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)"}
                  strokeWidth={1}
                />
              </Svg>

              {/* Printed Text on Disc - Top Left Quadrant (Artist) */}
              <View style={styles.artistLabelWrapper}>
                <NothingText
                  variant="dot"
                  size={9.5}
                  numberOfLines={1}
                  style={[styles.discText, { color: isDark ? "#A0A0A0" : "#555555" }]}
                >
                  {artist.toUpperCase()}
                </NothingText>
              </View>

              {/* Printed Text on Disc - Bottom Right Quadrant (Album / Nothing) */}
              <View style={styles.albumLabelWrapper}>
                <NothingText
                  variant="dot"
                  size={9.5}
                  numberOfLines={1}
                  style={[styles.discText, { color: isDark ? "#A0A0A0" : "#555555" }]}
                >
                  {(album || "NOTHING OS").toUpperCase()}
                </NothingText>
              </View>

              {/* Center Vinyl Label with Song Thumbnail Artwork! */}
              <View style={[styles.centerArtHub, { backgroundColor: isDark ? "#0A0A0A" : "#FFFFFF", borderColor: isDark ? "rgba(255, 255, 255, 0.18)" : "rgba(0, 0, 0, 0.15)" }]}>
                <Image
                  source={{ uri: artwork }}
                  style={styles.thumbnailArtwork}
                />
                {/* Vinyl Record Center Label Overlay with Spindle */}
                <View style={[styles.spindleCenter, { backgroundColor: isDark ? "#000000" : "#E0E0E0", borderColor: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.2)" }]}>
                  <View style={[styles.spindleInnerDot, { backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)" }]} />
                </View>
              </View>
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Nothing Red Indicator Dot on Bottom Left */}
        <View style={styles.redDotWrapper}>
          <View style={[styles.redDot, { backgroundColor: colors.red }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 4,
  },
  infoRow: {
    width: DISC_SIZE + 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  timeTagRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  speakerIconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  discOuterWrapper: {
    width: DISC_SIZE + 44,
    height: DISC_SIZE + 44,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  disc: {
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.85,
    shadowRadius: 18,
    elevation: 14,
    borderWidth: 2,
    borderColor: "#242424",
    overflow: "hidden",
    position: "relative",
  },
  artistLabelWrapper: {
    position: "absolute",
    top: "16%",
    left: "14%",
    transform: [{ rotate: "-35deg" }],
    maxWidth: "50%",
  },
  albumLabelWrapper: {
    position: "absolute",
    bottom: "16%",
    right: "14%",
    transform: [{ rotate: "-35deg" }],
    maxWidth: "50%",
  },
  discText: {
    letterSpacing: 1.5,
  },
  centerArtHub: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#0A0A0A",
  },
  thumbnailArtwork: {
    width: "100%",
    height: "100%",
  },
  spindleCenter: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#000000",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  spindleInnerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: NothingColors.red,
  },
  redDotWrapper: {
    position: "absolute",
    bottom: 24,
    left: 14,
  },
  redDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: NothingColors.red,
    shadowColor: NothingColors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
    elevation: 5,
  },
});
