import { SearchBar } from "@/components/SearchBar"
import { TracksList } from "@/components/TracksList"
import { colors, fontSize, screenPadding } from "@/constants/token"
import { generateSongListId } from "@/helpers/timeHandle"
import { trackTitleFilter } from "@/helpers/trackPlayerFilter"
import { navigationSearch } from "@/hooks/navigationSearch"
import { fetchTracks } from "@/services/trackService"
import { useFavorites, useLibraryStore } from "@/store/library"
import { defaultStyles } from "@/styles"
import { useNavigation } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { Platform, ScrollView, Text, View } from "react-native"
import { Track } from "react-native-track-player"

const FavoritesScreen = () => {
  // const [tracks, setTracks] = useState<Track[]>([]);
  const { favorites } = useFavorites();
  const fetch = useLibraryStore((state) => state.fetch);
  const hasFetched = useRef(false);


  useEffect(() => {
    if (!hasFetched.current) {
      fetch();
      hasFetched.current = true;
    }
  }, [])

  const [loading, setLoading] = useState(true);
  // const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);

  const { search, setSearch } = navigationSearch({});

  // useEffect(() => {
  //     const loadTracks = async () => {
  //         try {
  //             const data = await fetchTracks();
  //             // Convert rating to correct type if necessary
  //             const mappedData = data.map((track) => ({
  //                 ...track,
  //             }));
  //             setTracks(mappedData);
  //             setFilteredTracks(mappedData) // gán luôn cho danh sách lọc
  //         } catch (error) {
  //             console.error("Error fetching tracks:", error);
  //         } finally {
  //             setLoading(false);
  //         }
  //     };

  //     loadTracks();
  // }, []);



  //   useEffect(() => {
  //   if (!search.trim()) {
  //     setFilteredTracks(favorites);
  //   } else {
  //     const query = search.toLowerCase();
  //     const filtered = favorites.filter((track) =>
  //       track.title?.toLowerCase().includes(query)
  //     );
  //     setFilteredTracks(filtered);
  //   }
  // }, [search, favorites]);

  const favoritesTracks = useFavorites().favorites;

  const filteredFavoritesTracks = useMemo(() => {
    if (!search) return favoritesTracks
    return favoritesTracks.filter(trackTitleFilter(search))
  }, [search, favoritesTracks])

  return (
    <View style={defaultStyles.container}>
      <ScrollView
        style={{ paddingHorizontal: screenPadding.horizontal, paddingBottom: 160 }}
        contentInsetAdjustmentBehavior="automatic">


        <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: "center", fontWeight: 700, marginBottom: 20, marginTop: 50 }}>Favorites</Text>

        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Find your favorite song"
        />

        <TracksList id={generateSongListId('favorites', search)} scrollEnabled={false} tracks={filteredFavoritesTracks} />
      </ScrollView>
    </View>
  )
}

export default FavoritesScreen