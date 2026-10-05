import React, { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NothingLayout } from "../../constants/theme";
import { useLibraryStore } from "../../store/useLibraryStore";
import { useThemeStore } from "../../store/useThemeStore";
import { Track } from "../../types/music";
import { NothingText } from "../common/NothingText";

export interface PlaylistPickerModalProps {
  visible: boolean;
  track: Track;
  onClose: () => void;
}

export const PlaylistPickerModal: React.FC<PlaylistPickerModalProps> = ({
  visible,
  track,
  onClose,
}) => {
  const { colors } = useThemeStore();
  const playlists = useLibraryStore((state) => state.playlists);
  const addToPlaylist = useLibraryStore((state) => state.addToPlaylist);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const [playlistName, setPlaylistName] = useState("");
  const [saving, setSaving] = useState(false);

  const addToExisting = async (playlistId: string) => {
    setSaving(true);
    try {
      await addToPlaylist(playlistId, track);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const createAndAdd = async () => {
    const name = playlistName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const id = await createPlaylist(name);
      await addToPlaylist(id, track);
      setPlaylistName("");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceLowest,
              borderColor: colors.borderSubtle,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.greyDark }]} />
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerCopy}>
              <NothingText variant="dot" size={17}>
                ADD TO PLAYLIST
              </NothingText>
              <NothingText variant="body" size={12} color="grey" numberOfLines={1}>
                {track.title}
              </NothingText>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={23} color={colors.whiteDim} />
            </TouchableOpacity>
          </View>

          <View style={styles.createRow}>
            <TextInput
              value={playlistName}
              onChangeText={setPlaylistName}
              placeholder="New playlist name"
              placeholderTextColor={colors.grey}
              selectionColor={colors.red}
              returnKeyType="done"
              onSubmitEditing={createAndAdd}
              maxLength={48}
              style={[
                styles.input,
                {
                  color: colors.white,
                  backgroundColor: colors.surfaceLow,
                  borderColor: colors.borderSubtle,
                },
              ]}
            />
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={createAndAdd}
              disabled={!playlistName.trim() || saving}
              style={[
                styles.createButton,
                {
                  backgroundColor: playlistName.trim() ? colors.red : colors.surfaceHigh,
                },
              ]}
            >
              <Ionicons
                name="add"
                size={22}
                color={playlistName.trim() ? "#FFFFFF" : colors.grey}
              />
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.playlistList}
            data={playlists}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes-outline" size={26} color={colors.grey} />
                <NothingText variant="body" size={13} color="grey" style={styles.emptyText}>
                  Create a playlist above to save this song.
                </NothingText>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.72}
                onPress={() => addToExisting(item.id)}
                disabled={saving}
                style={[styles.playlistRow, { backgroundColor: colors.surfaceLow }]}
              >
                {item.tracks[0]?.artwork ? (
                  <Image source={{ uri: item.tracks[0].artwork }} style={styles.artwork} />
                ) : (
                  <View style={[styles.artworkPlaceholder, { backgroundColor: colors.surfaceHigh }]}>
                    <Ionicons name="musical-notes" size={19} color={colors.grey} />
                  </View>
                )}
                <View style={styles.playlistCopy}>
                  <NothingText variant="bodyMedium" size={14} numberOfLines={1}>
                    {item.name}
                  </NothingText>
                  <NothingText variant="mono" size={11} color="grey">
                    {item.tracks.length} {item.tracks.length === 1 ? "SONG" : "SONGS"}
                  </NothingText>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={colors.whiteDim} />
              </TouchableOpacity>
            )}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.56)",
  },
  sheet: {
    height: "62%",
    maxHeight: "78%",
    minHeight: "46%",
    borderTopLeftRadius: NothingLayout.radiusXl,
    borderTopRightRadius: NothingLayout.radiusXl,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: 16,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    marginTop: 9,
    marginBottom: 7,
    opacity: 0.65,
  },
  header: {
    minHeight: 62,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerCopy: {
    flex: 1,
    gap: 5,
  },
  closeButton: {
    padding: 6,
    marginLeft: 12,
  },
  createRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: NothingLayout.radiusMd,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  createButton: {
    width: 46,
    height: 46,
    borderRadius: NothingLayout.radiusMd,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  playlistList: {
    flex: 1,
  },
  playlistRow: {
    minHeight: 62,
    padding: 9,
    borderRadius: NothingLayout.radiusMd,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 9,
  },
  artworkPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  playlistCopy: {
    flex: 1,
    marginHorizontal: 12,
    gap: 3,
  },
  emptyState: {
    flex: 1,
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 10,
  },
});
