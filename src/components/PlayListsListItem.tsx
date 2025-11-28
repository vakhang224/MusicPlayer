import { Playlist } from "@/helpers/type"
import { defaultStyles } from "@/styles"
import React from "react"
import {
  Image,
  StyleSheet,
  Text,
  TouchableHighlight,
  TouchableHighlightProps,
  View,
} from "react-native"
import { AntDesign } from "@expo/vector-icons"
import { colors } from "@/constants/token"
import { unknownTracksImageUri } from "@/constants/images"

type PlaylistsListItemProps = {
  playlist: Playlist
} & TouchableHighlightProps

export const PlaylistsListItem = ({
  playlist,
  ...props
}: PlaylistsListItemProps) => {
  const artworkUri =
    playlist?.cover && playlist.cover.trim() !== ""
      ? playlist.cover
      : unknownTracksImageUri

  return (
    <TouchableHighlight activeOpacity={0.8} {...props}>
      <View style={styles.playlistItemContainer}>
        <Image
          source={{ uri: artworkUri }}
          style={styles.playlistArtworkImage}
        />

        <View style={styles.playlistInfoContainer}>
          <Text numberOfLines={1} style={styles.playlistNameText}>
            {playlist.name}
          </Text>
          <AntDesign
            name="right"
            size={16}
            color={colors.icon}
            style={{ opacity: 0.5 }}
          />
        </View>
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create({
  playlistItemContainer: {
    flexDirection: "row",
    columnGap: 14,
    alignItems: "center",
    paddingRight: 90,
  },
  playlistArtworkImage: {
    borderRadius: 8,
    width: 70,
    height: 70,
  },
  playlistInfoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  playlistNameText: {
    ...defaultStyles.text,
    fontSize: 17,
    fontWeight: "600",
    maxWidth: "80%",
  },
})
