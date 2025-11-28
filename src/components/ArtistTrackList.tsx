// src/components/ArtistTrackList.tsx
import { trackTitleFilter } from "@/helpers/trackPlayerFilter";
import { Artist } from "@/helpers/type";
import { navigationSearch } from "@/hooks/navigationSearch";
import React, { useMemo } from "react";
import { TracksList } from "./TracksList";
import { generateSongListId } from "@/helpers/timeHandle";
import { Image, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { unknownArtistImageUri } from "@/constants/images";
import { defaultStyles } from "@/styles";
import { fontSize } from "@/constants/token";
import { QueueControl } from "./QueueControl";
import { getBaseUrl } from "@/services/baseUrlManager";

type Props = {
  artist: Artist & { tracks?: any[] };
  // tracks prop có thể là undefined (chưa load) hoặc [] (đã load rỗng) hoặc array
  tracks?: any[] | undefined;
  loading?: boolean;
};

export const ArtistTrackList: React.FC<Props> = ({ artist, tracks: propTracks, loading = false }) => {
  const { search } = navigationSearch({});
  const baseUrl = getBaseUrl();

  // Nếu parent truyền propTracks (kể cả []), dùng nó.
  // Chỉ fallback sang artist.tracks khi propTracks === undefined
  const items = useMemo(() => {
    const source =
      propTracks !== undefined
        ? propTracks
        : Array.isArray(artist?.tracks)
        ? artist.tracks
        : [];
    return source.filter(trackTitleFilter(search));
  }, [propTracks, artist?.tracks, search]);

  const artistImageUri =
    artist?.avatar
      ? artist.avatar.startsWith("http")
        ? artist.avatar
        : `${baseUrl}/${artist.avatar.replace(/^\/+/, "")}`
      : unknownArtistImageUri;

  return (
    <>
      <View style={styles.artistHeaderContainer}>
        <View style={styles.artworkImageContainer}>
          <Image
            source={{ uri: artistImageUri }}
            style={styles.artistImage}
            onError={(e) => {
              console.warn("⚠️ Lỗi tải avatar artist:", e.nativeEvent.error);
            }}
          />
        </View>

        <Text numberOfLines={1} style={styles.artistNameText}>
          {artist.name}
        </Text>

        {search.length === 0 && <QueueControl track={items} style={{ paddingTop: 24 }} />}
      </View>

      {loading ? (
        <View style={{ padding: 20, alignItems: "center" }}>
          <ActivityIndicator />
        </View>
      ) : (
        <TracksList id={generateSongListId(artist.name, search)} hideQueueControls={true} tracks={items} />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  artistHeaderContainer: {
    flex: 1,
    marginBottom: 32,
  },
  artworkImageContainer: {
    flexDirection: "row",
    justifyContent: "center",
    height: 200,
  },
  artistImage: {
    width: "65%",
    height: "100%",
    resizeMode: "cover",
    borderRadius: 128,
  },
  artistNameText: {
    ...defaultStyles.text,
    marginTop: 22,
    textAlign: "center",
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
});
