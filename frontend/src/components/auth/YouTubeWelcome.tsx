import React from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { NothingText } from "../common/NothingText";
import { useThemeStore } from "../../store/useThemeStore";

export function YouTubeWelcome({ onConnect, onSkip }: { onConnect: () => void; onSkip: () => void }) {
  const { colors, isDark } = useThemeStore();
  return <ScrollView contentContainerStyle={styles.page} bounces={false} showsVerticalScrollIndicator={false}>
    <View style={styles.brand}><View style={[styles.dot, { backgroundColor: colors.red }]} /><NothingText variant="dot" size={14}>NOTHING MUSIC</NothingText></View>
    <View style={styles.center}>
      <LinearGradient colors={isDark ? ["#292326", "#121214"] : ["#F5E5E5", "#FFFFFF"]} style={[styles.disc, { borderColor: colors.borderLight }]}>
        <View style={[styles.ring, { borderColor: colors.glassBorder }]}><View style={[styles.innerRing, { borderColor: colors.glassBorder }]}><View style={[styles.core, { backgroundColor: colors.red }]}><Ionicons name="logo-youtube" size={40} color="#FFFFFF" /></View></View></View>
      </LinearGradient>
      <NothingText variant="mono" size={10} color="red" style={styles.eyebrow}>YOUR MUSIC. YOUR SPACE.</NothingText>
      <NothingText variant="headline" size={42} style={styles.title}>A little connection.{"\n"}A lot of music.</NothingText>
      <NothingText size={14} color="grey" style={styles.description}>Connect your YouTube account, or start listening as a guest. You can connect whenever you’re ready.</NothingText>
      <View style={[styles.note, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}><Ionicons name="shield-checkmark-outline" size={20} color={colors.red} /><NothingText size={12} color="dim" style={{ flex: 1, lineHeight: 18 }}>Sign in on YouTube’s own page. Nothing Music never asks for your password.</NothingText></View>
    </View>
    <View style={styles.actions}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Sign in or sign up to YouTube" onPress={onConnect} style={[styles.primary, { backgroundColor: colors.red }]}><Ionicons name="logo-youtube" size={20} color="#FFFFFF" /><NothingText variant="bodyMedium" size={15} style={{ color: "#FFFFFF" }}>Sign in / Sign up</NothingText><Ionicons name="arrow-forward" size={18} color="#FFFFFF" /></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={onSkip} style={styles.skip}><NothingText size={14} color="dim">Skip for now</NothingText><Ionicons name="chevron-forward" size={16} color={colors.grey} /></TouchableOpacity>
      <NothingText size={10} color="grey" style={styles.footnote}>Guest streaming may be limited by YouTube. Saved songs stay available offline.</NothingText>
    </View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, paddingTop: 28, paddingBottom: 24 }, brand: { flexDirection: "row", alignItems: "center", gap: 8 }, dot: { width: 7, height: 7, borderRadius: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 28 }, disc: { width: 192, height: 192, borderRadius: 96, borderWidth: 1, padding: 19, alignItems: "center", justifyContent: "center", marginBottom: 26 }, ring: { width: "100%", height: "100%", borderWidth: 1, borderRadius: 90, alignItems: "center", justifyContent: "center" }, innerRing: { width: 112, height: 112, borderRadius: 56, borderWidth: 1, alignItems: "center", justifyContent: "center" }, core: { width: 74, height: 74, borderRadius: 37, alignItems: "center", justifyContent: "center" },
  eyebrow: { letterSpacing: 1.5, marginBottom: 14 }, title: { textAlign: "center", letterSpacing: -1.4, lineHeight: 46 }, description: { textAlign: "center", lineHeight: 22, marginTop: 14, maxWidth: 340 }, note: { flexDirection: "row", gap: 12, alignItems: "center", padding: 15, borderRadius: 18, borderWidth: 1, marginTop: 22 }, actions: { gap: 8 }, primary: { borderRadius: 28, minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }, skip: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }, footnote: { textAlign: "center", lineHeight: 15, paddingHorizontal: 12 },
});
