// src/app/(tabs)/(songs)/index.tsx
import { SearchBar } from "@/components/SearchBar";
import TracksListItem from "@/components/TracksListItem";
import RecommendedTracks from "@/components/RecommendedTracks";
import { colors, fontSize, screenPadding } from "@/constants/token";
import { generateSongListId } from "@/helpers/timeHandle";
import { navigationSearch } from "@/hooks/navigationSearch";
import { fetchRecommendations, fetchTracksPaginated } from "@/services/trackService";
import { defaultStyles } from "@/styles";
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { ActivityIndicator, FlatList, Text, View, StyleSheet, RefreshControl, TouchableOpacity } from "react-native";
import { Track } from "react-native-track-player";
import { useTranslation } from 'react-i18next';
import { useQueue } from "@/store/queue";
import { useDebounce } from "@/hooks/useDebounce";
import { useRouter } from "expo-router";
import { FontAwesome6 } from "@expo/vector-icons";
import { useLibraryStore } from "@/store/library";
import { normalizeUrl } from "@/helpers/url";
import { getBaseUrl } from "@/services/baseUrlManager";

type AppTrack = Track & { verified?: number | boolean; id?: number | string };

const PAGE_LIMIT = 20;

const ListHeaderComponent = ({
  search,
  setSearch,
  recommendations,
  onProfilePress
}: {
  search: string;
  setSearch: (text: string) => void;
  recommendations: AppTrack[];
  onProfilePress: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.titleRow}>
        <Text style={styles.screenTitle}>{t('tabs.songs')}</Text>
        <TouchableOpacity style={styles.profileButton} onPress={onProfilePress}>
          <FontAwesome6 name="user-circle" size={28} color="#05fae5" />
        </TouchableOpacity>
      </View>

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder={t('songs.searchPlaceholder')}
      />

      {Array.isArray(recommendations) && recommendations.length > 0 && (
        <RecommendedTracks tracks={recommendations} />
      )}

      <Text style={styles.allSongsTitle}>
        {t('tracks.allSongsTitle')}
      </Text>
    </View>
  );
};

const ListFooterComponent = ({ isLoading, hasMore }: { isLoading: boolean; hasMore: boolean }) => {
  const { t } = useTranslation();

  if (isLoading) return <ActivityIndicator size="large" color={colors.icon} style={{ marginTop: 20 }} />;
  if (!hasMore) return <Text style={styles.noMoreText}>{t('tracks.noMore')}</Text>;
  return null;
};

const SongsScreen: React.FC = () => {
  const { search, setSearch } = navigationSearch({});
  const debouncedSearch = useDebounce(search, 100);

  const [recommendations, setRecommendations] = useState<AppTrack[]>([]);
  const [tracks, setTracks] = useState<AppTrack[]>([]);
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // queue API: use playSelectedFromList to create rotated queue on demand
  const { playSelectedFromList } = useQueue();
  const listId = useMemo(() => generateSongListId('songs', debouncedSearch), [debouncedSearch]);
  const { t } = useTranslation();
  const router = useRouter();

  // Use ref to guard concurrent fetches reliably
  const isFetchingRef = useRef(false);
  const onEndReachedLock = useRef(false);

  // library store (merge paginated results into store)
  const libraryTracks = useLibraryStore((s) => s.tracks);
  const setLibraryState = useLibraryStore.setState;

  const loadRecommendations = useCallback(async () => {
    try {
      const recs = await fetchRecommendations();
      if (Array.isArray(recs)) setRecommendations(recs);
    } catch (error) {
      console.warn("[Songs] loadRecommendations error:", (error as any)?.message || error);
    }
  }, []);

  const mergeIntoLibrary = useCallback((items: any[]) => {
    try {
      if (!Array.isArray(items) || items.length === 0) return;
      const baseUrl = getBaseUrl();
      setLibraryState((state) => {
        const existing = Array.isArray(state.tracks) ? [...state.tracks] : [];
        for (const raw of items) {
          const idStr = String(raw.id ?? raw.track_id ?? "");
          if (!idStr) continue;
          const exists = existing.find((t) => String(t.id) === idStr || String(t.url) === String(raw.url));
          if (exists) continue;
          // minimal normalized mapping (similar to resolveTrackPaths)
          const artworkRaw = raw.artwork ?? raw.path ?? "";
          const artworkBase =
            artworkRaw && (String(artworkRaw).startsWith("http://") || String(artworkRaw).startsWith("https://"))
              ? artworkRaw
              : artworkRaw
              ? `${baseUrl}/${String(artworkRaw).replace(/^\/+/, "")}`
              : undefined;
          const artworkWithToken = artworkBase ? normalizeUrl(artworkBase) : undefined;

          const urlRaw = raw.url ?? "";
          const urlResolved =
            urlRaw && (String(urlRaw).startsWith("http://") || String(urlRaw).startsWith("https://"))
              ? normalizeUrl(String(urlRaw))
              : urlRaw
              ? normalizeUrl(`${baseUrl}/${String(urlRaw).replace(/^\/+/, "")}`)
              : undefined;

          const minimal = {
            id: Number(raw.id),
            title: raw.title ?? "",
            artists: raw.artists ?? raw.artist ?? "",
            artist: typeof raw.artists === "string" ? String(raw.artists).split(",")[0] : raw.artist ?? "",
            url: urlResolved,
            artwork: artworkWithToken,
            updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : undefined,
            isFavorite: raw.isFavorite === 1 || raw.isFavorite === true,
            playlists: raw.playlists ?? [],
            verified: raw.verified,
          };
          existing.push(minimal as any);
        }
        return { tracks: existing };
      });
    } catch (e) {
      console.warn("[Songs] mergeIntoLibrary error:", e);
    }
  }, []);

  const loadPage = useCallback(async (targetPage: number, replace = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);
    try {
      const fetched = await fetchTracksPaginated(targetPage, debouncedSearch, PAGE_LIMIT);
      const items = Array.isArray((fetched as any)?.items) ? (fetched as any).items : [];

      const shouldShowOnlyVerified = !debouncedSearch || debouncedSearch.trim() === "";

      const processed = items.filter((t: any) => {
        if (shouldShowOnlyVerified) {
          return t.verified === 1 || t.verified === true;
        }
        return true;
      });

      if (replace) {
        setTracks(processed);
      } else {
        setTracks(prev => {
          const existingIds = new Set(prev.map(p => String(p.id)));
          const toAppend = processed.filter((x: any) => !existingIds.has(String(x.id)));
          return [...prev, ...toAppend];
        });
      }

      // Merge fetched page items into library store so store has these tracks too
      mergeIntoLibrary(processed);

      // After merging, sync local page list with library entries (so isFavorite updates reflect)
      // We do this by mapping current page-local tracks to library entries when available.
      setTracks((prev) => {
        if (!Array.isArray(prev) || prev.length === 0) return prev;
        const lib = useLibraryStore.getState().tracks;
        return prev.map((p) => {
          const found = lib.find((l) => String(l.id) === String(p.id) || (p.url && String(l.url) === normalizeUrl(String(p.url))));
          return found ? { ...p, ...found } : p;
        });
      });

      setPage(targetPage);
      const isLastPage = Boolean((fetched as any)?.isLastPage);
      setHasMore(!isLastPage);
      setInitialLoadDone(true);
    } catch (error) {
      console.warn("[Songs] loadPage error:", (error as any)?.message || error);
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
    }
  }, [debouncedSearch, mergeIntoLibrary]);

  // initial load
  useEffect(() => {
    loadRecommendations();
    loadPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when search changes, reset list and load page 1
  useEffect(() => {
    setTracks([]);
    setPage(1);
    setHasMore(true);
    setInitialLoadDone(false);
    loadPage(1, true);
  }, [debouncedSearch, loadPage]);

  const handleEndReached = useCallback(() => {
    if (!initialLoadDone) return;
    if (onEndReachedLock.current) return;
    if (isFetchingRef.current || !hasMore) return;

    onEndReachedLock.current = true;
    setTimeout(() => {
      onEndReachedLock.current = false;
    }, 300);

    loadPage(page + 1, false);
  }, [hasMore, page, loadPage, initialLoadDone]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadRecommendations(), loadPage(1, true)]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadRecommendations, loadPage]);

  // stable handleTrackPress: create rotated queue starting from tapped index and autoplay
  const handleTrackPress = useCallback(async (track: AppTrack) => {
    try {
      if (!Array.isArray(tracks) || tracks.length === 0) return;

      const idx = tracks.findIndex((t) => String(t.id) === String(track.id) || String(t.url) === String(track.url));
      const startIndex = idx >= 0 ? idx : 0;

      // create rotated queue and autoplay via store API
      await playSelectedFromList(tracks as Track[], startIndex, listId);
    } catch (err) {
      console.warn("[Songs] handleTrackPress error:", (err as any)?.message || err);
    }
  }, [tracks, listId, playSelectedFromList]);

  const onTrackSelected = useCallback((item: AppTrack) => {
    handleTrackPress(item);
  }, [handleTrackPress]);

  // Keep page-local tracks in sync when library store updates (so favorites reflect immediately)
  useEffect(() => {
    if (!Array.isArray(tracks) || tracks.length === 0) return;
    if (!Array.isArray(libraryTracks) || libraryTracks.length === 0) return;

    setTracks((prev) =>
      prev.map((p) => {
        const found = libraryTracks.find((l) => String(l.id) === String(p.id) || (p.url && String(l.url) === normalizeUrl(String(p.url))));
        return found ? { ...p, ...found } : p;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryTracks]);

  const renderItem = useCallback(({ item }: { item: AppTrack }) => {
    if (!item || typeof item !== 'object') return null;
    return (
      <TracksListItem
        track={item as Track}
        onTrackSelected={() => onTrackSelected(item)}
        listId={listId}
      />
    );
  }, [listId, onTrackSelected]);

  return (
    <View style={defaultStyles.container}>
      <FlatList
        data={Array.isArray(tracks) ? tracks : []}
        keyExtractor={(item, index) => (item?.id != null ? String(item.id) : `idx-${index}`)}
        renderItem={renderItem}
        ListHeaderComponent={
          <ListHeaderComponent
            search={search}
            setSearch={setSearch}
            recommendations={Array.isArray(recommendations) ? recommendations : []}
            onProfilePress={() => router.push('profile')}
          />
        }
        ListFooterComponent={<ListFooterComponent isLoading={isFetching && initialLoadDone} hasMore={hasMore} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          (!initialLoadDone || isFetching) ? <ActivityIndicator size="large" color={colors.icon} style={{ marginTop: 50 }} />
            : <Text style={styles.noMoreText}>{t('tracks.emptyList')}</Text>
        }
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: screenPadding.horizontal, paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={20}
        removeClippedSubviews={true}
      />
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
  allSongsTitle: { color: colors.text, textAlign: "center", fontSize: fontSize.lg, fontWeight: '700', marginBottom: 10 },
  recommendedTitle: { color: colors.text, fontSize: fontSize.base, fontWeight: '600', marginBottom: 10 },
  noMoreText: { color: colors.textMuted, textAlign: 'center', marginVertical: 20 }
});

export default SongsScreen;
