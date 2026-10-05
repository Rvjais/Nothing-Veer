import React from "react";
import { Modal, View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NothingText } from "../common/NothingText";
import { useThemeStore } from "../../store/useThemeStore";

export function YouTubeAccessPrompt({ visible, signedIn, onConnect, onOffline, onClose }: { visible: boolean; signedIn: boolean; onConnect: () => void; onOffline: () => void; onClose: () => void }) {
  const colors = useThemeStore(state => state.colors);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.overlay}><View style={[styles.card, { backgroundColor: colors.surfaceLowest, borderColor: colors.borderLight }]}>
      <View style={[styles.icon, { backgroundColor: colors.redGlow }]}><Ionicons name="logo-youtube" size={32} color={colors.red} /></View>
      <NothingText variant="mono" size={10} color="red" style={styles.eyebrow}>KEEP THE MUSIC GOING</NothingText>
      <NothingText variant="headline" size={28} style={styles.title}>{signedIn ? "Refresh your connection" : "Connect to YouTube"}</NothingText>
      <NothingText size={14} color="grey" style={styles.body}>YouTube has paused online playback. {signedIn ? "Update your YouTube session to try again." : "Sign in or create an account to try again."} Your downloads and completed cached songs still work offline.</NothingText>
      <TouchableOpacity onPress={onConnect} accessibilityRole="button" style={[styles.primary, { backgroundColor: colors.red }]}><NothingText variant="bodyMedium" style={{ color: "#FFFFFF" }}>{signedIn ? "Open YouTube" : "Sign in / Sign up"}</NothingText><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></TouchableOpacity>
      <TouchableOpacity onPress={onOffline} accessibilityRole="button" style={[styles.secondary, { borderColor: colors.borderLight }]}><Ionicons name="cloud-done-outline" size={19} color={colors.white} /><NothingText>Play saved music</NothingText></TouchableOpacity>
      <TouchableOpacity onPress={onClose} accessibilityRole="button" style={styles.dismiss}><NothingText size={12} color="grey">Maybe later</NothingText></TouchableOpacity>
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 }, card: { borderRadius: 28, borderWidth: 1, padding: 24, maxWidth: 440, width: "100%", alignSelf: "center" }, icon: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 24 }, eyebrow: { letterSpacing: 1.2, marginBottom: 10 }, title: { letterSpacing: -0.5 }, body: { lineHeight: 22, marginTop: 12, marginBottom: 24 }, primary: { flexDirection: "row", gap: 10, justifyContent: "center", alignItems: "center", height: 52, borderRadius: 26 }, secondary: { marginTop: 10, flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", height: 50, borderRadius: 25, borderWidth: 1 }, dismiss: { alignItems: "center", paddingTop: 18, paddingBottom: 2 },
});
