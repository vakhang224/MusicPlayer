// src/components/RecommendedTracks.tsx
import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { TrackWithPlaylist } from "@/helpers/type";
import { colors, fontSize, screenPadding } from "@/constants/token";
import { unknownTracksImageUri } from "@/constants/images";
import { useQueue } from "@/store/queue";
import { generateSongListId } from "@/helpers/timeHandle";
import { useTranslation } from "react-i18next"; // ✅ import hook i18n

type RecommendedTracksProps = {
  tracks: TrackWithPlaylist[];
};

const RecommendedTracks = ({ tracks }: RecommendedTracksProps) => {
  const { t } = useTranslation(); // ✅ hook i18n
  const { setActiveQueue, playTrack } = useQueue();

  // ✅ Lọc trùng bài hát theo id
  const uniqueTracks = Array.from(
    new Map(tracks.map((t) => [t.id, t])).values()
  );

  const handleTrackPress = (track: TrackWithPlaylist) => {
    const queueId = generateSongListId("recommendations");
    setActiveQueue(uniqueTracks, queueId);
    playTrack(track);
  };

  if (uniqueTracks.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* ✅ Dùng i18n cho tiêu đề */}
      <Text style={styles.title}>{`${t("tracks.recommended")}`}</Text>
      <FlatList
        data={uniqueTracks}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => `${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => handleTrackPress(item)}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: item.artwork ?? unknownTracksImageUri }}
              style={styles.artwork}
            />
            <Text style={styles.trackTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {item.artist}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingLeft: screenPadding.horizontal }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    textAlign:"center",
    fontWeight: "700",
    marginBottom: 12,
  },
  itemContainer: {
    width: 150,
    marginRight: 14,
  },
  artwork: {
    width: 150,
    height: 150,
    borderRadius: 16,
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  trackTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginTop: 8,
  },
  trackArtist: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },
});

export default RecommendedTracks;
