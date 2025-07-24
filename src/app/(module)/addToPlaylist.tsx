import { PlaylistsList } from "@/components/PlaylistsList"
import { screenPadding } from "@/constants/token"
import { Playlist } from "@/helpers/type"
import { usePlaylists, useTracks } from "@/store/library"
import { useQueue } from "@/store/queue"
import { defaultStyles } from "@/styles"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView, StyleSheet } from "react-native"
import TrackPlayer, { Track } from "react-native-track-player"

const addToPlaylistModule = () => {
    const router = useRouter();


    const {activeQueueId} = useQueue();

    const {playlists, addToPlaylist} = usePlaylists();

    const {trackUrl} = useLocalSearchParams<{trackUrl: Track['url']}>()

    const tracks = useTracks();

    const track = tracks.find((currentTrack) => trackUrl === currentTrack.url)

    if(!track){
        return null
    }

    const availablePlaylists = playlists.filter(
        (playlist) => !playlist.tracks.some((playlistTrack) => playlistTrack.url === track.url)
    )

    const handlePlaylistPress = async(playlist: Playlist) => {
        addToPlaylist(track, playlist.name)

        router.dismiss();

        if (activeQueueId?.startsWith(playlist.name)){
            await TrackPlayer.add(track);
        }
    }

    return (
        <SafeAreaView style={[styles.moduleContainer, {paddingTop: 10}]}>
            <PlaylistsList playlists={availablePlaylists} onPlaylistPress={handlePlaylistPress}/>
        </SafeAreaView>
    )
}


const styles = StyleSheet.create({
    moduleContainer: {
        ...defaultStyles.container,
        paddingHorizontal: screenPadding.horizontal,
    }
})

export default addToPlaylistModule