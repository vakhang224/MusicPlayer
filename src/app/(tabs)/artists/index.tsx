import { SearchBar } from "@/components/SearchBar"
import { unknownArtistImageUri } from "@/constants/images"
import { colors, fontSize, screenPadding } from "@/constants/token"
import { artistNameFilter } from "@/helpers/trackPlayerFilter"
import { navigationSearch } from "@/hooks/navigationSearch"
import { useArtists } from "@/store/library"
import { defaultStyles, utilsStyles } from "@/styles"
import { Link } from "expo-router"
import { useMemo } from "react"
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableHighlight, View } from "react-native"

const ItemSeparatorComponent = () => {
    return <View style={[utilsStyles.itemSeparator, { marginLeft: 50, marginVertical: 12 }]} />
}

const ArtistsScreen = () => {
    const { search, setSearch } = navigationSearch({})

    const artists = useArtists();

    const filteredArtists = useMemo(() => {
        if (!search) return artists

        return artists.filter(artistNameFilter(search))
    }, [artists, search])
    return (
        <View style={defaultStyles.container}>
            <ScrollView style={{ paddingHorizontal: screenPadding.horizontal, paddingBottom: 160 }}
                contentInsetAdjustmentBehavior="automatic">
                <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: "center", fontWeight: 700, marginBottom: 20, marginTop: 50 }}>Artists</Text>
                <SearchBar
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search artists"
                />
                <FlatList
                    contentContainerStyle={{ paddingTop: 10, paddingBottom: 160 }}
                    scrollEnabled={false}
                    data={filteredArtists}
                    ItemSeparatorComponent={ItemSeparatorComponent}
                    ListFooterComponent={ItemSeparatorComponent}
                    renderItem={({ item: artists }) => {
                        return (
                            <Link href={`/artists/${artists.name}`} asChild>
                                <TouchableHighlight activeOpacity={0.8}>
                                    <View style={styles.artistItemContainer}>
                                        <View>
                                            <Image 
                                            source={{
                                                uri: artists.image || unknownArtistImageUri
                                                }} 
                                            style={styles.artistImage}/>
                                        </View>
                                        <View style={{width:'100%'}}>
                                            <Text numberOfLines={1} style={styles.artistNameText}>{artists.name}</Text>
                                        </View>
                                    </View>
                                </TouchableHighlight>
                            </Link>
                        )
                    }}
                    ListEmptyComponent={
                        <View>
                            <Text>No artist found!</Text>
                            <Image source={{
                                uri: unknownArtistImageUri
                            }}
                                style={utilsStyles.emptyContentText}
                            />
                        </View>
                    }
                />
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    artistItemContainer: {
        flexDirection: 'row',
        columnGap: 14,
        alignItems: 'center'
    },
    artistImage:{
        borderRadius: 32,
        width: 40,
        height: 40,
    },
    artistNameText: {
        ...defaultStyles.text,
        fontSize: 17,
        maxWidth: '80%',
    }
})

export default ArtistsScreen