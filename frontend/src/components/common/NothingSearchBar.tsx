import React from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NothingColors, NothingFonts, NothingLayout } from "../../constants/theme";
import { useThemeStore } from "../../store/useThemeStore";

export interface NothingSearchBarProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  onSubmit?: () => void;
}

export const NothingSearchBar: React.FC<NothingSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  onSubmit,
  style: inputStyle,
  placeholder = "SEARCH SONGS, ARTISTS, ALBUMS...",
  ...props
}) => {
  const { colors } = useThemeStore();
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceLow, borderColor: colors.borderSubtle }]}>
      <Ionicons
        name="search"
        size={18}
        color={colors.grey}
        style={styles.icon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.grey}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        style={[styles.input, { color: colors.white }, inputStyle]}
        {...props}
      />
      {value.length > 0 && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            onChangeText("");
            onClear?.();
          }}
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={18} color={colors.grey} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NothingColors.surfaceLow,
    borderRadius: NothingLayout.radiusPill,
    borderWidth: 1,
    borderColor: NothingColors.borderSubtle,
    paddingHorizontal: 16,
    height: 52,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: NothingFonts.body,
    fontSize: 14,
    color: NothingColors.white,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
});
