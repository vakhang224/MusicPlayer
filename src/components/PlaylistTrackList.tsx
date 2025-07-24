import { fontSize } from "@/constants/token";
import { generateSongListId } from "@/helpers/timeHandle";
import { trackTitleFilter } from "@/helpers/trackPlayerFilter";
import { Playlist } from "@/helpers/type";
import { navigationSearch } from "@/hooks/navigationSearch"
import { defaultStyles } from "@/styles";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { TracksList } from "./TracksList";
import { QueueControl } from "./QueueControl";

export const PLaylistTrackList = ({playlist}: {playlist: Playlist}) => {
    const {search} = navigationSearch({});

    const filteredPlaylistsTrack = useMemo(() => {
        return playlist.tracks.filter(trackTitleFilter(search))
    },[playlist.tracks, search])

    return (
        <>
        <View style={styles.playlistHeaderContainer}>
            <View style={styles.artworkImageContainer}>
                <Image
                    source={{
                        uri: playlist.artworkPreview
                    }}
                    style={styles.artworkImage}
                />
            </View>
            <Text numberOfLines={1} style={styles.playlistNameText}>
                {playlist.name}
            </Text>
            {search.length === 0 && (
                <QueueControl style={{paddingTop: 24}} track={playlist.tracks} />
            )}
        </View>
        <TracksList
            id={generateSongListId(playlist.name, search)} 
            tracks={filteredPlaylistsTrack}
            scrollEnabled={false}
            hideQueueControls={true}
        />
        </>
    );
}

const styles = StyleSheet.create({
    playlistHeaderContainer: {
        flex: 1,
        marginBottom: 32,
    },
    artworkImageContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        height: 300,
    },
    artworkImage: {
        width: '85%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 12
    },
    playlistNameText:{
        ...defaultStyles.text,
        marginTop:22,
        textAlign: 'center',
        fontSize: fontSize.lg,
        fontWeight:'800'
    }
})