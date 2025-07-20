import { utilsStyles } from "@/styles";
import { FlatList, FlatListProps, Text, View } from "react-native";
import TrackPlayer, { Track } from "react-native-track-player";
import { TracksListItem } from "./TracksListItem";
import { useQueue } from "@/store/queue";
import React, { useRef } from "react";
import { QueueControl } from "./QueueControl";

const ItemDivider = () => (
    <View style={{ ...utilsStyles.itemSeparator, marginVertical: 9, marginLeft: 60 }} />
)

export type Props = Partial<FlatListProps<Track>> & {
    id: string;
    tracks: Track[];
    hideQueueControls?: boolean;
};


export const TracksList = ({ id, tracks, hideQueueControls }: Props) => {
    const queueOffset = useRef(0);
    const { activeQueueId, setActiveQueueId } = useQueue();

    const handleTrackSelect = async (selectedTrack: Track) => {
        const trackIndex = tracks.findIndex((track) => track.url === selectedTrack.url)
        // await TrackPlayer.load(track)
        // await TrackPlayer.play();
        // console.log(track)
        if (trackIndex === -1) return

        const isChangingQueue = id !== activeQueueId


        if (isChangingQueue) {
            const beforeTracks = tracks.slice(0, trackIndex)
            const afterTracks = tracks.slice(trackIndex + 1)

            await TrackPlayer.reset()

            await TrackPlayer.add(selectedTrack)
            await TrackPlayer.add(afterTracks)
            await TrackPlayer.add(beforeTracks)

            await TrackPlayer.play()
            queueOffset.current = trackIndex;
            setActiveQueueId(id);
        } else {
            const nextTrackIndex = trackIndex - queueOffset.current < 0
            ? tracks.length + trackIndex - queueOffset.current
            : trackIndex - queueOffset.current;

            await TrackPlayer.skip(nextTrackIndex)
            TrackPlayer.play()
        }
    }


    return (
        <FlatList
            data={tracks}
            ListHeaderComponent={!hideQueueControls ? (
					<QueueControl track={tracks} style={{ paddingBottom: 20 }} />
				) : undefined}
            ItemSeparatorComponent={ItemDivider}
            renderItem={({ item: track }) => (
                <TracksListItem tracks={track} onTrackSelected={handleTrackSelect} />
            )}
            scrollEnabled={false}
            ListEmptyComponent={
                <View>
                    <Text style={utilsStyles.emptyComponentText}>Nothing here!</Text>
                </View>
            }
        />
    );
};
