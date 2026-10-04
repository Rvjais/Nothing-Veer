import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { YouTubeService } from "../services/youtube";
import { Track } from "../types/music";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useThemeStore } from "../store/useThemeStore";
import * as Haptics from "expo-haptics";
import { NothingColors, NothingFonts, NothingLayout } from "../constants/theme";
import { NothingText } from "../components/common/NothingText";
import { NothingSearchBar } from "../components/common/NothingSearchBar";
import { GlyphIndicator } from "../components/common/GlyphIndicator";
import { AlbumSheet } from "../components/player/AlbumSheet";

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

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const isFavorite = useLibraryStore((s) => s.isFavorite);
  const isDownloaded = useLibraryStore((s) => s.isDownloaded);
  const downloadTrack = useLibraryStore((s) => s.downloadTrack);
  const activeDownloads = useLibraryStore((s) => s.activeDownloads);
  const { colors, isDark } = useThemeStore();

  const [searchFilter, setSearchFilter] = useState<"songs" | "albums" | "artists" | "playlists">("songs");
  const [albumSheet, setAlbumSheet] = useState<{
    visible: boolean;
    browseId: string;
    albumName: string;
    albumArtist: string;
    albumArtwork: string;
  }>({ visible: false, browseId: "", albumName: "", albumArtist: "", albumArtwork: "" });

  useEffect(() => {
    if (!query.trim() || searched) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      const list = await YouTubeService.getSearchSuggestions(query);
      setSuggestions(list);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, searched]);

  const performSearch = async (searchTerm: string, filterStr = searchFilter) => {
    if (!searchTerm.trim()) return;
    setQuery(searchTerm);
    setSuggestions([]);
    setSearched(true);
    setLoading(true);

    try {
      const tracks = await YouTubeService.search(searchTerm, filterStr);
      setResults(tracks);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSelect = (newFilter: typeof searchFilter) => {
    try { Haptics.selectionAsync(); } catch {}
    setSearchFilter(newFilter);
    if (query.trim()) {
      performSearch(query, newFilter);
    }
  };

  const handleTrackPress = (track: Track) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    // For albums — the "id" is actually the browseId; open AlbumSheet
    if (searchFilter === "albums") {
      setAlbumSheet({
        visible: true,
        browseId: track.id,
        albumName: track.title,
        albumArtist: track.artist,
        albumArtwork: track.artwork,
      });
      return;
    }

    // For artists — could open an artist page in future; for now play by name search
    if (searchFilter === "artists") {
      // treat the press as searching by artist name
      setSearchFilter("songs");
      performSearch(track.title, "songs");
      return;
    }

    playTrack(track, results);
    onTrackSelect?.(track);
  };

  const handleDownloadPress = async (track: Track) => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    await downloadTrack(track);
  };

  const renderTrackItem = ({ item }: { item: Track }) => {
    const isCurrent = currentTrack?.id === item.id;
    const favorite = isFavorite(item.id);
    const downloaded = isDownloaded(item.id);
    const downloading = activeDownloads[item.id] !== undefined;

    // Artist cards — large square artwork + artist name only
    if (searchFilter === "artists") {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleTrackPress(item)}
          style={[styles.trackRow, { backgroundColor: colors.surfaceLow, borderBottomColor: colors.borderSubtle }]}
        >
          <Image
            source={{ uri: item.artwork }}
            style={[styles.trackThumb, { borderRadius: 40, backgroundColor: colors.surfaceHigh }]}
          />
          <View style={styles.trackDetails}>
            <NothingText numberOfLines={1} size={14} variant="bodyMedium" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
              {item.title}
            </NothingText>
            <NothingText numberOfLines={1} size={11} style={{ color: colors.grey, marginTop: 3 }}>
              ARTIST
            </NothingText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.grey} style={{ marginRight: 4 }} />
        </TouchableOpacity>
      );
    }

    // Album cards — artwork + album + sub-label
    if (searchFilter === "albums") {
      return (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleTrackPress(item)}
          style={[styles.trackRow, { backgroundColor: colors.surfaceLow, borderBottomColor: colors.borderSubtle }]}
        >
          <Image source={{ uri: item.artwork }} style={[styles.trackThumb, { borderRadius: 6, backgroundColor: colors.surfaceHigh }]} />
          <View style={styles.trackDetails}>
            <NothingText numberOfLines={1} size={14} variant="bodyMedium" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
              {item.title}
            </NothingText>
            <NothingText numberOfLines={1} size={12} style={{ color: colors.grey, marginTop: 2 }}>
              {item.artist}
            </NothingText>
          </View>
          <NothingText variant="dot" size={10} style={{ color: colors.red, marginRight: 8 }}>
            ALBUM
          </NothingText>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => handleTrackPress(item)}
        style={[
          styles.trackRow,
          { backgroundColor: colors.surfaceLow, borderBottomColor: colors.borderSubtle },
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
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

      <View style={{ marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {(["songs", "albums", "artists", "playlists"] as const).map((f) => (
            <TouchableOpacity
              key={f}
              activeOpacity={0.7}
              onPress={() => handleFilterSelect(f)}
              style={[
                styles.keywordTag,
                { paddingVertical: 7, paddingHorizontal: 14 },
                { backgroundColor: searchFilter === f ? colors.surfaceMid : colors.surfaceLow, borderColor: searchFilter === f ? colors.red : colors.borderSubtle }
              ]}
            >
              <NothingText variant="dot" size={10} style={{ color: searchFilter === f ? colors.red : colors.grey }}>
                {f.toUpperCase()}
              </NothingText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {suggestions.length > 0 && !searched && (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.surfaceLowest, borderBottomColor: colors.borderSubtle }]}>
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
            SEARCHING YOUTUBE MUSIC...
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
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderTrackItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
          <ScrollView
          style={styles.trendingContainer}
          contentContainerStyle={{ paddingBottom: 100 }}
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
                  { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }
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

      <AlbumSheet
        visible={albumSheet.visible}
        browseId={albumSheet.browseId}
        albumName={albumSheet.albumName}
        albumArtist={albumSheet.albumArtist}
        albumArtwork={albumSheet.albumArtwork}
        onClose={() => setAlbumSheet((s) => ({ ...s, visible: false }))}
      />
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
    paddingBottom: 120,
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
