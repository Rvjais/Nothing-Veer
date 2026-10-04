import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { NothingColors, NothingLayout } from "../../constants/theme";
import { NothingText } from "./NothingText";

export interface NothingButtonProps {
  title?: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "circle" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const NothingButton: React.FC<NothingButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  loading = false,
  style,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  const isCircle = variant === "circle";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || loading}
      onPress={handlePress}
      style={[
        styles.base,
        styles[variant],
        styles[size],
        isCircle && styles[`circle_${size}` as keyof typeof styles],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? NothingColors.white : NothingColors.red}
        />
      ) : (
        <>
          {icon}
          {title && (
            <NothingText
              variant="dot"
              color={variant === "primary" ? "white" : "white"}
              size={size === "sm" ? 12 : size === "lg" ? 16 : 14}
              style={[icon ? { marginLeft: 8 } : null]}
            >
              {title}
            </NothingText>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: NothingLayout.radiusPill,
  },
  primary: {
    backgroundColor: NothingColors.red,
  },
  secondary: {
    backgroundColor: NothingColors.surfaceHigh,
    borderWidth: 1,
    borderColor: NothingColors.borderSubtle,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: NothingColors.whiteDim,
  },
  circle: {
    backgroundColor: NothingColors.surfaceHigh,
    borderRadius: 999,
    paddingHorizontal: 0,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  sm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  md: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  lg: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  circle_sm: {
    width: 36,
    height: 36,
  },
  circle_md: {
    width: 48,
    height: 48,
  },
  circle_lg: {
    width: 64,
    height: 64,
  },
  disabled: {
    opacity: 0.4,
  },
});

