import React from "react";
import { View, StyleSheet } from "react-native";
import { NothingText } from "./NothingText";
import { useThemeStore } from "../../store/useThemeStore";

export function ScreenHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: React.ReactNode }) {
  const colors = useThemeStore(state => state.colors);
  return <View style={styles.header}>
    <View style={styles.copy}>
      {eyebrow && <View style={styles.eyebrow}><View style={[styles.dot, { backgroundColor: colors.red }]} /><NothingText variant="mono" size={10} color="grey">{eyebrow.toUpperCase()}</NothingText></View>}
      <NothingText variant="headline" size={32} style={styles.title}>{title}</NothingText>
      <NothingText size={12} color="grey" style={styles.subtitle}>{subtitle}</NothingText>
    </View>
    {action}
  </View>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22, flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1 }, eyebrow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  dot: { width: 5, height: 5, borderRadius: 3 }, title: { letterSpacing: -0.8 }, subtitle: { marginTop: 6, lineHeight: 18 },
});
