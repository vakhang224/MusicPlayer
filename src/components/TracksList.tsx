import { utilsStyles } from "@/styles";
import { FlatList, FlatListProps, Text, View } from "react-native";
import TrackPlayer, { Track } from "react-native-track-player";
import { TracksListItem } from "./TracksListItem";

const ItemDivider = () => (
    <View style={{...utilsStyles.itemSeparator, marginVertical: 9, marginLeft: 60}}/>
)

export type Props = Partial<FlatListProps<Track>> & {
    tracks: Track[];
};


export const TracksList = ({ tracks }: Props) => {

    const handleTrackSelect = async (track: Track) => {
        await TrackPlayer.load(track)
        await TrackPlayer.play();
        console.log(track)
    }

    return (
        <FlatList
            data={tracks}
            ItemSeparatorComponent={ItemDivider}
            renderItem={({ item: track }) => (
                <TracksListItem tracks={track} onTrackSelected={handleTrackSelect}/>
            )}
            scrollEnabled={false}
            ListEmptyComponent={
                <View>
                    <Text style={utilsStyles.emptyComponentText}>No song match your search</Text>
                </View>
            }
        />
    );
};
