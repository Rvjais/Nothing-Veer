import React, { useEffect, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useThemeStore } from "../../store/useThemeStore";
import { NothingLayout } from "../../constants/theme";
import { NothingText } from "../common/NothingText";

export interface MiniPlayerProps {
  onPress: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const positionMillis = usePlayerStore((s) => s.positionMillis);
  const durationMillis = usePlayerStore((s) => s.durationMillis);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const playNext = usePlayerStore((s) => s.playNext);
  const { colors, isDark } = useThemeStore();

  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (isPlaying) {
      anim = Animated.loop(
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      anim.start();
    } else {
      rotationAnim.stopAnimation();
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [isPlaying, rotationAnim]);

  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!currentTrack) return null;

  const progressPercent =
    durationMillis > 0
      ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100))
      : 0;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "rgba(22, 22, 24, 0.78)" : "rgba(245, 245, 248, 0.88)",
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <BlurView
          intensity={65}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />

        <Animated.View
          style={[styles.vinylWrapper, { transform: [{ rotate: spin }] }]}
        >
          <Image
            source={{ uri: currentTrack.artwork }}
            style={styles.artwork}
          />
          <View style={styles.centerHole}>
            <View
              style={[
                styles.centerDot,
                { backgroundColor: colors.red },
              ]}
            />
          </View>
        </Animated.View>

        <View style={styles.infoWrapper}>
          <NothingText
            numberOfLines={1}
            size={14}
            variant="bodyMedium"
            color="white"
            style={{ color: isDark ? "#FFFFFF" : "#111111" }}
          >
            {currentTrack.title}
          </NothingText>
          <NothingText
            numberOfLines={1}
            size={12}
            color="grey"
            style={{ marginTop: 2, color: colors.grey }}
          >
            {currentTrack.artist}
          </NothingText>
        </View>

        <View style={styles.controlsWrapper}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
            style={styles.playBtn}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={22}
              color={isDark ? "#FFFFFF" : "#111111"}
              style={!isPlaying ? { marginLeft: 2 } : null}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              playNext();
            }}
            style={styles.nextBtn}
          >
            <Ionicons
              name="play-skip-forward"
              size={20}
              color={colors.grey}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceHigh }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%`, backgroundColor: colors.red },
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  container: {
    height: 64,
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1.2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  vinylWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111",
    borderWidth: 1.5,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  centerHole: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#000",
    borderWidth: 1.5,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
  },
  centerDot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 1.75,
  },
  infoWrapper: {
    flex: 1,
    marginHorizontal: 12,
    justifyContent: "center",
  },
  controlsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  playBtn: {
    padding: 8,
  },
  nextBtn: {
    padding: 8,
  },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 2.2,
    borderRadius: 1.1,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
});
