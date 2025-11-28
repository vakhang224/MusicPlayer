// src/components/PlaylistTrackList.tsx
import { fontSize } from "@/constants/token";
import { generateSongListId } from "@/helpers/timeHandle";
import { trackTitleFilter } from "@/helpers/trackPlayerFilter";
import { Playlist } from "@/helpers/type";
import { navigationSearch } from "@/hooks/navigationSearch";
import { defaultStyles } from "@/styles";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { TracksList } from "./TracksList";
import { QueueControl } from "./QueueControl";
import { unknownTracksImageUri } from "@/constants/images";

interface PlaylistTrackListProps {
  playlist: Playlist;
}

export const PlaylistTrackList = ({ playlist }: PlaylistTrackListProps) => {
  const { search } = navigationSearch({});

  const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];

  const filteredTracks = useMemo(() => tracks.filter(trackTitleFilter(search)), [tracks, search]);

  // Ảnh cover: ưu tiên ảnh bài đầu tiên, rồi tới artworkPreview, cuối cùng là fallback
  const cover = tracks[0]?.artwork || (playlist as any).artworkPreview || unknownTracksImageUri;

  return (
    <>
      <View style={styles.playlistHeaderContainer}>
        <View style={styles.artworkImageContainer}>
          <Image source={{ uri: cover }} style={styles.artworkImage} resizeMode="cover" />
        </View>

        <Text numberOfLines={1} style={styles.playlistNameText}>
          {playlist.name}
        </Text>

        {search.length === 0 && tracks.length > 0 && (
          <QueueControl style={{ paddingTop: 24 }} track={tracks} />
        )}
      </View>

      <TracksList
        id={generateSongListId(playlist.name, search)}
        tracks={filteredTracks}
        scrollEnabled={false}
        hideQueueControls={true}
        playlistId={playlist.id} // 🔹 Truyền playlistId xuống TracksList
      />
    </>
  );
};

const styles = StyleSheet.create({
  playlistHeaderContainer: {
    flex: 1,
    marginBottom: 32,
  },
  artworkImageContainer: {
    flexDirection: "row",
    justifyContent: "center",
    height: 300,
  },
  artworkImage: {
    width: "85%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 12,
  },
  playlistNameText: {
    ...defaultStyles.text,
    marginTop: 22,
    textAlign: "center",
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
});
