import { PLaylistTrackList } from "@/components/PlaylistTrackList";
import { screenPadding } from "@/constants/token";
import { usePlaylists } from "@/store/library";
import { defaultStyles } from "@/styles";
import { Redirect, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native";

const PlaylistScreen = () => {
    const {name: playlistName} = useLocalSearchParams<{name: string}>();
    const {playlists} = usePlaylists()
    const playlist = playlists.find((playlist) => playlist.name === playlistName);

    if(!playlist){
        console.warn(`Playlist ${playlistName} was not found :(`)

        return <Redirect href={`/(tabs)/playlists`} />
    }

    return (
        <View style={defaultStyles.container}>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{paddingHorizontal: screenPadding.horizontal, paddingBottom: 160}}
            >
                <PLaylistTrackList playlist={playlist}/>
            </ScrollView>
        </View>
    )

}

export default PlaylistScreen