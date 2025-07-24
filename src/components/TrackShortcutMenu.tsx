import { useFavorites } from "@/store/library"
import { useQueue } from "@/store/queue"
import { MenuView } from "@react-native-menu/menu"
import { useRouter } from "expo-router"
import { PropsWithChildren } from "react"
import TrackPlayer, { Track } from "react-native-track-player"
import { match } from "ts-pattern"

type TrackShortcutMenuProps = PropsWithChildren<{track: Track}>

export const TrackShortcutMenu = ({track, children}: TrackShortcutMenuProps) => {
    const router = useRouter();
    const isFavorite = track.rating === 1;

    const {toggleTrackFavorite} = useFavorites();
    const {activeQueueId} = useQueue()

    const handlePressAction = (id:string) => {
        match(id)
        .with('add-to-favorite', async() => {
            toggleTrackFavorite(track)

            if (activeQueueId?.startsWith('favorites')){
                await TrackPlayer.add(track)
            }
        })
        .with('remove-from-favorite', async() => {
            toggleTrackFavorite(track)

            if(activeQueueId?.startsWith('favorites')){
                const queue = await TrackPlayer.getQueue()

                const trackToRemove = queue.findIndex((queueTrack) => queueTrack.url === track.url)

                await TrackPlayer.remove(trackToRemove)
            }
        })
        .with('add-to-playlist', () => {
            router.push({pathname: '(module)/addToPlaylist', params: {trackUrl: track.url}})
        })
        .otherwise(() => console.warn(`Unknown menu action ${id}`))
    }

    return (
        <MenuView 
            onPressAction={({nativeEvent: {event}}) => handlePressAction(event)}
            actions={[
                {
                    id: isFavorite ? 'remove-from-favorite' : 'add-to-favorite',
                    title: isFavorite ? 'Remove from favorite' : 'Add to favorite',
                    image: isFavorite ? 'star.fill' : 'star'
                },
                {
                    id: 'add-to-playlist',
                    title: 'Add to playlist',
                }
            ]}
            >
                {children}
        </MenuView>
    )

}