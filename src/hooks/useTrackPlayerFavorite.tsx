import { useFavorites } from "@/store/library";
import { useCallback } from "react";
import TrackPlayer, { useActiveTrack } from "react-native-track-player"

export const useTrackPlayerFavorite = () => {
    const activeTrack = useActiveTrack();

    const {favorites, toggleTrackFavorite} = useFavorites();

    const isFavorites = favorites.find((track) => track.url === activeTrack?.url)?.rating === 1

    const toggleFavorite = useCallback(async () => {
        const id = await TrackPlayer.getActiveTrackIndex()

        if (id == null) return

        await TrackPlayer.updateMetadataForTrack(id, {
            rating: isFavorites ? 0 : 1
        })

        if (activeTrack) {
            toggleTrackFavorite(activeTrack)
        }
    }, [isFavorites, toggleTrackFavorite, activeTrack])

    return { isFavorites, toggleFavorite }
}