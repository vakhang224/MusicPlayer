// app/(tabs)/playlists/[name].tsx

import React, { FC } from "react";
import { ScrollView, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";

import { PlaylistTrackList } from "@/components/PlaylistTrackList";
import { usePlaylists } from "@/store/library";
import { defaultStyles } from "@/styles";
import { screenPadding } from "@/constants/token";

const PlaylistScreen: FC = () => {
  const { name: playlistName } = useLocalSearchParams<{ name: string }>();
  const { playlists } = usePlaylists();

  const playlist = playlists.find((p) => p.name === playlistName);

  // 🔹 Nếu không tìm thấy playlist → quay về màn playlists
  if (!playlist) {
    console.warn(`Playlist "${playlistName}" was not found`);
    return <Redirect href="/(tabs)/playlists" />;
  }

  return (
    <View style={defaultStyles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: screenPadding.horizontal,
          paddingBottom: 160,
        }}
      >
        <PlaylistTrackList playlist={playlist} />
      </ScrollView>
    </View>
  );
};

export default PlaylistScreen;
