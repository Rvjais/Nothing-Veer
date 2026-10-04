import React from "react";
import { Text, TextProps, TextStyle } from "react-native";
import { NothingFonts } from "../../constants/theme";
import { useThemeStore } from "../../store/useThemeStore";

export interface NothingTextProps extends TextProps {
  variant?: "dot" | "headline" | "subhead" | "body" | "bodyMedium" | "mono" | "regular";
  color?: "white" | "dim" | "grey" | "red" | "muted";
  size?: number;
  weight?: TextStyle["fontWeight"];
  uppercase?: boolean;
}

export const NothingText: React.FC<NothingTextProps> = ({
  children,
  variant = "body",
  color = "white",
  size,
  style,
  uppercase,
  ...props
}) => {
  const { colors } = useThemeStore();
  let fontFamily = NothingFonts.body;
  let defaultSize = 14;
  let letterSpacing = 0;

  switch (variant) {
    case "dot":
      fontFamily = NothingFonts.dot;
      defaultSize = 16;
      letterSpacing = 1.2;
      break;
    case "headline":
      fontFamily = NothingFonts.headline;
      defaultSize = 22;
      letterSpacing = 0.5;
      break;
    case "subhead":
    case "regular":
      fontFamily = NothingFonts.regular;
      defaultSize = 16;
      letterSpacing = 0.2;
      break;
    case "bodyMedium":
      fontFamily = NothingFonts.bodyMedium;
      defaultSize = 14;
      break;
    case "mono":
      fontFamily = NothingFonts.mono;
      defaultSize = 13;
      letterSpacing = 0.5;
      break;
    case "body":
    default:
      fontFamily = NothingFonts.body;
      defaultSize = 14;
      break;
  }

  let textColor = colors.white;
  switch (color) {
    case "dim":
      textColor = colors.whiteDim;
      break;
    case "grey":
      textColor = colors.grey;
      break;
    case "red":
      textColor = colors.red;
      break;
    case "muted":
      textColor = colors.greyDark;
      break;
    case "white":
    default:
      textColor = colors.white;
      break;
  }

  const finalContent =
    uppercase || variant === "dot"
      ? typeof children === "string"
        ? children.toUpperCase()
        : children
      : children;

  return (
    <Text
      style={[
        {
          fontFamily,
          fontSize: size || defaultSize,
          color: textColor,
          letterSpacing,
        },
        style,
      ]}
      {...props}
    >
      {finalContent}
    </Text>
  );
};
