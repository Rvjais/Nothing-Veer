import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Track } from "../types/music";
import { useLibraryStore } from "../store/useLibraryStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useThemeStore } from "../store/useThemeStore";
import { NothingLayout } from "../constants/theme";
import { NothingText } from "../components/common/NothingText";
import { NothingCard } from "../components/common/NothingCard";
import { NothingButton } from "../components/common/NothingButton";
import { GlyphIndicator } from "../components/common/GlyphIndicator";
import { DownloadManager } from "../services/downloadManager";

export interface DownloadsScreenProps {
  onOpenNowPlaying?: () => void;
}

type TabType = "favorites" | "recents" | "playlists" | "downloads";

export const DownloadsScreen: React.FC<DownloadsScreenProps> = ({
  onOpenNowPlaying,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("downloads");
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [totalStorageUsed, setTotalStorageUsed] = useState<number>(0);

  const { colors, isDark } = useThemeStore();

  const favorites = useLibraryStore((s) => s.favorites);
  const recents = useLibraryStore((s) => s.recents);
  const playlists = useLibraryStore((s) => s.playlists);
  const downloadedTracks = useLibraryStore((s) => s.downloadedTracks);
  const activeDownloads = useLibraryStore((s) => s.activeDownloads);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const isFavorite = useLibraryStore((s) => s.isFavorite);
  const clearRecents = useLibraryStore((s) => s.clearRecents);
  const createPlaylist = useLibraryStore((s) => s.createPlaylist);
  const deletePlaylist = useLibraryStore((s) => s.deletePlaylist);
  const removeFromPlaylist = useLibraryStore((s) => s.removeFromPlaylist);
  const removeDownload = useLibraryStore((s) => s.removeDownload);
  const clearAllDownloads = useLibraryStore((s) => s.clearAllDownloads);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);

  useEffect(() => {
    if (activeTab === "downloads") {
      DownloadManager.getStorageUsedBytes().then(setTotalStorageUsed);
    }
  }, [activeTab, downloadedTracks]);

  const handlePlayTrack = async (track: Track, trackList: Track[]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await playTrack(track, trackList);
    onOpenNowPlaying?.();
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      await createPlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setCreateModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    Alert.alert(
      "DELETE PLAYLIST",
      `Are you sure you want to remove "${name}"?`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE",
          style: "destructive",
          onPress: async () => {
            await deletePlaylist(id);
            if (selectedPlaylistId === id) setSelectedPlaylistId(null);
          },
        },
      ]
    );
  };

  const handleDeleteDownload = (track: Track) => {
    Alert.alert(
      "DELETE DOWNLOAD",
      `Remove "${track.title}" from offline storage?`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "REMOVE",
          style: "destructive",
          onPress: async () => {
            await removeDownload(track.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleClearAllDownloads = () => {
    Alert.alert(
      "CLEAR ALL DOWNLOADS",
      `Delete all ${downloadedTracks.length} offline tracks from your device?`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "CLEAR ALL",
          style: "destructive",
          onPress: async () => {
            await clearAllDownloads();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const activePlaylist = playlists.find((p) => p.id === selectedPlaylistId);

  const renderTrackItem = ({
    item,
    index,
    trackList,
    isOfflineList = false,
  }: {
    item: Track;
    index: number;
    trackList: Track[];
    isOfflineList?: boolean;
  }) => {
    const isCurrent = currentTrack?.id === item.id;
    const fav = isFavorite(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handlePlayTrack(item, trackList)}
        style={[
          styles.trackItem,
          { borderBottomColor: colors.borderSubtle },
          isCurrent && {
            backgroundColor: isDark ? "rgba(215, 25, 33, 0.12)" : "rgba(215, 25, 33, 0.08)",
          },
        ]}
      >
        <NothingText variant="mono" color="dim" size={11} style={styles.indexNumber}>
          {String(index + 1).padStart(2, "0")}
        </NothingText>

        <Image
          source={{ uri: item.artwork || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300" }}
          style={styles.trackThumb}
        />

        <View style={styles.trackInfo}>
          <NothingText
            variant="bodyMedium"
            numberOfLines={1}
            color={isCurrent ? "red" : "white"}
            style={[styles.trackTitle, { color: isCurrent ? colors.red : (isDark ? "#FFFFFF" : "#111111") }]}
          >
            {item.title}
          </NothingText>
          <View style={styles.artistMetaRow}>
            {isOfflineList && (
              <View style={[styles.offlineTag, { borderColor: colors.red }]}>
                <Ionicons name="cloud-done-outline" size={10} color={colors.red} />
                <NothingText variant="mono" size={9} color="red" style={{ marginLeft: 3 }}>
                  {item.fileSize ? DownloadManager.formatBytes(item.fileSize) : "OFFLINE"}
                </NothingText>
              </View>
            )}
            <NothingText variant="body" color="dim" size={12} numberOfLines={1} style={{ flex: 1 }}>
              {item.artist}
            </NothingText>
          </View>
        </View>

        {isCurrent && isPlaying ? (
          <GlyphIndicator isPlaying={isPlaying} size={14} />
        ) : null}

        {isOfflineList ? (
          <TouchableOpacity
            onPress={() => handleDeleteDownload(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={17} color={colors.grey} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => toggleFavorite(item)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.heartButton}
          >
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={18}
              color={fav ? colors.red : colors.grey}
            />
          </TouchableOpacity>
        )}

        {selectedPlaylistId && !isOfflineList && (
          <TouchableOpacity
            onPress={() => removeFromPlaylist(selectedPlaylistId, item.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.removeButton}
          >
            <Ionicons name="trash-outline" size={16} color={colors.grey} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (message: string, sub: string) => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyDotGrid, { borderColor: colors.borderSubtle }]}>
        <NothingText variant="dot" color="dim" size={24} style={styles.emptyGlyph}>
          ::
        </NothingText>
      </View>
      <NothingText variant="dot" size={16} style={[styles.emptyTitle, { color: isDark ? "#FFFFFF" : "#111111" }]}>
        {message}
      </NothingText>
      <NothingText variant="mono" color="dim" size={12} style={styles.emptySubtitle}>
        {sub}
      </NothingText>
    </View>
  );

  const activeDownloadCount = Object.keys(activeDownloads).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <NothingText variant="dot" size={26} color="white" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
            LIBRARY
          </NothingText>
          <NothingText variant="mono" color="dim" size={11} style={styles.headerSub}>
            OFFLINE SONGS & SAVED MIXES
          </NothingText>
        </View>

        {activeTab === "recents" && recents.length > 0 && (
          <NothingButton
            title="CLEAR"
            variant="outline"
            size="sm"
            onPress={clearRecents}
          />
        )}

        {activeTab === "playlists" && (
          <NothingButton
            title="+ NEW"
            variant="primary"
            size="sm"
            onPress={() => setCreateModalVisible(true)}
          />
        )}

        {activeTab === "downloads" && downloadedTracks.length > 0 && (
          <NothingButton
            title="PURGE"
            variant="outline"
            size="sm"
            onPress={handleClearAllDownloads}
          />
        )}
      </View>

      {activeDownloadCount > 0 && (
          <View style={[styles.downloadNotice, { backgroundColor: colors.surfaceMid, borderColor: colors.red }]}>
            <Ionicons name="arrow-down-circle" size={16} color={colors.red} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <NothingText variant="dot" size={11} color="red">
                DOWNLOADING {activeDownloadCount} FILE{activeDownloadCount > 1 ? "S" : ""}
              </NothingText>
              {Object.values(activeDownloads).slice(0, 1).map((d, i) => (
                <NothingText key={i} size={10} color="red" style={{ marginTop: 2 }}>
                  {Math.round(d.progress * 100)}% {d.totalBytes > 0 ? `� ${DownloadManager.formatBytes(d.totalBytes)}` : ""}
                </NothingText>
              ))}
            </View>
          </View>
        )}

        {/* Main Content Area */}
      <View style={styles.content}>
        {/* DOWNLOADS TAB */}
        {activeTab === "downloads" && (
          <View style={{ flex: 1 }}>
            {downloadedTracks.length > 0 && (
              <View style={[styles.storageBanner, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}>
                <View style={styles.storageIconBox}>
                  <Ionicons name="folder-outline" size={16} color={colors.red} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <NothingText variant="dot" size={11} color="dim">
                    DEVICE STORAGE
                  </NothingText>
                  <NothingText variant="mono" size={12} color="white" style={{ color: isDark ? "#FFFFFF" : "#111111", marginTop: 2 }}>
                    {DownloadManager.formatBytes(totalStorageUsed)} USED • {downloadedTracks.length} SONGS OFFLINE
                  </NothingText>
                </View>
              </View>
            )}

            <FlatList
              data={downloadedTracks}
              keyExtractor={(item) => `dl-${item.id}`}
              renderItem={({ item, index }) =>
                renderTrackItem({
                  item,
                  index,
                  trackList: downloadedTracks,
                  isOfflineList: true,
                })
              }
              ListEmptyComponent={() =>
                renderEmptyState(
                  "NO DOWNLOADED SONGS",
                  "TAP THE DOWNLOAD BUTTON ON ANY SONG TO PLAY OFFLINE WITHOUT INTERNET"
                )
              }
              contentContainerStyle={styles.listContent}
            />
          </View>
        )}

        {/* FAVORITES TAB */}
        {activeTab === "favorites" && (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              renderTrackItem({ item, index, trackList: favorites })
            }
            ListEmptyComponent={() =>
              renderEmptyState("NO FAVORITES YET", "TAP THE HEART ICON TO SAVE TRACKS")
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* RECENTS TAB */}
        {activeTab === "recents" && (
          <FlatList
            data={recents}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) =>
              renderTrackItem({ item, index, trackList: recents })
            }
            ListEmptyComponent={() =>
              renderEmptyState("NO RECENT TRACKS", "PLAY SONGS FROM SEARCH OR HOME")
            }
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* PLAYLISTS TAB */}
        {activeTab === "playlists" && (
          <>
            {selectedPlaylistId && activePlaylist ? (
              <View style={styles.playlistDetailContainer}>
                <TouchableOpacity
                  style={styles.playlistBackRow}
                  onPress={() => setSelectedPlaylistId(null)}
                >
                  <Ionicons name="chevron-back" size={20} color={isDark ? "#FFFFFF" : "#111111"} />
                  <NothingText variant="dot" size={14} style={{ marginLeft: 6, color: isDark ? "#FFFFFF" : "#111111" }}>
                    {activePlaylist.name.toUpperCase()}
                  </NothingText>
                </TouchableOpacity>

                <FlatList
                  data={activePlaylist.tracks}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item, index }) =>
                    renderTrackItem({
                      item,
                      index,
                      trackList: activePlaylist.tracks,
                    })
                  }
                  ListEmptyComponent={() =>
                    renderEmptyState("EMPTY PLAYLIST", "ADD TRACKS FROM SEARCH RESULTS")
                  }
                  contentContainerStyle={styles.listContent}
                />
              </View>
            ) : (
              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <NothingCard
                    style={styles.playlistCard}
                    onPress={() => setSelectedPlaylistId(item.id)}
                  >
                    <View style={styles.playlistRow}>
                      <View style={[styles.playlistIconBox, { backgroundColor: colors.surfaceMid }]}>
                        <NothingText variant="dot" color="red" size={18}>
                          ♫
                        </NothingText>
                      </View>
                      <View style={styles.playlistInfo}>
                        <NothingText variant="headline" size={18} color="white" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
                          {item.name}
                        </NothingText>
                        <NothingText variant="mono" color="dim" size={12}>
                          {item.tracks.length} TRACK{item.tracks.length !== 1 ? "S" : ""}
                        </NothingText>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeletePlaylist(item.id, item.name)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.grey} />
                      </TouchableOpacity>
                    </View>
                  </NothingCard>
                )}
                ListEmptyComponent={() =>
                  renderEmptyState("NO PLAYLISTS FOUND", "TAP + NEW TO CREATE YOUR FIRST MIX")
                }
                contentContainerStyle={styles.listContent}
              />
            )}
          </>
        )}
      </View>

      {/* Create Playlist Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <NothingCard style={styles.modalCard} bordered accent>
            <NothingText variant="dot" size={18} style={styles.modalTitle} color="white">
              CREATE PLAYLIST
            </NothingText>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.surfaceLow,
                  borderColor: colors.borderSubtle,
                  color: isDark ? "#FFFFFF" : "#111111",
                },
              ]}
              placeholder="PLAYLIST NAME"
              placeholderTextColor={colors.grey}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />

            <View style={styles.modalButtonsRow}>
              <NothingButton
                title="CANCEL"
                variant="outline"
                size="sm"
                onPress={() => {
                  setNewPlaylistName("");
                  setCreateModalVisible(false);
                }}
              />
              <View style={{ width: 12 }} />
              <NothingButton
                title="CREATE"
                variant="primary"
                size="sm"
                onPress={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
              />
            </View>
          </NothingCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: NothingLayout.screenPadding,
    marginBottom: 12,
  },
  headerSub: {
    marginTop: 2,
    letterSpacing: 1.5,
  },
  tabsRow: {
    paddingHorizontal: NothingLayout.screenPadding,
    gap: 8,
    alignItems: "center",
  },
  tabChip: {
    paddingHorizontal: 16,
    height: 38,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1,
  },
  downloadTabRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  downloadNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: NothingLayout.screenPadding,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: NothingLayout.radiusMd,
    borderWidth: 1,
  },
  storageBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: NothingLayout.screenPadding,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: NothingLayout.radiusMd,
    borderWidth: 1,
  },
  storageIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: NothingLayout.screenPadding,
    paddingBottom: 180,
  },
  trackItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  indexNumber: {
    width: 24,
    textAlign: "center",
    marginRight: 8,
  },
  trackThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  artistMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  offlineTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.8,
  },
  heartButton: {
    padding: 8,
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyDotGrid: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyGlyph: {
    letterSpacing: 2,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 18,
  },
  playlistCard: {
    marginBottom: 10,
    padding: 14,
  },
  playlistRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  playlistIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistDetailContainer: {
    flex: 1,
  },
  playlistBackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: NothingLayout.screenPadding,
    paddingVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    padding: 20,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: NothingLayout.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "GeistMono-Regular",
    marginBottom: 20,
  },
  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});



