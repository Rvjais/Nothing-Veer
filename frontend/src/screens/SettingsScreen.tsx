import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLibraryStore } from "../store/useLibraryStore";
import { useThemeStore, ThemeMode } from "../store/useThemeStore";
import { NothingLayout } from "../constants/theme";
import { NothingText } from "../components/common/NothingText";
import { NothingCard } from "../components/common/NothingCard";
import { DownloadManager } from "../services/downloadManager";
import { StreamResolver } from "../services/streamResolver";

export interface SettingsScreenProps {
  onBack?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const audioQuality = useLibraryStore((s) => s.audioQuality);
  const setAudioQuality = useLibraryStore((s) => s.setAudioQuality);
  const downloadedTracks = useLibraryStore((s) => s.downloadedTracks);
  const clearAllDownloads = useLibraryStore((s) => s.clearAllDownloads);

  const { mode: themeMode, setMode: setThemeMode, colors, isDark } = useThemeStore();

  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  useEffect(() => {
    DownloadManager.getStorageUsedBytes().then(setStorageUsed);
  }, [downloadedTracks]);

  const handleQualityChange = (quality: "high" | "medium" | "low") => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setAudioQuality(quality);
  };

  const handleThemeChange = (mode: ThemeMode) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setThemeMode(mode);
  };

  const handleClearCache = () => {
    Alert.alert(
      "CLEAR CACHE",
      "This will clear temporary streaming cache. Saved favorites, playlists, and offline downloads will remain intact.",
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "CLEAR",
          style: "destructive",
          onPress: async () => {
            try {
              await DownloadManager.clearTemporaryFiles();
              let backendCleared = false;
              try {
                await StreamResolver.clearCache();
                backendCleared = true;
              } catch {
                // Local temporary download files are still cleared if the
                // backend is offline.
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                backendCleared ? "SUCCESS" : "LOCAL CACHE CLEARED",
                backendCleared
                  ? "Temporary download files and resolved stream URLs were cleared."
                  : "Temporary download files were cleared. The audio backend could not be reached to clear its URL cache."
              );
            } catch (error) {
              Alert.alert(
                "CACHE CLEAR FAILED",
                error instanceof Error ? error.message : "Could not clear temporary data."
              );
            }
          },
        },
      ]
    );
  };

  const handleClearAllDownloads = () => {
    Alert.alert(
      "PURGE OFFLINE SONGS",
      `Are you sure you want to delete all ${downloadedTracks.length} offline songs from this device?`,
      [
        { text: "CANCEL", style: "cancel" },
        {
          text: "DELETE ALL",
          style: "destructive",
          onPress: async () => {
            await clearAllDownloads();
            setStorageUsed(0);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Top Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : "#111111"} />
          </TouchableOpacity>
        )}
        <View>
          <NothingText variant="dot" size={26} color="white" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
            SETTINGS
          </NothingText>
          <NothingText variant="mono" color="dim" size={11} style={styles.headerSub}>
            AUDIO, THEME & SYSTEM PREFERENCES
          </NothingText>
        </View>
      </View>

      {/* APPEARANCE / THEME SECTION */}
      <View style={styles.section}>
        <NothingText variant="dot" size={13} color="dim" style={styles.sectionTitle}>
          APPEARANCE & THEME
        </NothingText>

        <NothingCard style={styles.cardGroup}>
          <TouchableOpacity
            style={[
              styles.qualityRow,
              themeMode === "dark" && { backgroundColor: colors.surfaceHigh },
            ]}
            onPress={() => handleThemeChange("dark")}
          >
            <View>
              <NothingText
                variant="bodyMedium"
                color={themeMode === "dark" ? "red" : "white"}
                style={{ color: themeMode === "dark" ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
              >
                DARK THEME (AMOLED)
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                OBSIDIAN BLACK • FROSTED GLASS
              </NothingText>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: colors.grey },
                themeMode === "dark" && { borderColor: colors.red },
              ]}
            >
              {themeMode === "dark" && <View style={[styles.radioInner, { backgroundColor: colors.red }]} />}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <TouchableOpacity
            style={[
              styles.qualityRow,
              themeMode === "light" && { backgroundColor: colors.surfaceHigh },
            ]}
            onPress={() => handleThemeChange("light")}
          >
            <View>
              <NothingText
                variant="bodyMedium"
                color={themeMode === "light" ? "red" : "white"}
                style={{ color: themeMode === "light" ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
              >
                LIGHT THEME (GHOST WHITE)
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                CRISP MONOCHROME • LIQUID GLASS
              </NothingText>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: colors.grey },
                themeMode === "light" && { borderColor: colors.red },
              ]}
            >
              {themeMode === "light" && <View style={[styles.radioInner, { backgroundColor: colors.red }]} />}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <TouchableOpacity
            style={[
              styles.qualityRow,
              themeMode === "system" && { backgroundColor: colors.surfaceHigh },
            ]}
            onPress={() => handleThemeChange("system")}
          >
            <View>
              <NothingText
                variant="bodyMedium"
                color={themeMode === "system" ? "red" : "white"}
                style={{ color: themeMode === "system" ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
              >
                SYSTEM DEFAULT
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                MATCH SYSTEM DISPLAY PREFERENCE
              </NothingText>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: colors.grey },
                themeMode === "system" && { borderColor: colors.red },
              ]}
            >
              {themeMode === "system" && <View style={[styles.radioInner, { backgroundColor: colors.red }]} />}
            </View>
          </TouchableOpacity>
        </NothingCard>
      </View>

      {/* Audio Quality Section */}
      <View style={styles.section}>
        <NothingText variant="dot" size={13} color="dim" style={styles.sectionTitle}>
          STREAM QUALITY
        </NothingText>

        <NothingCard style={styles.cardGroup}>
          <TouchableOpacity
            style={[
              styles.qualityRow,
              audioQuality === "high" && { backgroundColor: colors.surfaceHigh },
            ]}
            onPress={() => handleQualityChange("high")}
          >
            <View>
              <NothingText
                variant="bodyMedium"
                color={audioQuality === "high" ? "red" : "white"}
                style={{ color: audioQuality === "high" ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
              >
                HIGH QUALITY
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                OPUS 160 KBPS / AAC 128 KBPS
              </NothingText>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: colors.grey },
                audioQuality === "high" && { borderColor: colors.red },
              ]}
            >
              {audioQuality === "high" && <View style={[styles.radioInner, { backgroundColor: colors.red }]} />}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <TouchableOpacity
            style={[
              styles.qualityRow,
              audioQuality === "medium" && { backgroundColor: colors.surfaceHigh },
            ]}
            onPress={() => handleQualityChange("medium")}
          >
            <View>
              <NothingText
                variant="bodyMedium"
                color={audioQuality === "medium" ? "red" : "white"}
                style={{ color: audioQuality === "medium" ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
              >
                BALANCED
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                AAC 128 KBPS (RECOMMENDED)
              </NothingText>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: colors.grey },
                audioQuality === "medium" && { borderColor: colors.red },
              ]}
            >
              {audioQuality === "medium" && <View style={[styles.radioInner, { backgroundColor: colors.red }]} />}
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <TouchableOpacity
            style={[
              styles.qualityRow,
              audioQuality === "low" && { backgroundColor: colors.surfaceHigh },
            ]}
            onPress={() => handleQualityChange("low")}
          >
            <View>
              <NothingText
                variant="bodyMedium"
                color={audioQuality === "low" ? "red" : "white"}
                style={{ color: audioQuality === "low" ? colors.red : (isDark ? "#FFFFFF" : "#111111") }}
              >
                DATA SAVER
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                OPUS 70 KBPS (LOW BANDWIDTH)
              </NothingText>
            </View>
            <View
              style={[
                styles.radioOuter,
                { borderColor: colors.grey },
                audioQuality === "low" && { borderColor: colors.red },
              ]}
            >
              {audioQuality === "low" && <View style={[styles.radioInner, { backgroundColor: colors.red }]} />}
            </View>
          </TouchableOpacity>
        </NothingCard>
      </View>

      {/* Offline Storage Section */}
      <View style={styles.section}>
        <NothingText variant="dot" size={13} color="dim" style={styles.sectionTitle}>
          OFFLINE STORAGE
        </NothingText>

        <NothingCard style={styles.cardGroup}>
          <View style={styles.aboutRow}>
            <View>
              <NothingText variant="bodyMedium" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
                OFFLINE TRACKS
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                {DownloadManager.formatBytes(storageUsed)} STORED LOCALLY
              </NothingText>
            </View>
            <NothingText variant="dot" color="red" size={14} style={{ flexShrink: 1, textAlign: "right" }}>
              {downloadedTracks.length} SONGS
            </NothingText>
          </View>

          {downloadedTracks.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleClearAllDownloads}
              >
                <View>
                  <NothingText variant="bodyMedium" color="red">
                    PURGE ALL DOWNLOADS
                  </NothingText>
                  <NothingText variant="mono" color="dim" size={11}>
                    FREE UP {DownloadManager.formatBytes(storageUsed)} DISK SPACE
                  </NothingText>
                </View>
                <Ionicons name="trash-bin-outline" size={20} color={colors.red} />
              </TouchableOpacity>
            </>
          )}
        </NothingCard>
      </View>

      {/* Playback & Feedback */}
      <View style={styles.section}>
        <NothingText variant="dot" size={13} color="dim" style={styles.sectionTitle}>
          FEEDBACK & PLAYBACK
        </NothingText>

        <NothingCard style={styles.cardGroup}>
          <View style={styles.switchRow}>
            <View>
              <NothingText variant="bodyMedium" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
                HAPTIC ENGINE
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                NOTHING OS TACTILE FEEDBACK
              </NothingText>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: colors.surfaceHigh, true: colors.red }}
              thumbColor={colors.white}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.switchRow}>
            <View>
              <NothingText variant="bodyMedium" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
                DATA STREAMING ONLY
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                STREAM OVER CELLULAR & WI-FI
              </NothingText>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={setOfflineMode}
              trackColor={{ false: colors.surfaceHigh, true: colors.red }}
              thumbColor={colors.white}
            />
          </View>
        </NothingCard>
      </View>

      {/* Storage & Cache */}
      <View style={styles.section}>
        <NothingText variant="dot" size={13} color="dim" style={styles.sectionTitle}>
          CACHE & DATA
        </NothingText>

        <NothingCard style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearCache}
          >
            <View>
              <NothingText variant="bodyMedium" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
                CLEAR AUDIO CACHE
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                FREE UP LOCAL TEMPORARY DATA
              </NothingText>
            </View>
            <Ionicons name="trash-outline" size={20} color={colors.red} />
          </TouchableOpacity>
        </NothingCard>
      </View>

      {/* Credits Section */}
      <View style={styles.section}>
        <NothingText variant="dot" size={13} color="dim" style={styles.sectionTitle}>
          CREDITS
        </NothingText>

        <NothingCard style={styles.cardGroup} accent>
          <View style={styles.aboutRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <NothingText variant="bodyMedium" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
                CREATOR & DEVELOPER
              </NothingText>
              <NothingText variant="mono" color="dim" size={11}>
                DESIGN & ENGINEERING
              </NothingText>
            </View>
            <NothingText variant="dot" color="red" size={14} style={{ flexShrink: 1, textAlign: "right" }}>
              MADE BY RANVEER ❤️ ♫
            </NothingText>
          </View>
        </NothingCard>
      </View>

      {/* Engine & About */}
      <View style={styles.section}>
        <NothingText variant="dot" size={13} color="dim" style={styles.sectionTitle}>
          ABOUT
        </NothingText>

        <NothingCard style={styles.cardGroup} accent>
          <View style={styles.aboutRow}>
            <NothingText variant="mono" color="dim" size={12}>APPLICATION</NothingText>
            <NothingText variant="dot" size={14} style={{ color: isDark ? "#FFFFFF" : "#111111" }}>NOTHING (MUSIC)</NothingText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.aboutRow}>
            <NothingText variant="mono" color="dim" size={12}>VERSION</NothingText>
            <NothingText variant="mono" size={13} style={{ color: isDark ? "#FFFFFF" : "#111111", flexShrink: 1, textAlign: "right" }}>2.0.0 (SDK 54)</NothingText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.aboutRow}>
            <NothingText variant="mono" color="dim" size={12} style={{ flex: 1, paddingRight: 12 }}>UI ENGINE</NothingText>
            <NothingText variant="mono" size={13} style={{ color: isDark ? "#FFFFFF" : "#111111", flexShrink: 1, textAlign: "right" }}>NOTHING OS • LIQUID GLASS</NothingText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.aboutRow}>
            <NothingText variant="mono" color="dim" size={12} style={{ flex: 1, paddingRight: 12 }}>STREAM RESOLVER</NothingText>
            <NothingText variant="mono" size={13} style={{ color: isDark ? "#FFFFFF" : "#111111", flexShrink: 1, textAlign: "right" }}>INNERTUBE IOS (DIRECT)</NothingText>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          <View style={styles.aboutRow}>
            <NothingText variant="mono" color="dim" size={12} style={{ flex: 1, paddingRight: 12 }}>LYRICS ENGINE</NothingText>
            <NothingText variant="mono" size={13} style={{ color: isDark ? "#FFFFFF" : "#111111", flexShrink: 1, textAlign: "right" }}>LRCLIB SYNCHRONIZED</NothingText>
          </View>
        </NothingCard>
      </View>

      <View style={styles.footer}>
        <NothingText variant="dot" color="red" size={12} style={styles.footerText}>
          MADE BY RANVEER ❤️ ♫
        </NothingText>
        <NothingText variant="dot" color="dim" size={11} style={[styles.footerText, { marginTop: 4 }]}>
          (1) DESIGNED IN THE STYLE OF NOTHING OS
        </NothingText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: 12,
    paddingBottom: 180,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: NothingLayout.screenPadding,
    marginBottom: 24,
  },
  backButton: {
    marginRight: 14,
  },
  headerSub: {
    marginTop: 2,
    letterSpacing: 1.5,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: NothingLayout.screenPadding,
  },
  sectionTitle: {
    marginBottom: 10,
    letterSpacing: 1.2,
  },
  cardGroup: {
    padding: 0,
    overflow: "hidden",
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  divider: {
    height: 1,
  },
  footer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    letterSpacing: 1.2,
  },
});



