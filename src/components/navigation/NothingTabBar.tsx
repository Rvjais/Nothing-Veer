import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutChangeEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { NothingLayout } from "../../constants/theme";
import { NothingText } from "../common/NothingText";
import { useThemeStore } from "../../store/useThemeStore";

export type TabName = "home" | "search" | "library" | "settings";

export interface NothingTabBarProps {
  currentTab: TabName;
  onSelectTab: (tab: TabName) => void;
}

const TABS: { name: TabName; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: "home", label: "HOME", icon: "home-outline" },
  { name: "search", label: "SEARCH", icon: "search-outline" },
  { name: "library", label: "LIBRARY", icon: "library-outline" },
  { name: "settings", label: "SETTINGS", icon: "settings-outline" },
];

export const NothingTabBar: React.FC<NothingTabBarProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { colors, isDark } = useThemeStore();
  const [containerWidth, setContainerWidth] = useState(0);

  const activeIndex = TABS.findIndex((t) => t.name === currentTab);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const paddingHorizontal = 6;
  const availableWidth = containerWidth > 0 ? containerWidth - paddingHorizontal * 2 : 0;
  const tabWidth = availableWidth > 0 ? availableWidth / TABS.length : 0;

  useEffect(() => {
    if (tabWidth > 0) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: activeIndex * tabWidth,
          useNativeDriver: true,
          tension: 68,
          friction: 8,
        }),
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.95,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }
  }, [activeIndex, tabWidth, slideAnim, scaleAnim]);

  const handlePress = (tab: TabName) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onSelectTab(tab);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      slideAnim.setValue(activeIndex * ((width - paddingHorizontal * 2) / TABS.length));
    }
  };

  return (
    <View style={styles.container}>
      {/* Outer Liquid Glass Capsule */}
      <View
        onLayout={onLayout}
        style={[
          styles.capsuleWrapper,
          {
            backgroundColor: isDark ? "rgba(18, 18, 18, 0.72)" : "rgba(240, 240, 244, 0.82)",
            borderColor: colors.glassBorder,
          },
        ]}
      >
        <BlurView
          intensity={65}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />

        {/* Apple Fluid Sliding Pill Indicator */}
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                width: tabWidth,
                left: paddingHorizontal,
                transform: [
                  { translateX: slideAnim },
                  { scale: scaleAnim },
                ],
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.16)"
                  : "rgba(0, 0, 0, 0.08)",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.22)"
                  : "rgba(0, 0, 0, 0.12)",
              },
            ]}
          >
            {/* Subtle specular top highlight */}
            <View
              style={[
                styles.specularHighlight,
                {
                  backgroundColor: isDark
                    ? "rgba(255, 255, 255, 0.35)"
                    : "rgba(255, 255, 255, 0.8)",
                },
              ]}
            />
          </Animated.View>
        )}

        {/* Tab Buttons */}
        <View style={styles.tabButtonsRow}>
          {TABS.map((t) => {
            const isActive = currentTab === t.name;
            const iconName = isActive
              ? (t.icon.replace("-outline", "") as any)
              : t.icon;

            return (
              <TouchableOpacity
                key={t.name}
                activeOpacity={0.7}
                onPress={() => handlePress(t.name)}
                style={styles.tabBtn}
              >
                <View style={styles.iconLabelGroup}>
                  <Ionicons
                    name={iconName}
                    size={19}
                    color={isActive ? (isDark ? "#FFFFFF" : "#000000") : colors.grey}
                  />
                  {isActive && (
                    <NothingText
                      variant="dot"
                      size={10.5}
                      color={isDark ? "white" : "white"}
                      style={[
                        styles.label,
                        { color: isDark ? "#FFFFFF" : "#111111" },
                      ]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </NothingText>
                  )}
                </View>

                {/* Nothing OS Iconic Red Indicator */}
                {isActive && (
                  <View
                    style={[
                      styles.activeDot,
                      {
                        backgroundColor: colors.red,
                        shadowColor: colors.red,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 4,
    backgroundColor: "transparent",
  },
  capsuleWrapper: {
    height: 58,
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1.2,
    overflow: "hidden",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  slidingIndicator: {
    position: "absolute",
    top: 5,
    bottom: 5,
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1,
    overflow: "hidden",
  },
  specularHighlight: {
    position: "absolute",
    top: 0,
    left: "15%",
    right: "15%",
    height: 1,
    borderRadius: 1,
  },
  tabButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    height: "100%",
  },
  tabBtn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  label: {
    letterSpacing: 0.8,
  },
  activeDot: {
    position: "absolute",
    bottom: 4,
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
});
