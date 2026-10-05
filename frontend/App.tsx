import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import * as Haptics from "./src/services/haptics";
import { Image } from "react-native";
import { DownloadManager } from "./src/services/downloadManager";
import appConfig from "./app.json";

import { NothingColors, NothingFonts } from "./src/constants/theme";
import { useLibraryStore } from "./src/store/useLibraryStore";
import { usePlayerStore } from "./src/store/usePlayerStore";
import { useThemeStore } from "./src/store/useThemeStore";

import { HomeScreen } from "./src/screens/HomeScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { DownloadsScreen } from "./src/screens/DownloadsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { NowPlayingScreen } from "./src/screens/NowPlayingScreen";

import { MiniPlayer } from "./src/components/player/MiniPlayer";
import { NothingTabBar, TabName } from "./src/components/navigation/NothingTabBar";
import { NothingText } from "./src/components/common/NothingText";
import { YouTubeWelcome } from "./src/components/auth/YouTubeWelcome";
import { YouTubeAccessPrompt } from "./src/components/auth/YouTubeAccessPrompt";
import { YouTubeAuthModal } from "./src/components/auth/YouTubeAuthModal";
import { useAuthStore } from "./src/store/useAuthStore";
import { useCacheStore } from "./src/store/useCacheStore";

const TABS: TabName[] = ["home", "search", "library", "downloads", "settings"];

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabName>("home");
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [skippedWelcome, setSkippedWelcome] = useState(false);
  const [authModalVisible, setAuthModalVisible] = useState(false);
  const [authReady, setAuthReady] = useState(useAuthStore.persist.hasHydrated());
  const youtubeCookie = useAuthStore(state => state.youtubeCookie);
  const signInReason = useAuthStore(state => state.signInReason);
  const dismissSignIn = useAuthStore(state => state.dismissSignIn);
  const retryAfterSignIn = useRef(false);

  const currentTabRef = useRef<TabName>(currentTab);
  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  // Horizontal Swipe Gestures to switch tabs smoothly
  const swipePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take over if horizontal swipe is clearly dominant over vertical scroll
        return (
          Math.abs(gestureState.dx) > 18 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.2
        );
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentIdx = TABS.indexOf(currentTabRef.current);
        if (gestureState.dx < -50 && currentIdx < TABS.length - 1) {
          try {
            Haptics.selectionAsync();
          } catch {}
          setCurrentTab(TABS[currentIdx + 1]);
        } else if (gestureState.dx > 50 && currentIdx > 0) {
          try {
            Haptics.selectionAsync();
          } catch {}
          setCurrentTab(TABS[currentIdx - 1]);
        }
      },
    })
  ).current;

  // Load Nothing OS custom fonts
  const [fontsLoaded, fontError] = useFonts({
    "Geist-Medium": require("./assets/fonts/Geist-Medium.ttf"),
    "Geist-Regular": require("./assets/fonts/Geist-Regular.ttf"),
    "GeistMono-Medium": require("./assets/fonts/GeistMono-Medium.ttf"),
    "GeistMono-Regular": require("./assets/fonts/GeistMono-Regular.ttf"),
    "Ndot-77_JP_Extended": require("./assets/fonts/Ndot-77_JP_Extended.ttf"),
    "NType82-Headline": require("./assets/fonts/NType82-Headline.otf"),
    "NType82-Regular": require("./assets/fonts/NType82-Regular.otf"),
  });

  const loadLibrary = useLibraryStore((s) => s.loadLibrary);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playbackError = usePlayerStore((s) => s.playbackError);
  const clearPlaybackError = usePlayerStore((s) => s.clearPlaybackError);
  const { initTheme, colors, isDark } = useThemeStore();

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setAuthReady(true));
    if (!useAuthStore.persist.hasHydrated()) void Promise.resolve(useAuthStore.persist.rehydrate()).catch(() => {}).then(() => setAuthReady(true));
    else setAuthReady(true);
    return unsubscribe;
  }, []);

  useEffect(() => {
    initTheme();
    loadLibrary();
    void useCacheStore.getState().load();
    void DownloadManager.clearTemporaryFiles().catch(() => {});
  }, [initTheme, loadLibrary]);

  useEffect(() => {
    if (!playbackError) return;
    Alert.alert("Playback error", playbackError, [
      { text: "OK", onPress: clearPlaybackError },
    ]);
  }, [playbackError, clearPlaybackError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      const timer = setTimeout(() => {
        setBooting(false);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError]);

  // Nothing OS Bootup Screen
  if ((!fontsLoaded && !fontError) || booting || !authReady) {
    return (
      <View style={[styles.bootContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View style={styles.bootCenter}>
          <View style={styles.bootGlyphBox}>
            <Image
              source={require("./assets/VeerMusicLogo.png")}
              style={{ width: 64, height: 64, marginBottom: 16 }}
              resizeMode="contain"
            />
          </View>
          <NothingText variant="dot" size={32} style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
            VEER MUSIC
          </NothingText>
          <NothingText variant="mono" size={12} color="dim" style={styles.bootSub}>
            AUDIO OS • ONLINE STREAM
          </NothingText>
        </View>

        <View style={styles.bootFooter}>
          <ActivityIndicator size="small" color={NothingColors.red} style={{ marginBottom: 16 }} />
          <NothingText variant="dot" size={15} color="red" style={styles.bootCredit}>
            MADE BY RANVEER ❤️ ♫
          </NothingText>
          <NothingText variant="mono" size={10} color="muted" style={{ marginTop: 6, letterSpacing: 1.5 }}>
            INITIALIZING • v{appConfig.expo.version}
          </NothingText>
        </View>
      </View>
    );
  }

  const closeAuth = () => {
    setAuthModalVisible(false);
    const auth = useAuthStore.getState();
    if (retryAfterSignIn.current && auth.youtubeCookie && !auth.signInReason) {
      const player = usePlayerStore.getState();
      if (player.currentTrack) void player.playTrack(player.currentTrack);
    }
    retryAfterSignIn.current = false;
  };

  if (!youtubeCookie && !skippedWelcome) return <SafeAreaProvider>
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <YouTubeWelcome onConnect={() => setAuthModalVisible(true)} onSkip={() => { setSkippedWelcome(true); void Haptics.selectionAsync(); }} />
      <YouTubeAuthModal visible={authModalVisible} onClose={closeAuth} />
    </SafeAreaView>
  </SafeAreaProvider>;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "left", "right"]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />

        {/* Screen Content - Kept mounted to prevent unwanted reload on tab switch */}
        <View {...swipePanResponder.panHandlers} style={styles.screenContainer}>
          <View
            style={[
              styles.tabContentWrapper,
              { display: currentTab === "home" ? "flex" : "none" },
            ]}
          >
            <HomeScreen
              onOpenSearch={() => setCurrentTab("search")}
              onOpenNowPlaying={() => setNowPlayingOpen(true)}
              onOpenDownloads={() => setCurrentTab("downloads")}
              onConnectYouTube={() => setAuthModalVisible(true)}
            />
          </View>

          <View
            style={[
              styles.tabContentWrapper,
              { display: currentTab === "search" ? "flex" : "none" },
            ]}
          >
            <SearchScreen
              onBack={() => setCurrentTab("home")}
              onTrackSelect={() => setNowPlayingOpen(true)}
            />
          </View>

          <View
            style={[
              styles.tabContentWrapper,
              { display: currentTab === "library" ? "flex" : "none" },
            ]}
          >
            <LibraryScreen
              onOpenNowPlaying={() => setNowPlayingOpen(true)}
            />
          </View>

          <View
            style={[
              styles.tabContentWrapper,
              { display: currentTab === "downloads" ? "flex" : "none" },
            ]}
          >
            <DownloadsScreen
              onOpenNowPlaying={() => setNowPlayingOpen(true)}
            />
          </View>

          <View
            style={[
              styles.tabContentWrapper,
              { display: currentTab === "settings" ? "flex" : "none" },
            ]}
          >
            <SettingsScreen
              onBack={() => setCurrentTab("home")}
            />
          </View>
        </View>

        {/* Floating Bottom UI (MiniPlayer + TabBar) */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
          {currentTrack && (
            <MiniPlayer onPress={() => setNowPlayingOpen(true)} />
          )}
          <NothingTabBar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
          />
        </View>

        {/* Fullscreen Now Playing Modal with Turntable Player and Synced Lyrics */}
        <NowPlayingScreen
          visible={nowPlayingOpen && !signInReason && !authModalVisible}
          onClose={() => setNowPlayingOpen(false)}
        />
        <YouTubeAccessPrompt visible={!!signInReason && !authModalVisible} signedIn={!!youtubeCookie}
          onConnect={() => { retryAfterSignIn.current = true; setAuthModalVisible(true); }}
          onOffline={() => { dismissSignIn(); setNowPlayingOpen(false); setCurrentTab("downloads"); }}
          onClose={dismissSignIn} />
        <YouTubeAuthModal visible={authModalVisible} onClose={closeAuth} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bootContainer: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 60,
  },
  bootCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bootGlyphBox: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  bootRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NothingColors.red,
    marginRight: 10,
    shadowColor: NothingColors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  bootSub: {
    marginTop: 8,
    letterSpacing: 2,
  },
  bootFooter: {
    alignItems: "center",
    justifyContent: "center",
  },
  bootCredit: {
    letterSpacing: 1.5,
  },
  screenContainer: {
    flex: 1,
  },
  tabContentWrapper: {
    flex: 1,
  },
});

