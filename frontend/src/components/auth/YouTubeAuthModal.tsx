import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { readYouTubeSession } from "../../services/youtubeSession";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "../../services/haptics";
import { useThemeStore } from "../../store/useThemeStore";
import { useAuthStore } from "../../store/useAuthStore";
import { NothingText } from "../common/NothingText";
import { NothingColors, NothingLayout } from "../../constants/theme";

interface YouTubeAuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const YouTubeAuthModal: React.FC<YouTubeAuthModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useThemeStore();
  const setYoutubeCookie = useAuthStore((s) => s.setYoutubeCookie);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const checking = useRef(false);
  const active = useRef(visible);
  active.current = visible;
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Memoize the source object so that re-renders (like when the keyboard opens)
  // do not cause the WebView to reload the page!
  const webViewSource = React.useMemo(() => ({ uri: "https://m.youtube.com" }), []);

  const checkSession = useCallback(async (): Promise<void> => {
    if (!active.current || checking.current) return;
    checking.current = true;
    try {
      const cookieString = await readYouTubeSession();
      if (cookieString && active.current) {
        active.current = false;
        setYoutubeCookie(cookieString);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        closeRef.current();
      }
    } catch {
      if (active.current) setSessionError("Unable to read the YouTube session. Close and try again.");
    } finally {
      checking.current = false;
    }
  }, [setYoutubeCookie]);

  useEffect(() => {
    if (!visible) return;
    active.current = true;
    setLoading(true);
    setSessionError(null);
    void checkSession();
    // YouTube uses client-side navigation; not every login updates the URL.
    const timer = setInterval(() => void checkSession(), 1500);
    return () => { active.current = false; clearInterval(timer); };
  }, [visible, checkSession]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={isDark ? "#FFFFFF" : "#111111"} />
          </TouchableOpacity>
          <View>
            <NothingText variant="dot" size={18} color="white" style={{ color: isDark ? "#FFFFFF" : "#111111" }}>
              YOUTUBE AUTH
            </NothingText>
            <NothingText variant="mono" color="dim" size={10} style={{ letterSpacing: 1.2 }}>
              SIGN IN OR CREATE AN ACCOUNT ON YOUTUBE
            </NothingText>
          </View>
        </View>

        <View style={styles.webviewContainer}>
          {sessionError && <NothingText color="red" size={12} style={{ padding: 12 }}>{sessionError}</NothingText>}
          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={NothingColors.red} />
              <NothingText variant="mono" color="dim" size={12} style={{ marginTop: 16 }}>
                LOADING YOUTUBE...
              </NothingText>
            </View>
          )}
          {visible && <WebView
            source={webViewSource}
            onNavigationStateChange={(): void => { void checkSession(); }}
            onLoadEnd={() => { setLoading(false); void checkSession(); }}
            onError={() => { setLoading(false); setSessionError("YouTube could not load. Check your connection and try again."); }}
            userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
            incognito={false}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            domStorageEnabled={true}
            javaScriptEnabled={true}
            cacheEnabled={true}
            // Add these to prevent layout-triggered reloads
            automaticallyAdjustContentInsets={false}
            scalesPageToFit={false}
            bounces={false}
          />}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: NothingLayout.screenPadding,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  closeButton: {
    marginRight: 16,
  },
  webviewContainer: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  }
});
