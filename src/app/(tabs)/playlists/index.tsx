// src/app/(tabs)/playlists/index.tsx
import { PlaylistsList } from "@/components/PlaylistsList";
import { SearchBar } from "@/components/SearchBar";
import { colors, fontSize, screenPadding } from "@/constants/token";
import { playlistNameFilter } from "@/helpers/trackPlayerFilter";
import { Playlist } from "@/helpers/type";
import { navigationSearch } from "@/hooks/navigationSearch";
import { usePlaylists } from "@/store/library";
import { defaultStyles } from "@/styles";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { unknownTracksImageUri } from "@/constants/images";
import { useTranslation } from 'react-i18next';
import { FontAwesome6 } from "@expo/vector-icons";

// Helper: lấy ảnh cover từ bài hát đầu tiên hoặc fallback
const getPlaylistCover = (playlist: Playlist) => {
  const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];
  return tracks[0]?.artwork || unknownTracksImageUri;
};

const ListHeaderComponent = ({
  search,
  setSearch,
  onProfilePress
}: {
  search: string;
  setSearch: (text: string) => void;
  onProfilePress: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.headerContainer}>
      {/* Row: tiêu đề + nút profile */}
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>{t('tabs.playlists')}</Text>
        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <FontAwesome6 name="user-circle" size={28} color="#05fae5" />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={t('playlists.searchPlaceholder')}
      />
    </View>
  );
};

const PlaylistsScreen = () => {
  const { t } = useTranslation();
  const { search, setSearch } = navigationSearch({});
  const router = useRouter();
  const { playlists } = usePlaylists();

  const filteredPlaylists = useMemo(() => {
    return (playlists ?? []).filter(playlistNameFilter(search));
  }, [playlists, search]);

  return (
    <View style={defaultStyles.container}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: screenPadding.horizontal, paddingBottom: 160 }}
      >
        <ListHeaderComponent
          search={search}
          setSearch={setSearch}
          onProfilePress={() => router.push('/profile')}
        />

        <PlaylistsList
          scrollEnabled={false}
          playlists={(filteredPlaylists ?? []).map(pl => ({
            ...pl,
            cover: getPlaylistCover(pl)
          }))}
          onPlaylistPress={pl => router.push(`/(tabs)/playlists/${encodeURIComponent(pl.name)}`)}
        />

        {/* {filteredPlaylists.length === 0 && (
          <Text style={styles.noMoreText}>{t('playlists.emptyList')}</Text>
        )} */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: { marginTop: 20 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
    paddingHorizontal: 10,
    position: 'relative',
  },
  screenTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  profileButton: {
    position: 'absolute',
    right: 10,
  },
  noMoreText: { color: colors.textMuted, textAlign: 'center', marginVertical: 20 }
});

export default PlaylistsScreen;
