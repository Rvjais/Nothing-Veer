import React from "react";
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { NothingLayout } from "../../constants/theme";
import { useThemeStore } from "../../store/useThemeStore";

export interface NothingCardProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accent?: boolean;
  bordered?: boolean;
  glass?: boolean;
  padding?: number;
}

export const NothingCard: React.FC<NothingCardProps> = ({
  children,
  style,
  onPress,
  accent = false,
  bordered = true,
  glass = false,
  padding = 16,
}) => {
  const { colors, isDark } = useThemeStore();

  const content = (
    <>
      {glass && (
        <BlurView
          intensity={40}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      {accent && (
        <View
          style={[
            styles.accentDot,
            { backgroundColor: colors.red },
          ]}
        />
      )}
      {children}
    </>
  );

  const cardStyle = [
    styles.card,
    {
      backgroundColor: glass ? colors.glassBackground : colors.surfaceLow,
      borderColor: accent ? colors.red : colors.borderSubtle,
      borderWidth: bordered ? 1 : 0,
      padding,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={cardStyle}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: NothingLayout.radiusLg,
    overflow: "hidden",
    position: "relative",
  },
  accentDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
