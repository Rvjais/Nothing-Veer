import React, { useState } from "react";
import { Modal, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView, WebViewNavigation } from "react-native-webview";
import CookieManager from "@react-native-cookies/cookies";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

  // Memoize the source object so that re-renders (like when the keyboard opens)
  // do not cause the WebView to reload the page!
  const webViewSource = React.useMemo(() => ({ uri: "https://m.youtube.com" }), []);

  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    // Whenever the URL changes, aggressively check if we have received the SID and HSID cookies.
    try {
      const cookies = await CookieManager.get("https://youtube.com");
      if (cookies && cookies.SID && cookies.HSID) {
        const cookieParts = Object.keys(cookies).map((key) => `${key}=${cookies[key].value}`);
        const cookieString = cookieParts.join("; ");

        setYoutubeCookie(cookieString);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      }
    } catch (error) {
      console.error("Failed to read YouTube cookies:", error);
    }
  };

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
              TAP THE PROFILE ICON TO SIGN IN
            </NothingText>
          </View>
        </View>

        <View style={styles.webviewContainer}>
          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={NothingColors.red} />
              <NothingText variant="mono" color="dim" size={12} style={{ marginTop: 16 }}>
                LOADING YOUTUBE...
              </NothingText>
            </View>
          )}
          {/* We point to m.youtube.com instead of accounts.google.com to bypass Google's WebView blocking */}
          <WebView
            source={webViewSource}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadEnd={() => setLoading(false)}
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
          />
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