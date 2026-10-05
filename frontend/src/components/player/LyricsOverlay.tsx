import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LyricsService } from "../../services/lyrics";
import { LyricsData } from "../../types/music";
import { NothingFonts } from "../../constants/theme";
import { NothingText } from "../common/NothingText";
import { useThemeStore } from "../../store/useThemeStore";

export interface LyricsOverlayProps {
  title: string;
  artist: string;
  duration: number;
  positionMillis: number;
  onSeek: (seconds: number) => void;
  onClose?: () => void;
}

export const LyricsOverlay: React.FC<LyricsOverlayProps> = ({
  title,
  artist,
  duration,
  positionMillis,
  onSeek,
}) => {
  const colors = useThemeStore((state) => state.colors);
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const currentSeconds = positionMillis / 1000;

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    LyricsService.getLyrics(title, artist, duration).then((data) => {
      if (mounted) {
        setLyricsData(data);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [title, artist, duration]);

  const activeIndex = lyricsData?.synced
    ? LyricsService.getActiveLineIndex(lyricsData.lines, currentSeconds)
    : -1;

  // Auto-scroll to active lyric line
  useEffect(() => {
    if (activeIndex >= 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        y: Math.max(0, activeIndex * 52 - 120),
        animated: true,
      });
    }
  }, [activeIndex]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={colors.red} />
        <NothingText
          variant="dot"
          size={12}
          color="grey"
          style={{ marginTop: 12 }}
        >
          SYNCING LYRICS...
        </NothingText>
      </View>
    );
  }

  if (!lyricsData || lyricsData.lines.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <NothingText variant="dot" size={14} color="grey">
          NO LYRICS AVAILABLE
        </NothingText>
        <NothingText size={12} color="muted" style={{ marginTop: 6 }}>
          Could not find synced lyrics for this track
        </NothingText>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {lyricsData.lines.map((line, index) => {
        const isActive = index === activeIndex;

        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => onSeek(line.time)}
            style={styles.lineTouch}
          >
            <NothingText
              variant={isActive ? "headline" : "body"}
              size={isActive ? 20 : 15}
              color={isActive ? "white" : "grey"}
              style={[
                styles.lineText,
                isActive && styles.activeLineText,
              ]}
            >
              {line.text}
            </NothingText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  content: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lineTouch: {
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: "center",
  },
  lineText: {
    lineHeight: 28,
  },
  activeLineText: {
    fontFamily: NothingFonts.headline,
  },
});
