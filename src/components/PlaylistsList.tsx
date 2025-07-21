import { unknownTracksImageUri } from "@/constants/images"
import { playlistNameFilter } from "@/helpers/trackPlayerFilter"
import { Playlist } from "@/helpers/type"
import { navigationSearch } from "@/hooks/navigationSearch"
import { utilsStyles } from "@/styles"
import { useMemo } from "react"
import { FlatList, FlatListProps, Image, Text, View } from "react-native"
import { PlaylistsListItem } from "./PlayListsListItem"

type PlaylistsListProps = {
    playlists: Playlist[],
    onPlaylistPress: (playlist: Playlist) => void
} & Partial<FlatListProps<Playlist>>

const ItemDivider = () => (
    <View style={{ ...utilsStyles.itemSeparator, marginLeft: 80, marginVertical: 12 }} />
);

export const PlaylistsList = ({ playlists = [], onPlaylistPress: handlePlaylistPress, ...flatListProps }: PlaylistsListProps) => {
    const { search } = navigationSearch({})

    const filteredPlaylists = useMemo(() => {
        return playlists.filter(playlistNameFilter(search))
    }, [playlists, search])

    return (
        <FlatList
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 128 }}
            data={filteredPlaylists}
            ListFooterComponent={ItemDivider}
            ItemSeparatorComponent={ItemDivider}
            ListEmptyComponent={
                <View>
                    <Text style={utilsStyles.emptyContentText}>No playlis here</Text>
                    <Image
                        source={{
                            uri: unknownTracksImageUri
                        }}
                        style={utilsStyles.emptyContentImage}
                    />
                </View>
            }
            renderItem={({ item: playlist }) => (
                <PlaylistsListItem playlist={playlist} onPress={() => handlePlaylistPress(playlist)} />
            )}
            {...flatListProps}

        />
    )
}