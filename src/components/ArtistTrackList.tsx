import { trackTitleFilter } from "@/helpers/trackPlayerFilter";
import { Artist } from "@/helpers/type";
import { navigationSearch } from "@/hooks/navigationSearch";
import { useNavigation } from "expo-router";
import { useMemo } from "react";
import { TracksList } from "./TracksList";
import { generateSongListId } from "@/helpers/timeHandle";
import { Image, StyleSheet, Text, View } from "react-native";
import { unknownArtistImageUri } from "@/constants/images";
import { defaultStyles } from "@/styles";
import { fontSize } from "@/constants/token";
import { QueueControl } from "./QueueControl";

export const ArtistTrackList = ({ artist }: { artist: Artist }) => {
    const { search, setSearch } = navigationSearch({})

    const filteredArtistsTracks = useMemo(() => {
        return artist.tracks.filter(trackTitleFilter(search))
    }, [artist.tracks, search])


    return (
        <>
            <View style={styles.artistHeaderContainer}>
                <View style={styles.artworkImageContainer}>
                    <Image
                        source={{
                            uri: unknownArtistImageUri,
                        }}
                        style={styles.artistImage}
                    />
                </View>

                <Text numberOfLines={1} style={styles.artistNameText}>
                    {artist.name}
                </Text>

                {search.length === 0 && (
                    <QueueControl track={filteredArtistsTracks} style={{ paddingTop: 24 }} />
                )}
            </View>
            <TracksList
                id={generateSongListId(artist.name, search)}
                hideQueueControls={true}
                tracks={filteredArtistsTracks}
            />
        </>
    )
}

const styles = StyleSheet.create({
    artistHeaderContainer: {
        flex: 1,
        marginBottom: 32,
    },
    artworkImageContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        height: 200,
    },
    artistImage: {
        width: '55%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 256,
    },
    artistNameText: {
        ...defaultStyles.text,
        marginTop: 22,
        textAlign: 'center',
        fontSize: fontSize.lg,
        fontWeight: '800',
    }
})