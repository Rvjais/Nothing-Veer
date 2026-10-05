import React from "react";
import {
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NothingLayout } from "../../constants/theme";
import { useThemeStore } from "../../store/useThemeStore";
import { Track } from "../../types/music";
import { NothingText } from "../common/NothingText";

export interface SongInfoModalProps {
  visible: boolean;
  track: Track;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "Unknown";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export const SongInfoModal: React.FC<SongInfoModalProps> = ({
  visible,
  track,
  onClose,
}) => {
  const { colors } = useThemeStore();

  const shareTrack = async () => {
    try {
      await Share.share({
        message: `${track.title} - ${track.artist}\nhttps://music.youtube.com/watch?v=${track.id}`,
      });
    } catch {}
  };

  const infoRows = [
    { label: "ARTIST", value: track.artist },
    { label: "ALBUM", value: track.album || "Single / album not listed" },
    { label: "DURATION", value: formatDuration(track.duration) },
    { label: "SOURCE", value: "Global Catalog" },
    { label: "VIDEO ID", value: track.id },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surfaceLowest,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={styles.header}>
            <NothingText variant="dot" size={15} color="dim">
              TRACK DETAILS
            </NothingText>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close" size={22} color={colors.whiteDim} />
            </TouchableOpacity>
          </View>

          <Image source={{ uri: track.artwork }} style={styles.artwork} />
          <NothingText
            variant="headline"
            size={21}
            numberOfLines={3}
            style={styles.title}
          >
            {track.title}
          </NothingText>

          <View style={[styles.details, { borderTopColor: colors.borderSubtle }]}>
            {infoRows.map((row) => (
              <View key={row.label} style={styles.detailRow}>
                <NothingText variant="mono" size={10} color="grey" style={styles.label}>
                  {row.label}
                </NothingText>
                <NothingText
                  variant="body"
                  size={13}
                  numberOfLines={2}
                  style={styles.value}
                >
                  {row.value}
                </NothingText>
              </View>
            ))}
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={shareTrack}
            style={[
              styles.shareButton,
              {
                backgroundColor: colors.glassBackground,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <Ionicons name="share-outline" size={18} color={colors.whiteDim} />
            <NothingText variant="dot" size={11} color="white">
              SHARE TRACK
            </NothingText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "90%",
    borderWidth: 1,
    borderRadius: NothingLayout.radiusXl,
    paddingHorizontal: 22,
    paddingBottom: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  header: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    padding: 6,
  },
  artwork: {
    width: 142,
    height: 142,
    borderRadius: 20,
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "#777777",
  },
  title: {
    textAlign: "center",
    marginBottom: 17,
  },
  details: {
    width: "100%",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  detailRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  label: {
    width: 82,
    letterSpacing: 0.9,
  },
  value: {
    flex: 1,
  },
  shareButton: {
    minHeight: 44,
    alignSelf: "stretch",
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
});

