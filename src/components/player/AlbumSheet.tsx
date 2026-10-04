import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Animated,
  ActivityIndicator,
  Easing,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Track } from "../../types/music";
import { YouTubeService } from "../../services/youtube";
import { usePlayerStore } from "../../store/usePlayerStore";
import { useThemeStore } from "../../store/useThemeStore";
import { NothingText } from "../common/NothingText";
import { GlyphIndicator } from "../common/GlyphIndicator";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AlbumSheetProps {
  visible: boolean;
  browseId: string;
  albumName: string;
  albumArtist: string;
  albumArtwork: string;
  onClose: () => void;
}

export const AlbumSheet: React.FC<AlbumSheetProps> = ({
  visible,
  browseId,
  albumName,
  albumArtist,
  albumArtwork,
  onClose,
}) => {
  const { colors, isDark } = useThemeStore();
  const playTrack = usePlayerStore((s) => s.playTrack);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [albumTitle, setAlbumTitle] = useState(albumName);
  const [albumArt, setAlbumArt] = useState(albumArtwork);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setLoading(true);
      setTracks([]);
      YouTubeService.getAlbumTracks(browseId)
        .then((res) => {
          setAlbumTitle(res.title || albumName);
          setAlbumArt(res.artwork || albumArtwork);
          setTracks(res.tracks);
        })
        .finally(() => setLoading(false));

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, browseId]);

  const handleTrackPress = (track: Track, index: number) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    playTrack(track, tracks);
    onClose();
  };

  const renderTrack = ({ item, index }: { item: Track; index: number }) => {
    const isCurrent = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleTrackPress(item, index)}
        style={[
          styles.trackRow,
          { borderBottomColor: colors.borderSubtle },
          isCurrent && { backgroundColor: isDark ? "rgba(215,25,33,0.1)" : "rgba(215,25,33,0.06)" },
        ]}
      >
        {/* Track Number or Playing Indicator */}
        <View style={styles.trackNumWrapper}>
          {isCurrent ? (
            <GlyphIndicator isPlaying={isPlaying} size={12} />
          ) : (
            <NothingText variant="dot" size={11} style={{ color: colors.grey }}>
              {String(index + 1).padStart(2, "0")}
            </NothingText>
          )}
        </View>

        <View style={styles.trackInfo}>
          <NothingText
            numberOfLines={1}
            size={14}
            variant={isCurrent ? "bodyMedium" : "body"}
            style={{ color: isCurrent ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
          >
            {item.title}
          </NothingText>
          {item.artist && item.artist !== albumArtist && (
            <NothingText numberOfLines={1} size={12} style={{ color: colors.grey, marginTop: 2 }}>
              {item.artist}
            </NothingText>
          )}
        </View>

        {item.duration > 0 && (
          <NothingText variant="dot" size={10} style={{ color: colors.grey, marginRight: 4 }}>
            {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, "0")}
          </NothingText>
        )}

        <Ionicons name="play-circle-outline" size={22} color={isCurrent ? colors.red : colors.grey} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.surfaceLowest, transform: [{ translateY }] },
        ]}
      >
        {/* Drag Handle */}
        <View style={[styles.dragHandle, { backgroundColor: colors.borderLight }]} />

        {/* Album Header */}
        <View style={styles.albumHeader}>
          <Image
            source={{ uri: albumArt || albumArtwork }}
            style={[styles.albumArt, { backgroundColor: colors.surfaceHigh }]}
          />
          <View style={styles.albumMeta}>
            <NothingText variant="h3" numberOfLines={2} style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
              {albumTitle}
            </NothingText>
            <NothingText size={13} style={{ color: colors.grey, marginTop: 4 }}>
              {albumArtist}
            </NothingText>
            {tracks.length > 0 && (
              <NothingText variant="dot" size={10} style={{ color: colors.red, marginTop: 6 }}>
                {tracks.length} TRACKS
              </NothingText>
            )}
          </View>

          {/* Play All button */}
          {tracks.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
                playTrack(tracks[0], tracks);
                onClose();
              }}
              style={[styles.playAllBtn, { backgroundColor: colors.red }]}
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        {/* Track List */}
        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="small" color={colors.red} />
            <NothingText variant="dot" size={11} style={{ color: colors.grey, marginTop: 12 }}>
              LOADING ALBUM...
            </NothingText>
          </View>
        ) : tracks.length === 0 ? (
          <View style={styles.loadingWrapper}>
            <NothingText variant="dot" size={12} style={{ color: colors.grey }}>
              NO TRACKS FOUND
            </NothingText>
          </View>
        ) : (
          <FlatList
            data={tracks}
            keyExtractor={(t) => t.id}
            renderItem={renderTrack}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.72,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },
  dragHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: 12,
    marginBottom: 8,
  },
  albumHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  albumArt: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  albumMeta: {
    flex: 1,
  },
  playAllBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  trackNumWrapper: {
    width: 28,
    alignItems: "center",
  },
  trackInfo: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  loadingWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
});
