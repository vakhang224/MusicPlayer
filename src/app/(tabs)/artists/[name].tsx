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
  // read params as any to avoid TS generic mismatch
  const params = useLocalSearchParams() as any;
  const routeName = params?.name;
  const avatarParam = params?.avatar;
  const routeIdRaw = params?.id;
  const routeArtistId = routeIdRaw != null ? String(routeIdRaw) : undefined;

  const artists = useArtists();
  const refreshTracks = useLibraryStore((s) => s.refreshTracks);
  const auth = useAuth();
  const baseUrl = getBaseUrl();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingTracks, setLoadingTracks] = useState(false);
  // IMPORTANT: undefined = chưa load; [] = đã load nhưng không có bài
  const [tracks, setTracks] = useState<any[] | undefined>(undefined);

  // local fallback artist fetched directly from server when not found in store
  const [fallbackArtist, setFallbackArtist] = useState<any | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // helper: normalize string for loose comparison (remove diacritics, lowercase, trim)
  const normalizeString = (s?: string) => {
    if (!s) return "";
    try {
      return s
        .normalize?.("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        .replace(/[_\-\/]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    } catch {
      return String(s).toLowerCase().replace(/[_\-\/]+/g, " ").replace(/\s+/g, " ").trim();
    }
  };

  // Resolve artist robustly:
  // prefer route id if provided, otherwise try username, exact name, then normalized name
  const artistsLoaded = Array.isArray(artists) && artists.length > 0;

  let artistFromStore: any | undefined = undefined;

  if (artistsLoaded) {
    if (routeArtistId) {
      artistFromStore = artists.find((a) => String(a?.id) === routeArtistId);
    }

    if (!artistFromStore && routeName) {
      artistFromStore = artists.find((a) => String(a?.username) === String(routeName));
    }

    if (!artistFromStore && routeName) {
      artistFromStore = artists.find((a) => String(a?.name) === String(routeName));
    }

    if (!artistFromStore && routeName) {
      const target = normalizeString(routeName);
      artistFromStore = artists.find(
        (a) =>
          normalizeString(a?.name) === target ||
          normalizeString(a?.username) === target ||
          normalizeString(String(a?.id)) === target
      );
    }
  }

  // If not found in store and routeArtistId exists, try fetching user by id as fallback
  useEffect(() => {
    let mounted = true;
    const tryFetchFallback = async () => {
      if (!routeArtistId) {
        setFallbackArtist(null);
        return;
      }
      // if store already has it, no need to fetch
      if (artistFromStore) {
        setFallbackArtist(null);
        return;
      }
      setFallbackLoading(true);
      try {
        const url = `${baseUrl}/users/${encodeURIComponent(String(routeArtistId))}`;
        const res = await fetch(url);
        if (!mounted) return;
        if (!res.ok) {
          // try fetching all users as last resort (some servers don't expose /users/:id)
          const allRes = await fetch(`${baseUrl}/users`);
          if (!allRes.ok) {
            setFallbackArtist(null);
            return;
          }
          const allData = await allRes.json();
          const found = Array.isArray(allData) ? allData.find((u: any) => String(u?.id) === String(routeArtistId)) : null;
          if (found) {
            const avatarUri = found.avatar
              ? found.avatar.startsWith("http")
                ? found.avatar
                : `${baseUrl}/${String(found.avatar).replace(/^\/+/, "")}`
              : undefined;
            setFallbackArtist({ id: Number(found.id), name: found.name ?? found.username ?? "", username: found.username, avatar: avatarUri, isVerified: found.isVerified });
            return;
          }
          setFallbackArtist(null);
          return;
        }
        const data = await res.json();
        const avatarUri = data?.avatar
          ? data.avatar.startsWith("http")
            ? data.avatar
            : `${baseUrl}/${String(data.avatar).replace(/^\/+/, "")}`
          : undefined;
        setFallbackArtist({ id: Number(data.id), name: data.name ?? data.username ?? "", username: data.username, avatar: avatarUri, isVerified: data.isVerified });
      } catch (err) {
        console.warn("[ArtistDetail] fallback fetch user failed:", (err as any)?.message || err);
        setFallbackArtist(null);
      } finally {
        if (mounted) setFallbackLoading(false);
      }
    };

    tryFetchFallback();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeArtistId, artistsLoaded, baseUrl, artistFromStore]);

  // final artist to use: prefer store, otherwise fallbackArtist
  const artist = artistFromStore ?? (fallbackArtist ?? undefined);

  const getArtistIdForApi = (a: any) => {
    if (!a) return undefined;
    if (typeof a.id === "number") return a.id;
    if (typeof a.artistId === "number") return a.artistId;
    if (!isNaN(Number(a.id))) return Number(a.id);
    return undefined; // do not fallback to name
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
      console.warn("[ArtistDetail] fetchAllTracksForArtist called without numeric artistId:", artistId);
      setTracks([]);
      return [];
    }

    setLoadingTracks(true);
    try {
      const tokenToUse = await readTokenFromSecureStore();

      const all: any[] = [];
      const base = `${baseUrl}/tracks?artistId=${encodeURIComponent(String(artistId))}`;

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

      console.log(
        "[ArtistDetail] fetched total tracks:",
        all.length,
        "artistId=",
        artistId,
        "ids=",
        all.map((t) => t.id).join(",")
      );
      setTracks(all);
      return all;
    } catch (err) {
      console.warn("[ArtistDetail] fetchAllTracksForArtist failed:", (err as any)?.message || err);
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
      const idToUse = routeArtistId ?? getArtistIdForApi(artist);
      await fetchAllTracksForArtist(idToUse);
    } catch (err) {
      console.warn("[ArtistDetail] refreshTracks failed:", (err as any)?.message || err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTracks, artist, baseUrl, routeArtistId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const idToUse = routeArtistId ?? getArtistIdForApi(artist);
      console.log("[ArtistDetail] mount/fetch, routeArtistId:", routeArtistId, "resolvedArtistId:", idToUse, "routeName:", routeName);
      if (!idToUse) {
        setTracks([]);
        return;
      }
      await fetchAllTracksForArtist(idToUse);
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
      setTracks(undefined);
      setLoadingTracks(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artist?.id, artist?.name, baseUrl, routeArtistId]);

  // If artists not loaded yet and no fallback, avoid redirecting prematurely
  if (!artistsLoaded && !fallbackLoading && !fallbackArtist) {
    return <View style={defaultStyles.container} />;
  }

  // If artists loaded (or fallback attempted) but still not found -> redirect
  if (!artist && !fallbackLoading) {
    console.warn(`Artist ${routeName ?? routeArtistId} not found!`);
    return <Redirect href={`/(tabs)/artists`} />;
  }

  const artistWithAvatar = { ...(artist ?? { id: Number(routeArtistId), name: routeName ?? "Unknown Artist" }), avatar: avatarParam ?? artist?.avatar };

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
