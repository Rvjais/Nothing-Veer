import React, { useMemo, useState } from "react";
import { View, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Switch, TextInput, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Track } from "../types/music";
import { useLibraryStore } from "../store/useLibraryStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useCacheStore } from "../store/useCacheStore";
import { useThemeStore } from "../store/useThemeStore";
import { AudioCache, CachedTrack } from "../services/audioCache";
import { DownloadManager } from "../services/downloadManager";
import * as Haptics from "../services/haptics";
import { NothingText } from "../components/common/NothingText";
import { ScreenHeader } from "../components/common/ScreenHeader";

export interface DownloadsScreenProps { onOpenNowPlaying?: () => void }

export function DownloadsScreen({ onOpenNowPlaying }: DownloadsScreenProps) {
  const [tab, setTab] = useState<"downloads" | "cached">("downloads");
  const [query, setQuery] = useState("");
  const [alphabetical, setAlphabetical] = useState(false);
  const [keeping, setKeeping] = useState<string | null>(null);
  const [cacheOptions, setCacheOptions] = useState(false);
  const { colors } = useThemeStore();
  const downloads = useLibraryStore(state => state.downloadedTracks);
  const activeDownloads = useLibraryStore(state => state.activeDownloads);
  const cache = useCacheStore();
  const currentTrack = usePlayerStore(state => state.currentTrack);
  const playing = usePlayerStore(state => state.isPlaying);
  const source = tab === "downloads" ? downloads : cache.tracks;
  const totalBytes = source.reduce((sum, track) => sum + (track.fileSize || 0), 0);
  const tracks = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = source.filter(track => `${track.title} ${track.artist}`.toLowerCase().includes(term));
    return alphabetical ? [...filtered].sort((a, b) => a.title.localeCompare(b.title)) : filtered;
  }, [source, query, alphabetical]);
  const play = (track: Track, queue = tracks) => {
    void Haptics.selectionAsync();
    void usePlayerStore.getState().playTrack(track, queue);
    onOpenNowPlaying?.();
  };
  const shuffle = () => {
    const queue = [...tracks];
    for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
    if (queue[0]) play(queue[0], queue);
  };
  const remove = (track: Track) => Alert.alert(tab === "cached" ? "Remove cached song?" : "Remove download?", track.title, [
    { text: "Cancel", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: () => { void (tab === "cached" ? cache.remove(track.id) : useLibraryStore.getState().removeDownload(track.id)).catch(error => Alert.alert("Song in use", error.message)); } },
  ]);
  const keep = async (track: Track) => {
    if (keeping || useLibraryStore.getState().isDownloaded(track.id)) return;
    setKeeping(track.id);
    try {
      const saved = await AudioCache.keep(track as CachedTrack);
      await useLibraryStore.getState().keepCachedTrack(saved);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) { Alert.alert("Could not keep this song", error instanceof Error ? error.message : "Try again."); }
    finally { setKeeping(null); }
  };
  const clear = () => Alert.alert(tab === "cached" ? "Clear cached songs?" : "Clear downloads?", tab === "cached" ? "Downloads stay untouched. A cached song currently in use will be kept." : "This removes your downloaded songs from this phone.", [
    { text: "Cancel", style: "cancel" },
    { text: "Clear", style: "destructive", onPress: () => { void (tab === "cached" ? cache.clear() : useLibraryStore.getState().clearAllDownloads()).catch(() => Alert.alert("Could not clear storage", "Try again.")); } },
  ]);
  const header = <>
    <ScreenHeader eyebrow="MADE FOR OFFLINE" title="Your offline collection" subtitle="Saved by you. Remembered by your music." />
    <View style={[styles.tabs, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}>
      {(["downloads", "cached"] as const).map(value => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => { setTab(value); setQuery(""); void Haptics.selectionAsync(); }} style={[styles.tab, tab === value && { backgroundColor: colors.white }]}>
        <Ionicons name={value === "cached" ? "time-outline" : "arrow-down-outline"} size={16} color={tab === value ? colors.background : colors.grey} />
        <NothingText variant="bodyMedium" size={12} style={{ color: tab === value ? colors.background : colors.grey }}>{value === "cached" ? "Cached" : "Downloads"}</NothingText>
        <NothingText variant="mono" size={10} style={{ color: tab === value ? colors.background : colors.grey }}>{value === "cached" ? cache.tracks.length : downloads.length}</NothingText>
      </TouchableOpacity>)}
    </View>
    <View style={[styles.summary, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderSubtle }]}>
      <View style={{ flex: 1 }}><NothingText variant="mono" size={10} color="red">{tab === "cached" ? "RECENT LISTENING, SAVED" : "YOURS TO KEEP"}</NothingText><NothingText variant="headline" size={26} style={{ marginTop: 8 }}>{DownloadManager.formatBytes(totalBytes)}</NothingText><NothingText size={11} color="grey" style={{ marginTop: 5 }}>{source.length} {source.length === 1 ? "song" : "songs"} ready without internet</NothingText></View>
      <View style={[styles.summaryIcon, { backgroundColor: colors.surfaceLow }]}><Ionicons name={tab === "cached" ? "time-outline" : "cloud-done-outline"} size={26} color={colors.red} /></View>
    </View>
    {tab === "cached" && <View style={[styles.cacheControls, { borderColor: colors.borderSubtle }]}>
      <View style={styles.settingRow}><View style={{ flex: 1 }}><NothingText variant="bodyMedium" size={13}>Remember played songs</NothingText><NothingText size={11} color="grey" style={{ marginTop: 4, lineHeight: 17 }}>Save full copies while listening. Uses extra data.</NothingText></View><Switch accessibilityLabel="Automatically cache played songs" value={cache.enabled} onValueChange={cache.setEnabled} trackColor={{ true: colors.red, false: colors.surfaceHigh }} thumbColor="#FFFFFF" /></View>
      <TouchableOpacity onPress={() => setCacheOptions(!cacheOptions)} style={styles.settingRow} accessibilityRole="button"><NothingText variant="mono" size={10} color="grey">{cache.limitMB} MB LIMIT · CACHE SETTINGS</NothingText><Ionicons name={cacheOptions ? "chevron-up" : "chevron-down"} size={16} color={colors.grey} /></TouchableOpacity>
      {cacheOptions && <>
      <View style={styles.settingRow}><NothingText size={11} color="grey">Cache limit</NothingText><View style={styles.limits}>{[50, 200, 500].map(mb => <TouchableOpacity key={mb} onPress={() => { void cache.setLimit(mb).catch(() => Alert.alert("Storage unavailable", "Please try again.")); }} style={[styles.limit, { borderColor: cache.limitMB === mb ? colors.red : colors.borderSubtle, backgroundColor: cache.limitMB === mb ? colors.redGlow : colors.surfaceLow }]}><NothingText variant="mono" size={10} color={cache.limitMB === mb ? "red" : "grey"}>{mb} MB</NothingText></TouchableOpacity>)}</View></View>
      <View style={[styles.meter, { backgroundColor: colors.surfaceHigh }]}><View style={{ height: 3, width: `${Math.min(100, totalBytes / (cache.limitMB * 1024 * 1024) * 100)}%`, backgroundColor: colors.red, borderRadius: 3 }} /></View>
      <NothingText size={10} color="grey" style={{ lineHeight: 16 }}>Older cached songs make room for new ones. The song in use is kept. Tap Keep to save it in Downloads. Only complete songs work offline.</NothingText>
      </>}
    </View>}
    {(cache.activeTrackId && tab === "cached" || Object.keys(activeDownloads).length > 0 && tab === "downloads") && <View style={[styles.notice, { backgroundColor: colors.surfaceLow }]}><ActivityIndicator size="small" color={colors.red} /><NothingText size={12} color="dim" style={{ flex: 1 }}>{tab === "cached" ? `Saving a recent song · ${Math.round(cache.progress * 100)}%` : `Saving ${Object.keys(activeDownloads).length} downloads`}</NothingText></View>}
    <View style={styles.actions}>
      <TouchableOpacity disabled={!tracks.length} accessibilityRole="button" onPress={() => play(tracks[0])} style={[styles.playAll, { backgroundColor: colors.red, opacity: tracks.length ? 1 : 0.4 }]}><Ionicons name="play" size={16} color="#FFFFFF" /><NothingText variant="bodyMedium" size={12} style={{ color: "#FFFFFF" }}>Play all</NothingText></TouchableOpacity>
      <TouchableOpacity disabled={!tracks.length} accessibilityRole="button" onPress={shuffle} style={[styles.shuffle, { borderColor: colors.borderLight, opacity: tracks.length ? 1 : 0.4 }]}><Ionicons name="shuffle" size={17} color={colors.white} /><NothingText size={12}>Shuffle</NothingText></TouchableOpacity>
      {!!source.length && <TouchableOpacity onPress={clear} style={styles.clear} accessibilityLabel={tab === "cached" ? "Clear cached songs" : "Clear downloads"}><Ionicons name="trash-outline" size={18} color={colors.grey} /></TouchableOpacity>}
    </View>
    {!!source.length && <View style={[styles.search, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}><Ionicons name="search-outline" size={17} color={colors.grey} /><TextInput placeholder="Find a song or artist" placeholderTextColor={colors.grey} value={query} onChangeText={setQuery} style={[styles.input, { color: colors.white }]} /><TouchableOpacity accessibilityLabel="Change song sort order" onPress={() => setAlphabetical(!alphabetical)}><NothingText variant="mono" size={10} color="grey">{alphabetical ? "A–Z" : "RECENT"}</NothingText></TouchableOpacity></View>}
  </>;
  return <View style={{ flex: 1, backgroundColor: colors.background }}><FlatList data={tracks} keyExtractor={track => track.id} ListHeaderComponent={header} showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}
    ListEmptyComponent={<View style={styles.empty}><View style={[styles.emptyIcon, { backgroundColor: colors.surfaceLow }]}><Ionicons name={query ? "search-outline" : tab === "cached" ? "time-outline" : "musical-notes-outline"} size={30} color={colors.grey} /></View><NothingText variant="headline" size={23}>{query ? "No matches just yet" : tab === "cached" ? "A little history starts here" : "Take your music with you"}</NothingText><NothingText size={13} color="grey" style={styles.emptyCopy}>{query ? "Try another song or artist." : tab === "cached" ? "Play a song online. Once its cache finishes saving, it appears here for offline listening." : "Download a favorite from the player or search to listen anywhere."}</NothingText></View>}
    renderItem={({ item }) => <TouchableOpacity onPress={() => play(item)} activeOpacity={0.8} style={[styles.row, { backgroundColor: currentTrack?.id === item.id ? colors.surfaceMid : colors.surfaceLowest, borderColor: currentTrack?.id === item.id ? colors.redDim : colors.borderSubtle }]}>
      <View style={[styles.art, { backgroundColor: colors.surfaceHigh }]}><Ionicons name="musical-note" size={21} color={colors.grey} /><Image source={{ uri: item.artwork }} style={StyleSheet.absoluteFill} /></View>
      <View style={styles.trackCopy}><NothingText variant="bodyMedium" size={14} numberOfLines={1} color={currentTrack?.id === item.id ? "red" : "white"}>{item.title}</NothingText><NothingText numberOfLines={1} size={12} color="grey" style={{ marginTop: 4 }}>{item.artist}</NothingText><View style={styles.meta}><Ionicons name={playing && currentTrack?.id === item.id ? "volume-high-outline" : "checkmark-circle-outline"} size={11} color={colors.red} /><NothingText size={10} color="grey">{DownloadManager.formatBytes(item.fileSize || 0)} · Offline</NothingText></View></View>
      {tab === "cached" && <TouchableOpacity disabled={!!keeping || downloads.some(track => track.id === item.id)} onPress={() => { void keep(item); }} style={[styles.keep, { backgroundColor: colors.surfaceHigh }]} accessibilityLabel={`Keep ${item.title} in Downloads`}>{keeping === item.id ? <ActivityIndicator size="small" color={colors.red} /> : <NothingText size={10} color="dim">{downloads.some(track => track.id === item.id) ? "Kept" : "Keep"}</NothingText>}</TouchableOpacity>}
      <TouchableOpacity onPress={() => remove(item)} accessibilityLabel={`Remove ${item.title}`} style={styles.remove}><Ionicons name="close" size={18} color={colors.grey} /></TouchableOpacity>
    </TouchableOpacity>}
  /></View>;
}
const styles = StyleSheet.create({
  list: { paddingBottom: 200 }, tabs: { marginHorizontal: 20, padding: 5, flexDirection: "row", borderRadius: 24, borderWidth: 1, gap: 4 }, tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 12, borderRadius: 19 },
  summary: { flexDirection: "row", alignItems: "center", margin: 20, marginBottom: 12, padding: 20, borderRadius: 24, borderWidth: 1 }, summaryIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center" }, cacheControls: { marginHorizontal: 20, borderWidth: 1, borderRadius: 20, padding: 16, gap: 14, marginBottom: 14 }, settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, limits: { flexDirection: "row", gap: 5 }, limit: { paddingHorizontal: 9, paddingVertical: 7, borderWidth: 1, borderRadius: 12 }, meter: { height: 3, borderRadius: 3, overflow: "hidden" },
  notice: { marginHorizontal: 20, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 16, marginBottom: 12 }, actions: { flexDirection: "row", gap: 10, alignItems: "center", paddingHorizontal: 20, marginBottom: 18 }, playAll: { minHeight: 42, paddingHorizontal: 18, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 7 }, shuffle: { minHeight: 42, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 7 }, clear: { marginLeft: "auto", padding: 12 }, search: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 16, borderWidth: 1, borderRadius: 17, paddingHorizontal: 14 }, input: { flex: 1, height: 46, fontSize: 12 },
  row: { marginHorizontal: 20, marginBottom: 10, borderWidth: 1, borderRadius: 20, flexDirection: "row", alignItems: "center", padding: 12, gap: 12 }, art: { width: 54, height: 54, borderRadius: 14, overflow: "hidden", alignItems: "center", justifyContent: "center" }, trackCopy: { flex: 1, minWidth: 0 }, meta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }, keep: { minWidth: 42, minHeight: 32, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }, remove: { padding: 5 },
  empty: { padding: 30, alignItems: "center", paddingTop: 24 }, emptyIcon: { width: 70, height: 70, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 20 }, emptyCopy: { textAlign: "center", lineHeight: 21, marginTop: 10, maxWidth: 290 },
});
