import React from "react";
import { Alert, Modal, View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import * as WebBrowser from "expo-web-browser";
import CookieManager from "@react-native-cookies/cookies";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeStore } from "../../store/useThemeStore";
import { useAuthStore } from "../../store/useAuthStore";
import { NothingText } from "../common/NothingText";
import { NothingCard } from "../common/NothingCard";
import { NothingColors, NothingLayout } from "../../constants/theme";

interface YouTubeAuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const YouTubeAuthModal: React.FC<YouTubeAuthModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useThemeStore();
  const setYoutubeCookie = useAuthStore((s) => s.setYoutubeCookie);

  const handleBrowserLogin = async () => {
    try {
      Haptics.selectionAsync();

      // Open the trusted system browser for Google Auth
      await WebBrowser.openBrowserAsync("https://accounts.google.com/ServiceLogin?service=youtube", {
        toolbarColor: colors.background,
        enableDefaultShareMenuItem: false,
        showInRecents: true,
      });

      // The user manually closes the browser when done.
      // After it closes, we extract the cookies that Chrome/Safari just saved for youtube.com
      const cookies = await CookieManager.get("https://youtube.com", true); // true = use WebKit/Chrome shared cookies if possible

      if (cookies) {
        const cookieParts = Object.keys(cookies).map((key) => `${key}=${cookies[key].value}`);
        const cookieString = cookieParts.join("; ");

        if (cookieString.includes("SID=") && cookieString.includes("HSID=")) {
          setYoutubeCookie(cookieString);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onClose();
          return;
        }
      }

      // If we reach here, we didn't find the necessary cookies.
      Alert.alert(
        "LOGIN INCOMPLETE",
        "Could not detect a successful YouTube login. Please try again and make sure you sign in completely before closing the browser."
      );

    } catch (error) {
      console.error("Failed to launch auth browser:", error);
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
              LOGIN TO BYPASS RATE LIMITS
            </NothingText>
          </View>
        </View>

        <View style={styles.content}>
          <NothingCard style={styles.card} accent>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark-outline" size={48} color={NothingColors.red} />
            </View>

            <NothingText variant="dot" size={16} color="white" style={[styles.title, { color: isDark ? "#FFFFFF" : "#111111" }]}>
              SECURE BROWSER LOGIN
            </NothingText>

            <NothingText variant="mono" color="dim" size={12} style={styles.description}>
              TO PROTECT YOUR ACCOUNT, GOOGLE REQUIRES YOU TO LOG IN USING YOUR DEVICE'S SECURE SYSTEM BROWSER.
            </NothingText>

            <NothingText variant="mono" color="dim" size={12} style={styles.description}>
              TAP THE BUTTON BELOW. ONCE YOU ARE FULLY SIGNED INTO YOUTUBE, CLOSE THE BROWSER MANUALLY BY TAPPING THE 'X' AT THE TOP.
            </NothingText>

            <TouchableOpacity style={styles.button} onPress={handleBrowserLogin}>
              <NothingText variant="dot" size={14} color="white" style={styles.buttonText}>
                OPEN SECURE BROWSER
              </NothingText>
            </TouchableOpacity>
          </NothingCard>
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
  content: {
    flex: 1,
    padding: NothingLayout.screenPadding,
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    padding: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
  button: {
    backgroundColor: NothingColors.red,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  buttonText: {
    letterSpacing: 1.5,
  },
});
