import { unknownTracksImageUri } from "@/constants/images";
import { colors, fontSize } from "@/constants/token";
import { defaultStyles } from "@/styles";
import { Entypo, Ionicons } from "@expo/vector-icons";
import React, { Suspense } from "react";
import { Image, StyleSheet, Text, TouchableHighlight, View } from "react-native";
import { Track, useActiveTrack, useIsPlaying } from "react-native-track-player";
import { TrackShortcutMenu } from "./TrackShortcutMenu";
import { Unduplicated } from "./Unduplicated";

// Dynamic import ESM module
const LoaderKit = React.lazy(() => import("react-native-loader-kit"));

export type Props = {
  tracks: Track;
  onTrackSelected: (tracks: Track) => void;
};

export const TracksListItem = ({ tracks, onTrackSelected: handleTrackSelect }: Props) => {
  const { playing } = useIsPlaying();
  const isActiveTrack = useActiveTrack()?.url === tracks.url;

  return (
    <TouchableHighlight onPress={() => handleTrackSelect(tracks)}>
      <View style={styles.trackItemContainer}>
        <View>
          <Image
            source={{
              uri: tracks.artwork ?? unknownTracksImageUri,
            }}
            style={{
              ...styles.trackArtworkImage,
              opacity: isActiveTrack ? 0.6 : 1,
            }}
          />

          {isActiveTrack &&
            (playing ? (
              <Suspense fallback={<View style={styles.trackPlayingIcon} />}>
                <LoaderKit
                  style={styles.trackPlayingIcon}
                  name="LineScaleParty"
                  color={colors.icon}
                />
              </Suspense>
            ) : (
              <Ionicons
                style={styles.trackPlayingIcon}
                name="play"
                size={18}
                color={colors.icon}
              />
            ))}
        </View>
        <View style={styles.trackMenu}>
          <View style={{ width: "100%" }}>
            <Text
              numberOfLines={1}
              style={{
                ...styles.trackTitleText,
                color: isActiveTrack ? colors.primary : colors.text,
              }}
            >
              {tracks.title}
            </Text>
            {tracks.artist && (
              <Text numberOfLines={1} style={styles.trackArtistText}>
                {tracks.artist}
              </Text>
            )}
          </View>
          <Unduplicated>
          <TrackShortcutMenu track={tracks}>
          <Entypo name="dots-three-horizontal" size={18} color={colors.icon} />
          </TrackShortcutMenu>
          </Unduplicated>
        </View>
      </View>
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  trackArtworkImage: {
    borderRadius: 8,
    width: 50,
    height: 50,
  },
  trackTitleText: {
    ...defaultStyles.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
    maxWidth: "90%",
  },
  trackArtistText: {
    ...defaultStyles.text,
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  trackItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 20,
    columnGap: 12,
  },
  trackMenu: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackPlayingIcon: {
    position: "absolute",
    top: 18,
    left: 18,
    right: 16,
    height: 16,
  },
});
