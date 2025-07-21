import { PlaylistsList } from "@/components/PlaylistsList"
import { SearchBar } from "@/components/SearchBar"
import { colors, fontSize, screenPadding } from "@/constants/token"
import { playlistNameFilter } from "@/helpers/trackPlayerFilter"
import { Playlist } from "@/helpers/type"
import { navigationSearch } from "@/hooks/navigationSearch"
import { usePlaylists } from "@/store/library"
import { defaultStyles } from "@/styles"
import { useRouter } from "expo-router"
import React, { useMemo } from "react"
import { ScrollView, Text, View } from "react-native"

const PlaylistsScreen = () => {

    const router = useRouter()
    const { search, setSearch } = navigationSearch({})

    const { playlists } = usePlaylists();

    const filteredPlaylists = useMemo(() => {
        return playlists.filter(playlistNameFilter(search))
    }, [playlists, search])

    const handlePlaylistPress = (playlist: Playlist) => {
        router.push(`/(tabs)/playlists/${playlist.name}`)
    }
    return (
        <View style={defaultStyles.container}>
            <ScrollView contentInsetAdjustmentBehavior="automatic"
                style={{
                    paddingHorizontal: screenPadding.horizontal
                }}>
                <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: "center", fontWeight: 700, marginBottom: 20, marginTop: 50 }}>Playlists</Text>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Find your playlist"
                />
                <PlaylistsList scrollEnabled={false} playlists={filteredPlaylists} onPlaylistPress={handlePlaylistPress} />
            </ScrollView>
        </View>
    )
}

export default PlaylistsScreen