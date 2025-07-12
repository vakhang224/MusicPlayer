import React from "react";
import { TextInput, StyleSheet, View } from "react-native";
import { colors } from "@/constants/token";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export const SearchBar = ({ value, onChangeText, placeholder }: Props) => {
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Search..."}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  input: {
    height: 40,
    backgroundColor: colors.searchBarBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
  },
});
