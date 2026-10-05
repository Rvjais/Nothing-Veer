import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { YouTubeService } from "../services/youtube";
import { Track } from "../types/music";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useThemeStore } from "../store/useThemeStore";
import * as Haptics from "expo-haptics";
import { NothingColors, NothingLayout } from "../constants/theme";
import { NothingText } from "../components/common/NothingText";
import { NothingSearchBar } from "../components/common/NothingSearchBar";
import { GlyphIndicator } from "../components/common/GlyphIndicator";

const TRENDING_KEYWORDS = [
  "Starboy",
  "Blinding Lights",
  "Coldplay",
  "Taylor Swift",
  "Billie Eilish",
  "Dua Lipa",
  "Post Malone",
  "Travis Scott",
  "Synthwave",
];

export interface SearchScreenProps {
  onBack?: () => void;
  onTrackSelect?: (track: Track) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onBack,
  onTrackSelect,
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filterType, setFilterType] = useState<"songs" | "albums" | "artists">("songs");
  const [activeCollection, setActiveCollection] = useState<{ title: string; type: string; id: string; artwork: string } | null>(null);
  const [collectionTracks, setCollectionTracks] = useState<Track[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const isFavorite = useLibraryStore((s) => s.isFavorite);
  const isDownloaded = useLibraryStore((s) => s.isDownloaded);
  const downloadTrack = useLibraryStore((s) => s.downloadTrack);
  const activeDownloads = useLibraryStore((s) => s.activeDownloads);
  const { colors, isDark } = useThemeStore();

  useEffect(() => {
    if (!query.trim() || searched) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void YouTubeService.getSearchSuggestions(query)
        .then((list) => {
          if (!cancelled) setSuggestions(list);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searched]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setQuery(searchTerm);
    setSuggestions([]);
    setSearched(true);
    setLoading(true);

    try {
      const tracks = await YouTubeService.search(searchTerm, filterType);
      setResults(tracks);
    } catch (error) {
      Alert.alert(
        "Search failed",
        error instanceof Error ? error.message : "Could not search Global Catalog."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTrackPress = async (track: Track) => {
    if (track.contentType === "album" || track.contentType === "artist") {
      setActiveCollection({ title: track.title, type: track.contentType, id: track.id, artwork: track.artwork });
      setLoadingCollection(true);
      try {
        const tracks = await YouTubeService.search(track.title + " " + track.artist, "songs");
        setCollectionTracks(tracks);
      } catch (e) {}
      setLoadingCollection(false);
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    playTrack(track, results);
    onTrackSelect?.(track);
  };

  const handleDownloadPress = async (track: Track) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    try {
      await downloadTrack(track);
    } catch (error) {
      Alert.alert(
        "Download failed",
        error instanceof Error ? error.message : "Could not save this track."
      );
    }
  };

  const renderTrackItem = ({ item }: { item: Track }) => {
    const isCurrent = currentTrack?.id === item.id;
    const favorite = isFavorite(item.id);
    const downloaded = isDownloaded(item.id);
    const downloading = activeDownloads[item.id] !== undefined;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleTrackPress(item)}
        style={[
          styles.trackRow,
          {
            backgroundColor: colors.surfaceLow,
            borderColor: colors.borderSubtle,
            borderBottomColor: colors.borderSubtle,
          },
          isCurrent && { backgroundColor: isDark ? "rgba(215, 25, 33, 0.12)" : "rgba(215, 25, 33, 0.08)" },
        ]}
      >
        <Image source={{ uri: item.artwork }} style={[styles.trackThumb, { backgroundColor: colors.surfaceHigh }]} />

        <View style={styles.trackDetails}>
          <NothingText
            numberOfLines={1}
            size={14}
            variant={isCurrent ? "bodyMedium" : "body"}
            color={isCurrent ? "red" : "white"}
            style={{ color: isCurrent ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
          >
            {item.title}
          </NothingText>
          <NothingText
            numberOfLines={1}
            size={12}
            color="grey"
            style={{ marginTop: 2, color: colors.grey }}
          >
            {item.artist} {item.album ? `• ${item.album}` : ""}
          </NothingText>
        </View>

        {isCurrent && (
          <View style={styles.glyphWrapper}>
            <GlyphIndicator isPlaying={isPlaying} size={14} />
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleDownloadPress(item)}
          style={styles.actionBtn}
          disabled={downloading || downloaded}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={colors.red} />
          ) : (
            <Ionicons
              name={downloaded ? "cloud-done" : "download-outline"}
              size={18}
              color={downloaded ? colors.red : colors.grey}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleFavorite(item)}
          style={styles.actionBtn}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={20}
            color={favorite ? colors.red : colors.grey}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (activeCollection) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => setActiveCollection(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : "#111111"} />
          </TouchableOpacity>
          <NothingText variant="dot" size={16} color="white" numberOfLines={1} style={{ flex: 1, color: isDark ? "#FFFFFF" : "#111111" }}>
            {activeCollection.title.toUpperCase()}
          </NothingText>
        </View>

        <View style={{ flexDirection: "row", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
          <Image source={{ uri: activeCollection.artwork }} style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: colors.surfaceHigh }} />
          <View style={{ flex: 1, marginLeft: 16, justifyContent: "center" }}>
            <NothingText variant="dot" size={14} color="dim">{activeCollection.type.toUpperCase()}</NothingText>
            <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
              <TouchableOpacity onPress={() => {
                const lib = useLibraryStore.getState();
                lib.createPlaylist(activeCollection.title).then(p => {
                  collectionTracks.forEach(t => lib.addToPlaylist(p, t));
                  Alert.alert("Saved", "Added to your Library Playlists.");
                });
              }} style={{ backgroundColor: colors.red, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                <NothingText size={10} color="white">SAVE</NothingText>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                const lib = useLibraryStore.getState();
                collectionTracks.forEach(t => lib.downloadTrack(t));
                Alert.alert("Downloading", "Album tracks are downloading.");
              }} style={{ borderColor: colors.borderSubtle, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 }}>
                <NothingText size={10} color="dim">DOWNLOAD ALL</NothingText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {loadingCollection ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={colors.red} />
          </View>
        ) : (
          <FlatList
            data={collectionTracks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isCurrent = currentTrack?.id === item.id;
              const downloaded = isDownloaded(item.id);
              const downloading = activeDownloads[item.id] !== undefined;
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    usePlayerStore.getState().playTrack(item, collectionTracks);
                    onTrackSelect?.(item);
                  }}
                  style={[styles.trackRow, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle, borderBottomColor: colors.borderSubtle, marginHorizontal: 16 }, isCurrent && { backgroundColor: isDark ? "rgba(215, 25, 33, 0.12)" : "rgba(215, 25, 33, 0.08)" }]}
                >
                  <View style={styles.trackDetails}>
                    <NothingText numberOfLines={1} size={14} variant={isCurrent ? "bodyMedium" : "body"} style={{ color: isCurrent ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}>{item.title}</NothingText>
                    <NothingText numberOfLines={1} size={12} color="grey" style={{ marginTop: 2, color: colors.grey }}>{item.artist}</NothingText>
                  </View>
                  {isCurrent && <View style={styles.glyphWrapper}><GlyphIndicator isPlaying={isPlaying} size={14} /></View>}
                  <TouchableOpacity activeOpacity={0.7} onPress={() => downloadTrack(item)} style={styles.actionBtn} disabled={downloading || downloaded}>
                    {downloading ? <ActivityIndicator size="small" color={colors.red} /> : <Ionicons name={downloaded ? "cloud-done" : "download-outline"} size={18} color={downloaded ? colors.red : colors.grey} />}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : "#111111"} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <NothingSearchBar
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setSearched(false);
            }}
            onClear={() => {
              setResults([]);
              setSearched(false);
            }}
            onSubmit={() => performSearch(query)}
            autoFocus={false}
          />
        </View>
      </View>

      {suggestions.length > 0 && !searched && (
        <View
          style={[
            styles.suggestionsContainer,
            { backgroundColor: colors.surfaceLowest, borderBottomColor: colors.borderSubtle },
          ]}
        >
          {suggestions.map((sug, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => performSearch(sug)}
              style={styles.suggestionRow}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.grey}
                style={{ marginRight: 12 }}
              />
              <NothingText size={14} color="dim">
                {sug}
              </NothingText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={colors.red} />
          <NothingText
            variant="dot"
            size={12}
            color="grey"
            style={{ marginTop: 12 }}
          >
            SEARCHING Global Catalog...
          </NothingText>
        </View>
      ) : searched ? (
        results.length === 0 ? (
          <View style={styles.centerContainer}>
            <NothingText variant="dot" size={14} color="grey">
              NO RESULTS FOUND
            </NothingText>
            <NothingText size={12} color="muted" style={{ marginTop: 6 }}>
              Try searching with a different artist or song name
            </NothingText>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", paddingHorizontal: 20, marginBottom: 12, gap: 10 }}>
              {["songs", "albums", "artists"].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => {
                    setFilterType(type as any);
                    if (query.trim()) {
                      setLoading(true);
                      YouTubeService.search(query, type as any).then(res => {
                        setResults(res);
                        setLoading(false);
                      });
                    }
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: filterType === type ? colors.red : colors.borderSubtle,
                    backgroundColor: filterType === type ? (isDark ? "rgba(215, 25, 33, 0.1)" : "rgba(215, 25, 33, 0.05)") : "transparent"
                  }}
                >
                  <NothingText size={12} color={filterType === type ? "red" : "dim"}>
                    {type.toUpperCase()}
                  </NothingText>
                </TouchableOpacity>
              ))}
            </View>
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderTrackItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )
      ) : (
        <ScrollView
          style={styles.trendingContainer}
          contentContainerStyle={{ paddingBottom: 180 }}
        >
          <NothingText variant="dot" size={14} color="grey" style={styles.trendingTitle}>
            TRENDING SEARCHES
          </NothingText>

          <View style={styles.tagsGrid}>
            {TRENDING_KEYWORDS.map((keyword, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.75}
                onPress={() => performSearch(keyword)}
                style={[
                  styles.keywordTag,
                  { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle },
                ]}
              >
                <NothingText variant="bodyMedium" size={13} color="dim">
                  {keyword}
                </NothingText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NothingColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
  },
  suggestionsContainer: {
    backgroundColor: NothingColors.surfaceLowest,
    borderBottomWidth: 1,
    borderBottomColor: NothingColors.borderSubtle,
    paddingVertical: 8,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 180,
  },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: NothingLayout.radiusMd,
    marginBottom: 6,
    backgroundColor: NothingColors.surfaceLow,
  },
  activeTrackRow: {
    backgroundColor: NothingColors.surfaceMid,
    borderWidth: 1,
    borderColor: NothingColors.borderActive,
  },
  trackThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: NothingColors.surfaceHigh,
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  glyphWrapper: {
    paddingHorizontal: 8,
  },
  actionBtn: {
    padding: 8,
  },
  trendingContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  trendingTitle: {
    marginBottom: 14,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  keywordTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: NothingLayout.radiusPill,
    backgroundColor: NothingColors.surfaceLow,
    borderWidth: 1,
    borderColor: NothingColors.borderSubtle,
  },
});




