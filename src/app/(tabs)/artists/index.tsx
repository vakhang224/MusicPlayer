// src/app/(tabs)/artists/index.tsx
import { SearchBar } from "@/components/SearchBar";
import { unknownArtistImageUri } from "@/constants/images";
import { colors, fontSize, screenPadding } from "@/constants/token";
import { navigationSearch } from "@/hooks/navigationSearch";
import { useUsers, User } from "@/hooks/useUsers";
import { defaultStyles, utilsStyles } from "@/styles";
import { Link, useRouter } from "expo-router";
import { useMemo, useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableHighlight, View, TouchableOpacity, RefreshControl } from "react-native";
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from "@expo/vector-icons";
import { FontAwesome6 } from "@expo/vector-icons";
import { getBaseUrl } from "@/services/baseUrlManager";

const ItemSeparatorComponent = () => <View style={[utilsStyles.itemSeparator, { marginLeft: 50, marginVertical: 12 }]} />;

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
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>{t('tabs.artists')}</Text>
        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <FontAwesome6 name="user-circle" size={28} color="#05fae5" />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={t('artists.searchPlaceholder')}
      />
    </View>
  );
};

const ArtistItem = ({ artist }: { artist: User & { avatar?: string } }) => {
  const nameToShow = artist.name || artist.username || 'Unknown';
  return (
    <Link
      href={{
        pathname: `/artists/[name]`,
        params: { id: String(artist.id), name: nameToShow, avatar: artist.avatar ?? undefined },
      }}
      asChild
    >
      <TouchableHighlight activeOpacity={0.8}>
        <View style={styles.artistItemContainer}>
          <Image source={{ uri: artist.avatar || unknownArtistImageUri }} style={styles.artistImage} />
          <View style={styles.artistInfo}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.artistNameText}>{nameToShow}</Text>
              {artist.isVerified && <MaterialIcons name="verified" size={16} color={colors.primary} style={styles.verifiedIcon} />}
            </View>
          </View>
        </View>
      </TouchableHighlight>
    </Link>
  );
};

const ArtistsScreen = () => {
  const { t } = useTranslation();
  const { search, setSearch } = navigationSearch({});
  const { users, refreshUsers } = useUsers() as any;
  const baseUrl = getBaseUrl();
  const router = useRouter();

  const [artists, setArtists] = useState<User[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const filtered = (users || [])
      .filter((u: any) => !u.isAdmin && u.isVerified)
      .map((u: any) => ({
        ...u,
        avatar: u.avatar
          ? u.avatar.startsWith("http")
            ? u.avatar
            : `${baseUrl}/${u.avatar.replace(/^\/+/, "")}`
          : undefined,
      }));
    setArtists(filtered);
  }, [users, baseUrl]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (typeof refreshUsers === "function") await refreshUsers();
    } catch (e) {
      // silent
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProfilePress = () => {
    // Adjust route if your profile route differs
    router.push("/profile");
  };

  return (
    <View style={defaultStyles.container}>
      <FlatList
        data={artists.filter((a) => (search ? (a.name || a.username || "").toLowerCase().includes(search.toLowerCase()) : true))}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ArtistItem artist={item} />}
        ItemSeparatorComponent={ItemSeparatorComponent}
        ListHeaderComponent={<ListHeaderComponent search={search} setSearch={setSearch} onProfilePress={handleProfilePress} />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: screenPadding.horizontal, paddingBottom: 120 }}
      />
    </View>
  );
};

export default ArtistsScreen;

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
  profileButton: { position: 'absolute', right: 10 },
  artistItemContainer: { flexDirection: 'row', columnGap: 14, alignItems: 'center', paddingVertical: 8 },
  artistImage: { borderRadius: 20, width: 40, height: 40, backgroundColor: colors.icon },
  artistInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  artistNameText: { ...defaultStyles.text, fontSize: 17, flexShrink: 1, color: colors.text },
  verifiedIcon: { marginLeft: 4 },
  emptyContentContainer: { alignItems: 'center', paddingVertical: 40 },
  noMoreText: { color: colors.textMuted, textAlign: 'center', marginVertical: 20 }
});
