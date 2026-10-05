import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutChangeEvent,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "../../services/haptics";
import { NothingLayout } from "../../constants/theme";
import { NothingText } from "../common/NothingText";
import { useThemeStore } from "../../store/useThemeStore";

export type TabName = "home" | "search" | "library" | "downloads" | "settings";

export interface NothingTabBarProps {
  currentTab: TabName;
  onSelectTab: (tab: TabName) => void;
}

type TabDefinition = { name: TabName; label: string; icon: keyof typeof Ionicons.glyphMap };

const INITIAL_TABS: TabDefinition[] = [
  { name: "home", label: "HOME", icon: "home-outline" },
  { name: "search", label: "SEARCH", icon: "search-outline" },
  { name: "library", label: "LIBRARY", icon: "library-outline" },
  { name: "downloads", label: "DOWNLOADS", icon: "cloud-download-outline" },
  { name: "settings", label: "SETTINGS", icon: "settings-outline" },
];

const ACTIVE_FLEX = 1.85;
const HORIZONTAL_PADDING = 6;
const DRAG_THRESHOLD = 10;

export const NothingTabBar: React.FC<NothingTabBarProps> = ({ currentTab, onSelectTab }) => {
  const { colors, isDark } = useThemeStore();
  const tabs = INITIAL_TABS;
  const [containerWidth, setContainerWidth] = useState(0);
  const widthRef = useRef(containerWidth);
  widthRef.current = containerWidth;
  const onSelectTabRef = useRef(onSelectTab);
  onSelectTabRef.current = onSelectTab;
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.name === currentTab));
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const layoutByTabRef = useRef<Partial<Record<TabName, { center: number }>>>({});
  const dragValuesRef = useRef<Record<TabName, { x: Animated.Value; scale: Animated.Value }>>({
    home: { x: new Animated.Value(0), scale: new Animated.Value(1) },
    search: { x: new Animated.Value(0), scale: new Animated.Value(1) },
    library: { x: new Animated.Value(0), scale: new Animated.Value(1) },
    downloads: { x: new Animated.Value(0), scale: new Animated.Value(1) },
    settings: { x: new Animated.Value(0), scale: new Animated.Value(1) },
  });
  const draggedTabRef = useRef<TabName | null>(null);
  const dragDidMoveRef = useRef(false);

  const availableWidth = Math.max(0, containerWidth - HORIZONTAL_PADDING * 2);
  const unitWidth = availableWidth / (tabs.length + ACTIVE_FLEX - 1);
  const activeWidth = unitWidth * ACTIVE_FLEX;

  useEffect(() => {
    if (containerWidth <= 0) return;
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeIndex * unitWidth,
        useNativeDriver: false,
        tension: 68,
        friction: 8,
      }),
      Animated.spring(indicatorWidth, {
        toValue: activeWidth,
        useNativeDriver: false,
        tension: 78,
        friction: 10,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.94, duration: 85, useNativeDriver: false }),
        Animated.spring(scaleAnim, { toValue: 1.04, friction: 5, tension: 150, useNativeDriver: false }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 130, useNativeDriver: false }),
      ]),
    ]).start();
  }, [activeIndex, activeWidth, containerWidth, indicatorWidth, scaleAnim, slideAnim, unitWidth]);

  const handlePress = (tab: TabName) => {
    if (dragDidMoveRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    
    onSelectTab(tab);
  };

  const pillPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dx) > DRAG_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > DRAG_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        dragDidMoveRef.current = true;
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
        Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: false }).start();
      },
      onPanResponderMove: (_, gesture) => {
        const nextUnitWidth = Math.max(1, widthRef.current - HORIZONTAL_PADDING * 2) / (tabs.length + ACTIVE_FLEX - 1);
        let newX = activeIndexRef.current * nextUnitWidth + gesture.dx;
        newX = Math.max(0, Math.min(newX, (tabs.length - 1) * nextUnitWidth));
        slideAnim.setValue(newX);
      },
      onPanResponderRelease: (_, gesture) => {
        const nextUnitWidth = Math.max(1, widthRef.current - HORIZONTAL_PADDING * 2) / (tabs.length + ACTIVE_FLEX - 1);
        let newX = activeIndexRef.current * nextUnitWidth + gesture.dx;
        newX = Math.max(0, Math.min(newX, (tabs.length - 1) * nextUnitWidth));
        const nearestIndex = Math.round(newX / nextUnitWidth);
        const nextTab = tabs[nearestIndex].name;
        
        if (nextTab !== tabs[activeIndexRef.current].name) {
          try { Haptics.selectionAsync(); } catch {}
          onSelectTabRef.current(nextTab);
        } else {
          // Snap back
          Animated.spring(slideAnim, {
            toValue: activeIndexRef.current * nextUnitWidth,
            useNativeDriver: false,
            tension: 68,
            friction: 8,
          }).start();
        }
        
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false }).start();
        setTimeout(() => { dragDidMoveRef.current = false; }, 120);
      },
      onPanResponderTerminate: () => {
        const nextUnitWidth = Math.max(1, widthRef.current - HORIZONTAL_PADDING * 2) / (tabs.length + ACTIVE_FLEX - 1);
        Animated.spring(slideAnim, {
          toValue: activeIndexRef.current * nextUnitWidth,
          useNativeDriver: false,
          tension: 68,
          friction: 8,
        }).start();
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false }).start();
        setTimeout(() => { dragDidMoveRef.current = false; }, 120);
      }
    })
  ).current;

  const onLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
      const nextUnitWidth = (width - HORIZONTAL_PADDING * 2) / (tabs.length + ACTIVE_FLEX - 1);
      slideAnim.setValue(activeIndexRef.current * nextUnitWidth);
      indicatorWidth.setValue(nextUnitWidth * ACTIVE_FLEX);
    }
  };

  return (
    <View style={styles.container}>
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
          pointerEvents="none"
          intensity={65}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />

        {unitWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingIndicator,
              {
                width: indicatorWidth,
                left: HORIZONTAL_PADDING,
                transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
                backgroundColor: isDark ? "rgba(255, 255, 255, 0.16)" : "rgba(0, 0, 0, 0.08)",
                borderColor: isDark ? "rgba(255, 255, 255, 0.22)" : "rgba(0, 0, 0, 0.12)",
              },
            ]}
          >
            <View
              style={[
                styles.specularHighlight,
                { backgroundColor: isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.8)" },
              ]}
            />
          </Animated.View>
        )}

        <View style={styles.tabButtonsRow} {...pillPanResponder.panHandlers}>
          {tabs.map((tab) => {
            const isActive = currentTab === tab.name;
            const iconName = isActive ? (tab.icon.replace("-outline", "") as keyof typeof Ionicons.glyphMap) : tab.icon;
            const dragValues = dragValuesRef.current[tab.name];

            return (
              <Animated.View
                key={tab.name}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  layoutByTabRef.current[tab.name] = { center: x + width / 2 };
                }}
                style={{
                  flex: isActive ? ACTIVE_FLEX : 1,
                  height: "100%",
                  transform: [{ translateX: dragValues.x }, { scale: dragValues.scale }],
                  zIndex: draggedTabRef.current === tab.name ? 5 : 1,
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handlePress(tab.name)}
                  style={styles.tabBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`${tab.label} tab${isActive ? ", selected" : ""}. Swipe to switch tabs.`}
                  accessibilityState={{ selected: isActive }}
                >
                  <View style={styles.iconLabelGroup}>
                    <Ionicons name={iconName} size={19} color={isActive ? colors.white : colors.grey} />
                    {isActive && (
                      <NothingText
                        variant="dot"
                        size={10}
                        color="white"
                        style={[styles.label, { color: colors.white }]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </NothingText>
                    )}
                  </View>
                </TouchableOpacity>
              </Animated.View>
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
    paddingHorizontal: HORIZONTAL_PADDING,
    height: "100%",
  },
  tabBtn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  label: {
    letterSpacing: 0.55,
  },
});



