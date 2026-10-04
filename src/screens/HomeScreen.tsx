import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { YouTubeService } from "../services/youtube";
import { Track, HomeFeedSection } from "../types/music";
import { usePlayerStore } from "../store/usePlayerStore";
import { useLibraryStore } from "../store/useLibraryStore";
import { useThemeStore } from "../store/useThemeStore";
import { NothingColors, NothingFonts, NothingLayout } from "../constants/theme";
import { NothingText } from "../components/common/NothingText";
import { NothingCard } from "../components/common/NothingCard";
import { GlyphIndicator } from "../components/common/GlyphIndicator";

const MOODS = [
  "ALL",
  "TRENDING",
  "CHILL",
  "SYNTH",
  "WORKOUT",
  "POP",
  "ROCK",
  "HIP-HOP",
];

export interface HomeScreenProps {
  onOpenSearch: () => void;
  onOpenNowPlaying: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenSearch,
  onOpenNowPlaying,
}) => {
  const [sections, setSections] = useState<HomeFeedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMood, setSelectedMood] = useState("ALL");

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const recents = useLibraryStore((s) => s.recents);
  const { colors, isDark } = useThemeStore();

  const fetchFeed = async () => {
    try {
      const data = await YouTubeService.getHomeFeed();
      setSections(data);
    } catch (e) {
      console.warn("Failed to load feed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleMoodSelect = async (mood: string) => {
    setSelectedMood(mood);
    if (mood === "ALL") {
      fetchFeed();
      return;
    }

    setLoading(true);
    try {
      const tracks = await YouTubeService.getMoodTracks(mood);
      setSections([
        {
          title: `${mood.toUpperCase()} TRACKS`,
          subtitle: "EXPLORE ON YOUTUBE MUSIC",
          items: tracks,
        },
      ]);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING";
    if (hour < 17) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.logoRow}>
            <NothingText variant="dot" size={20} color="white" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
              NOTHING
            </NothingText>
            <View style={[styles.redDot, { backgroundColor: colors.red }]} />
            <NothingText variant="dot" size={20} color="dim">
              MUSIC
            </NothingText>
          </View>
          <NothingText variant="mono" size={11} color="grey" style={{ marginTop: 2, color: colors.grey }}>
            {getGreeting()} (•‿•)
          </NothingText>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenSearch}
          style={[styles.searchBtn, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}
        >
          <Ionicons name="search" size={20} color={isDark ? "#FFFFFF" : "#111111"} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchFeed();
            }}
            tintColor={colors.red}
          />
        }
      >
        {/* Mood Filter Capsules */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.moodScroll}
        >
          {MOODS.map((mood) => {
            const isSelected = selectedMood === mood;
            return (
              <TouchableOpacity
                key={mood}
                activeOpacity={0.75}
                onPress={() => handleMoodSelect(mood)}
                style={[
                  styles.moodPill,
                  { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle },
                  isSelected && [styles.moodPillActive, { backgroundColor: isDark ? NothingColors.white : '#000000', borderColor: colors.borderActive }]
                ]}
              >
                <NothingText
                  variant="dot"
                  size={12}
                  style={{ color: isSelected ? (isDark ? '#000000' : '#FFFFFF') : colors.grey }}
                >
                  {mood}
                </NothingText>
                {isSelected && <View style={styles.moodDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Widget Card */}
        {currentTrack ? (
          <NothingCard
            accent
            onPress={onOpenNowPlaying}
            style={styles.featuredCard}
          >
            <View style={styles.featuredContent}>
              <Image
                source={{ uri: currentTrack.artwork }}
                style={styles.featuredArt}
              />
              <View style={styles.featuredText}>
                <View style={styles.tagRow}>
                  <NothingText variant="dot" size={11} color="red">
                    NOW PLAYING
                  </NothingText>
                  <GlyphIndicator isPlaying={isPlaying} size={12} />
                </View>
                <NothingText
                  numberOfLines={1}
                  variant="headline"
                  size={16}
                  style={{ marginTop: 4 }}
                >
                  {currentTrack.title}
                </NothingText>
                <NothingText numberOfLines={1} size={13} color="grey">
                  {currentTrack.artist}
                </NothingText>
              </View>
            </View>
          </NothingCard>
        ) : (
          <NothingCard style={styles.heroBanner}>
            <View style={styles.heroContent}>
              <View>
                <NothingText variant="dot" size={12} color="red">
                  STREAM ONLINE
                </NothingText>
                <NothingText
                  variant="headline"
                  size={18}
                  style={{ marginTop: 4 }}
                >
                  YOUTUBE MUSIC ENGINE
                </NothingText>
                <NothingText size={12} color="grey" style={{ marginTop: 2 }}>
                  Millions of tracks • Synced lyrics • High bitrate
                </NothingText>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onOpenSearch}
                style={styles.exploreCircle}
              >
                <Ionicons name="arrow-forward" size={18} color={NothingColors.background} />
              </TouchableOpacity>
            </View>
          </NothingCard>
        )}

        {/* Recently Played if any */}
        {recents.length > 0 && selectedMood === "ALL" && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <NothingText variant="dot" size={16}>
                RECENTLY PLAYED
              </NothingText>
              <NothingText variant="mono" size={11} color="grey">
                {recents.length} TRACKS
              </NothingText>
            </View>

            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recents.slice(0, 10)}
              keyExtractor={(item) => `recent-${item.id}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => playTrack(item, recents)}
                  style={styles.recentItem}
                >
                  <Image source={{ uri: item.artwork }} style={styles.recentArt} />
                  <NothingText
                    numberOfLines={1}
                    size={13}
                    variant="bodyMedium"
                    style={{ marginTop: 6 }}
                  >
                    {item.title}
                  </NothingText>
                  <NothingText numberOfLines={1} size={11} color="grey">
                    {item.artist}
                  </NothingText>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Home Feed Sections */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={NothingColors.red} />
            <NothingText
              variant="dot"
              size={12}
              color="grey"
              style={{ marginTop: 12 }}
            >
              FETCHING YOUTUBE MUSIC...
            </NothingText>
          </View>
        ) : (
          sections.map((section, sIdx) => (
            <View key={sIdx} style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <View>
                  <NothingText variant="dot" size={16}>
                    {section.title}
                  </NothingText>
                  {section.subtitle && (
                    <NothingText variant="mono" size={11} color="grey" style={{ marginTop: 2 }}>
                      {section.subtitle}
                    </NothingText>
                  )}
                </View>
              </View>

              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={section.items}
                keyExtractor={(item) => `${item.id}-${sIdx}`}
                renderItem={({ item }) => {
                  const isCurrent = currentTrack?.id === item.id;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => playTrack(item, section.items)}
                      style={styles.trackCard}
                    >
                      <View style={styles.artWrapper}>
                        <Image
                          source={{ uri: item.artwork }}
                          style={styles.trackArt}
                        />
                        {isCurrent && (
                          <View style={styles.playingOverlay}>
                            <GlyphIndicator isPlaying={isPlaying} size={16} />
                          </View>
                        )}
                        <View style={styles.playBadge}>
                          <Ionicons
                            name="play"
                            size={14}
                            color={NothingColors.white}
                          />
                        </View>
                      </View>
                      <NothingText
                        numberOfLines={1}
                        size={13}
                        variant={isCurrent ? "bodyMedium" : "body"}
                        color={isCurrent ? "red" : "white"}
                        style={{ marginTop: 8 }}
                      >
                        {item.title}
                      </NothingText>
                      <NothingText
                        numberOfLines={1}
                        size={11}
                        color="grey"
                        style={{ marginTop: 2 }}
                      >
                        {item.artist}
                      </NothingText>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          ))
        )}
      </ScrollView>
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
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NothingColors.red,
    marginHorizontal: 8,
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NothingColors.surfaceLow,
    borderWidth: 1,
    borderColor: NothingColors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  moodScroll: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  moodPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: NothingLayout.radiusPill,
    backgroundColor: NothingColors.surfaceLow,
    borderWidth: 1,
    borderColor: NothingColors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  moodPillActive: {
    backgroundColor: NothingColors.surfaceMid,
    borderColor: NothingColors.borderActive,
  },
  moodDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: NothingColors.red,
  },
  featuredCard: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  featuredContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  featuredArt: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: NothingColors.surfaceHigh,
  },
  featuredText: {
    flex: 1,
    marginLeft: 14,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exploreCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NothingColors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionContainer: {
    marginTop: 20,
    paddingLeft: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 20,
    marginBottom: 12,
  },
  trackCard: {
    width: 140,
    marginRight: 14,
  },
  artWrapper: {
    width: 140,
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: NothingColors.surfaceLow,
  },
  trackArt: {
    width: "100%",
    height: "100%",
  },
  playingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
  recentItem: {
    width: 110,
    marginRight: 12,
  },
  recentArt: {
    width: 110,
    height: 110,
    borderRadius: 14,
    backgroundColor: NothingColors.surfaceLow,
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },
});
