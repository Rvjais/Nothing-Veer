import React from "react";
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePlayerStore } from "../../store/usePlayerStore";
import { NothingColors, NothingFonts, NothingLayout } from "../../constants/theme";
import { NothingText } from "../common/NothingText";
import { GlyphIndicator } from "../common/GlyphIndicator";
import { Track } from "../../types/music";

export interface QueueModalProps {
  visible: boolean;
  onClose: () => void;
}

export const QueueModal: React.FC<QueueModalProps> = ({ visible, onClose }) => {
  const queue = usePlayerStore((s) => s.queue);
  const queueIndex = usePlayerStore((s) => s.queueIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const renderItem = ({ item, index }: { item: Track; index: number }) => {
    const isCurrent = index === queueIndex;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => playTrack(item)}
        style={[styles.itemContainer, isCurrent && styles.activeItem]}
      >
        <Image source={{ uri: item.artwork }} style={styles.itemArtwork} />

        <View style={styles.itemInfo}>
          <NothingText
            numberOfLines={1}
            size={14}
            variant={isCurrent ? "bodyMedium" : "body"}
            color={isCurrent ? "red" : "white"}
          >
            {item.title}
          </NothingText>
          <NothingText numberOfLines={1} size={12} color="grey" style={{ marginTop: 2 }}>
            {item.artist}
          </NothingText>
        </View>

        {isCurrent ? (
          <View style={styles.currentIndicator}>
            <GlyphIndicator isPlaying={isPlaying} size={14} />
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={(e) => {
              e.stopPropagation();
              removeFromQueue(index);
            }}
            style={styles.removeBtn}
          >
            <Ionicons name="close" size={18} color={NothingColors.grey} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          <View style={styles.header}>
            <View>
              <NothingText variant="dot" size={18}>
                PLAYING QUEUE
              </NothingText>
              <NothingText variant="mono" size={11} color="grey" style={{ marginTop: 2 }}>
                {queue.length} TRACKS ENQUEUED
              </NothingText>
            </View>

            <View style={styles.headerActions}>
              {queue.length > 0 && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={clearQueue}
                  style={styles.clearBtn}
                >
                  <NothingText variant="dot" size={11} color="red">
                    CLEAR
                  </NothingText>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={NothingColors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {queue.length === 0 ? (
            <View style={styles.emptyContainer}>
              <NothingText variant="dot" size={14} color="grey">
                QUEUE IS EMPTY
              </NothingText>
            </View>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(item, idx) => `${item.id}-${idx}`}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    height: "75%",
    backgroundColor: NothingColors.surfaceLowest,
    borderTopLeftRadius: NothingLayout.radiusXl,
    borderTopRightRadius: NothingLayout.radiusXl,
    borderWidth: 1,
    borderColor: NothingColors.borderSubtle,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: NothingColors.borderSubtle,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: NothingLayout.radiusPill,
    backgroundColor: NothingColors.surfaceHigh,
  },
  closeBtn: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: NothingLayout.radiusMd,
    marginBottom: 6,
    backgroundColor: NothingColors.surfaceLow,
  },
  activeItem: {
    backgroundColor: NothingColors.surfaceMid,
    borderWidth: 1,
    borderColor: NothingColors.borderActive,
  },
  itemArtwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: NothingColors.surfaceHigh,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currentIndicator: {
    paddingHorizontal: 8,
  },
  removeBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
