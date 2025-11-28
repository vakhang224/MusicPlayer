// src/app/(tabs)/favorites/index.tsx
import { SearchBar } from "@/components/SearchBar";
import { TracksList } from "@/components/TracksList";
import { colors, fontSize, screenPadding } from "@/constants/token";
import { generateSongListId } from "@/helpers/timeHandle";
import { navigationSearch } from "@/hooks/navigationSearch";
import { useFavorites } from "@/store/library";
import { defaultStyles } from "@/styles";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useTranslation } from 'react-i18next';
import { FontAwesome6 } from "@expo/vector-icons";

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
        <Text style={styles.screenTitle}>{t('tabs.favorites')}</Text>
        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <FontAwesome6 name="user-circle" size={28} color="#05fae5" />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={t('favorites.searchPlaceholder')}
      />
    </View>
  );
};

const FavoritesScreen = () => {
  const { t } = useTranslation();
  const { search, setSearch } = navigationSearch({});
  const router = useRouter();
  const { favorites } = useFavorites();

  const filteredFavorites = useMemo(() => {
    if (!search) return favorites;
    return favorites.filter(track => track.title?.toLowerCase().includes(search.toLowerCase()));
  }, [search, favorites]);

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

        <TracksList
          id={generateSongListId('favorites', search)}
          scrollEnabled={false}
          tracks={filteredFavorites}
        />

        {/* {filteredFavorites.length === 0 && (
          <Text style={styles.noMoreText}>{t('tracks.emptyList')}</Text>
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

export default FavoritesScreen;
