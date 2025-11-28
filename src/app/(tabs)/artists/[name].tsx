// src/app/(tabs)/artists/[name].tsx
import { ArtistTrackList } from "@/components/ArtistTrackList";
import { screenPadding } from "@/constants/token";
import { useArtists, useLibraryStore } from "@/store/library";
import { defaultStyles } from "@/styles";
import { Redirect, useLocalSearchParams } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import { ScrollView, View, RefreshControl } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { getBaseUrl } from "@/services/baseUrlManager";
import * as SecureStore from "expo-secure-store";
import { ACCESS_TOKEN_KEY } from "@/services/authService";

const ArtistDetailScreen = () => {
  const { name: artistName, avatar } = useLocalSearchParams<{ name: string; avatar?: string }>();
  const artists = useArtists();
  const refreshTracks = useLibraryStore((s) => s.refreshTracks);
  const auth = useAuth();
  const baseUrl = getBaseUrl();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  // IMPORTANT: undefined = chưa load; [] = đã load nhưng không có bài
  const [tracks, setTracks] = useState<any[] | undefined>(undefined);

  const artist = artists.find((artist) => artist.name === artistName);

  const getArtistIdForApi = (a: any) => {
    if (!a) return undefined;
    if (typeof a.id === "number") return a.id;
    if (typeof a.artistId === "number") return a.artistId;
    // nếu id là string số, trả về string số; server mong numeric, nên prefer numeric
    if (!isNaN(Number(a.id))) return Number(a.id);
    return undefined; // **không** fallback sang name — tránh gửi name làm filter
  };

  const readTokenFromSecureStore = async () => {
    try {
      const maybe = (auth as any)?.token ?? (auth as any)?.accessToken ?? (auth as any)?.access_token ?? undefined;
      if (maybe) return maybe;
      const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      return stored ?? undefined;
    } catch (e) {
      console.warn("[ArtistDetail] readTokenFromSecureStore failed:", (e as any)?.message || e);
      return undefined;
    }
  };

  const fetchAllTracksForArtist = async (artistId?: number | string) => {
    if (!artistId) {
      // nếu không có artistId numeric thì set tracks = [] (đã load, không có bài)
      console.warn("[ArtistDetail] fetchAllTracksForArtist called without numeric artistId:", artistId);
      setTracks([]);
      return [];
    }

    setLoadingTracks(true);
    try {
      const tokenToUse = await readTokenFromSecureStore();

      const all: any[] = [];
      const base = `${baseUrl}/tracks?artistId=${encodeURIComponent(String(artistId))}`;

      // fetch page 1
      const headers1: any = { "Content-Type": "application/json" };
      if (tokenToUse) headers1["Authorization"] = `Bearer ${tokenToUse}`;

      const resp1 = await fetch(`${base}&page=1`, {
        method: "GET",
        headers: headers1,
        credentials: "include",
      });

      if (!resp1.ok) {
        const text = await resp1.text();
        throw new Error(`Failed to fetch tracks page 1: ${resp1.status} ${text}`);
      }

      const j1 = await resp1.json();
      const pageTracks1 = Array.isArray(j1.tracks) ? j1.tracks : [];
      all.push(...pageTracks1);

      const totalPages = Number(j1.totalPages || 1);

      if (totalPages > 1) {
        const headersRest: any = { "Content-Type": "application/json" };
        if (tokenToUse) headersRest["Authorization"] = `Bearer ${tokenToUse}`;

        const promises: Promise<any>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          promises.push(
            fetch(`${base}&page=${p}`, {
              method: "GET",
              headers: headersRest,
              credentials: "include",
            }).then(async (r) => {
              if (!r.ok) {
                const t = await r.text();
                throw new Error(`Failed page ${p}: ${r.status} ${t}`);
              }
              return r.json();
            })
          );
        }

        const pages = await Promise.all(promises);
        pages.forEach((pg) => {
          if (Array.isArray(pg.tracks)) all.push(...pg.tracks);
        });
      }

      console.log("[ArtistDetail] fetched total tracks:", all.length, "artistId=", artistId, "ids=", all.map((t) => t.id).join(","));
      setTracks(all);
      return all;
    } catch (err) {
      console.warn("[ArtistDetail] fetchAllTracksForArtist failed:", (err as any)?.message || err);
      // Đặt tracks = [] để biểu thị "đã load nhưng không có bài" (không fallback sang artist.tracks)
      setTracks([]);
      return [];
    } finally {
      setLoadingTracks(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (typeof refreshTracks === "function") {
        await refreshTracks();
      }
      await fetchAllTracksForArtist(getArtistIdForApi(artist));
    } catch (err) {
      console.warn("[ArtistDetail] refreshTracks failed:", (err as any)?.message || err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTracks, artist, baseUrl]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!artist) return;
      const artistId = getArtistIdForApi(artist);
      await fetchAllTracksForArtist(artistId);
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist?.id, artist?.name, baseUrl]);

  if (!artist) {
    console.warn(`Artist ${artistName} not found!`);
    return <Redirect href={`/(tabs)/artists`} />;
  }

  const artistWithAvatar = { ...artist, avatar };

  return (
    <View style={defaultStyles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: screenPadding.horizontal,
          paddingBottom: 160,
        }}
        refreshControl={<RefreshControl refreshing={isRefreshing || loadingTracks} onRefresh={onRefresh} />}
      >
        {/* tracks có thể là undefined (chưa load) hoặc [] (đã load nhưng rỗng) hoặc array */}
        <ArtistTrackList artist={artistWithAvatar} tracks={tracks} loading={loadingTracks} />
      </ScrollView>
    </View>
  );
};

export default ArtistDetailScreen;
