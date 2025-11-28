// src/components/PlayerControl.tsx
import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type PlayerButtonProps = {
  iconSize?: number;
  onPress?: () => void;
  isPlaying?: boolean;
};

export const PlayPauseButton = ({ iconSize = 20, onPress, isPlaying }: PlayerButtonProps) => {
  // Ensure onPress is a no-arg function; TouchableOpacity in RN doesn't provide a DOM event
  return (
    <TouchableOpacity onPress={onPress} style={styles.button} activeOpacity={0.8}>
      <Ionicons name={isPlaying ? "pause" : "play"} size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
};

export const SkipToBackButton = ({ iconSize = 20, onPress }: PlayerButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button} activeOpacity={0.8}>
      <Ionicons name="play-skip-back" size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
};

export const SkipToNextButton = ({ iconSize = 20, onPress }: PlayerButtonProps) => {
  return (
    <TouchableOpacity onPress={onPress} style={styles.button} activeOpacity={0.8}>
      <Ionicons name="play-skip-forward" size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
};

// Optional container if you want to group controls
export const PlayerControl = ({ children }: { children?: React.ReactNode }) => {
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    padding: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PlayerControl;
