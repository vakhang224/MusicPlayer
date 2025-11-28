// src/components/TracksList.tsx
import { utilsStyles } from "@/styles";
import { FlatList, FlatListProps, Text, View } from "react-native";
import TrackPlayer, { Track as RNPTrack } from "react-native-track-player";
import TracksListItem from "./TracksListItem";
import { useQueue } from "@/store/queue";
import React, { useRef } from "react";
import { QueueControl } from "./QueueControl";
import { useTranslation } from "react-i18next";
import { normalizeUrl } from "@/helpers/url";

type AppTrack = RNPTrack & {
  verified?: number | boolean;
};

const ItemDivider = () => (
  <View style={{ ...utilsStyles.itemSeparator, marginVertical: 9, marginLeft: 60 }} />
);

export type TracksListProps = Partial<FlatListProps<AppTrack>> & {
  id: string;
  tracks: AppTrack[];
  hideQueueControls?: boolean;
  playlistId?: number;
};

export const TracksList = ({ id, tracks, hideQueueControls, playlistId, ...flatListProps }: TracksListProps) => {
  const { t } = useTranslation();
  const queueOffset = useRef(0);
  const { activeQueueId, playSelectedFromList } = useQueue();

  const handleTrackSelect = async (selectedTrack: AppTrack) => {
    const trackIndex = tracks.findIndex((track) => normalizeUrl(String(track.url)) === normalizeUrl(String(selectedTrack.url)));
    if (trackIndex === -1) return;

    const isChangingQueue = id !== activeQueueId;

    if (isChangingQueue) {
      // create rotated queue and autoplay via store
      try {
        await playSelectedFromList(tracks as RNPTrack[], trackIndex, id);
      } catch (e) {
        console.warn("[TracksList] playSelectedFromList failed:", e);
      }
    } else {
      // same queue: compute native index offset and skip
      const nextTrackIndex =
        trackIndex - queueOffset.current < 0
          ? tracks.length + trackIndex - queueOffset.current
          : trackIndex - queueOffset.current;

      try {
        await TrackPlayer.skip(nextTrackIndex);
        await TrackPlayer.play();
      } catch (e) {
        console.warn("[TracksList] skip/play failed:", e);
      }
    }
  };

  return (
    <FlatList
      data={tracks}
      keyExtractor={(item) => item.id?.toString() ?? item.url}
      ListHeaderComponent={
        !hideQueueControls ? <QueueControl track={tracks as RNPTrack[]} style={{ paddingBottom: 20 }} /> : undefined
      }
      ItemSeparatorComponent={ItemDivider}
      renderItem={({ item: track }) => (
        <TracksListItem
          track={track}
          onTrackSelected={() => handleTrackSelect(track)}
          playlistId={playlistId}
          listId={id}
        />
      )}
      scrollEnabled={false}
      ListEmptyComponent={
        <View>
          <Text style={utilsStyles.emptyContentText}>{t("tracks.emptyList")}</Text>
        </View>
      }
      {...flatListProps}
    />
  );
};
