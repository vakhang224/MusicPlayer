import { SearchBar } from "@/components/SearchBar";
import { TracksList } from "@/components/TracksList";
import { colors, fontSize, screenPadding } from "@/constants/token";
import { navigationSearch } from "@/hooks/navigationSearch";
import { fetchTracks } from "@/services/trackService";
import { useLibraryStore, useTracks } from "@/store/library";
import { defaultStyles } from "@/styles";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Track } from "react-native-track-player";

const SongsScreen = () => {
  const { search, setSearch } = navigationSearch({
    searchBarOptions: {
      placeholder: "Search songs",
    },
  });

  const tracks = useTracks();
  const fetch = useLibraryStore((state) => state.fetch);
  const hasFetched = useRef(false);



  // const [tracks, setTracks] = useState<Track[]>([]);
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasFetched.current) {
      fetch();
      hasFetched.current = true;
    }
  }, [])
  // useEffect(() => {
  //   const loadTracks = async () => {
  //     try {
  //       const data = await fetchTracks();
  //       // Convert rating to correct type if necessary
  //       const mappedData = data.map((track) => ({
  //         ...track,
  //         rating: track.rating as any, // Cast or map to RatingType if needed
  //       }));
  //       setTracks(mappedData);
  //       setFilteredTracks(mappedData); // gán luôn cho danh sách lọc
  //     } catch (error) {
  //       console.error("Error fetching tracks:", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   loadTracks();
  // }, []);

  // Lọc khi search thay đổi
  useEffect(() => {
    if (!search.trim()) {
      setFilteredTracks(tracks);
    } else {
      const query = search.toLowerCase();
      const filtered = tracks.filter((track) =>
        track.title?.toLowerCase().includes(query)
      );
      setFilteredTracks(filtered);
    }
  }, [search, tracks]);

  const insets = useSafeAreaInsets();

  return (
    <View style={defaultStyles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenPadding.horizontal,
          paddingBottom: 160, // Add some padding so it can scroll above tab bar
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: "center", fontWeight: 700, marginBottom: 20, marginTop: 50 }}>Songs</Text>

        {Platform.OS === "android" && (
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search songs"
          />
        )}

        <TracksList tracks={filteredTracks} />
      </ScrollView>
    </View>
  );
};

export default SongsScreen;
