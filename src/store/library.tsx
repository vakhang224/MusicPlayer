// src/store/library.tsx
import { create } from "zustand";
import { useMemo } from "react";
import { Track } from "react-native-track-player";
import {
  fetchTracks,
  fetchPlaylistsWithTracks,
  toggleFavorite as apiToggleFavorite,
  createPlaylist as apiCreatePlaylist,
  addTrackToPlaylist as apiAddTrackToPlaylist,
  removeTrackFromPlaylist as apiRemoveTrackFromPlaylist,
  removePlaylist as apiRemovePlaylist,
  fetchFavorites,
  fetchRecommendations,
} from "@/services/trackService";
import { Artist, Playlist, TrackWithPlaylist } from "@/helpers/type";
import { unknownArtistImageUri } from "@/constants/images";
import { getBaseUrl } from "@/services/baseUrlManager";
import { useAuth } from "@/context/AuthContext";
import { useUsers } from "@/hooks/useUsers";
import { normalizeUrl } from "@/helpers/url";

interface LibraryState {
  tracks: TrackWithPlaylist[];
  playlists: Playlist[];
  recommendedTracks: TrackWithPlaylist[];
  fetch: () => Promise<void>;
  refreshTracks: () => Promise<void>;
  toggleTrackFavorite: (track: TrackWithPlaylist | { id: number | string }) => Promise<void>;
  addToPlaylist: (track: TrackWithPlaylist, playlistName: string) => Promise<void>;
  addToPlaylistById: (trackId: number | string, playlistId: number) => Promise<void>;
  removeFromPlaylist: (track: TrackWithPlaylist, playlistId: number) => Promise<void>;
  createPlaylist: (playlistName: string) => Promise<void>;
  deletePlaylist: (playlistId: number) => Promise<void>;
  updateSingleTrack: (updatedTrack: Partial<TrackWithPlaylist>) => void;
  loadRecommendations: () => Promise<void>;
  clearRecommendations: () => void;
}

const resolveTrackPaths = (track: any, baseUrl: string): TrackWithPlaylist => {
  const artworkRaw = track.artwork ?? track.path ?? "";
  const artworkBase =
    artworkRaw && (artworkRaw.startsWith("http://") || artworkRaw.startsWith("https://"))
      ? artworkRaw
      : artworkRaw
      ? `${baseUrl}/${(artworkRaw as string).replace(/^\/+/, "")}`
      : undefined;

  const updatedAt = typeof track.updatedAt === "number" ? track.updatedAt : undefined;
  const artworkWithToken = artworkBase
    ? (() => {
        const encodedBase = normalizeUrl(artworkBase);
        return updatedAt ? `${encodedBase}${encodedBase.includes("?") ? "&" : "?"}t=${updatedAt}` : encodedBase;
      })()
    : undefined;

  const urlRaw = track.url ?? "";
  const urlResolved =
    urlRaw && (urlRaw.startsWith("http://") || urlRaw.startsWith("https://"))
      ? normalizeUrl(urlRaw)
      : urlRaw
      ? normalizeUrl(`${baseUrl}/${(urlRaw as string).replace(/^\/+/, "")}`)
      : undefined;

  return {
    ...track,
    artist: typeof track.artists === "string" ? track.artists.split(",")[0] || "Unknown" : track.artist || "Unknown",
    url: urlResolved,
    artwork: artworkWithToken,
    updatedAt,
    isFavorite: track.isFavorite === 1 || track.isFavorite === true,
    playlists: track.playlists ?? [],
  } as TrackWithPlaylist;
};

// Module-level debounce guard to avoid rapid duplicate toggles for same track
const _lastToggleTimestamps: Record<string, number> = {};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  playlists: [],
  recommendedTracks: [],

  loadRecommendations: async () => {
    try {
      const baseUrl = getBaseUrl();
      const recResult = await fetchRecommendations();
      const processed: TrackWithPlaylist[] = recResult.map((t: any) =>
        resolveTrackPaths({ ...t, isFavorite: t.isFavorite || false }, baseUrl)
      );
      set({ recommendedTracks: processed });
    } catch (err) {
      console.error("[LibraryStore] loadRecommendations error:", err);
    }
  },

  clearRecommendations: () => {
    set({ recommendedTracks: [] });
  },

  refreshTracks: async () => {
    try {
      const baseUrl = getBaseUrl();
      const [tracksResult, favoritesResult, playlistsResult] = await Promise.all([
        fetchTracks(),
        fetchFavorites(),
        fetchPlaylistsWithTracks(),
      ]);

      const favIds = Array.isArray(favoritesResult) ? favoritesResult.map((t: any) => (typeof t === "number" ? t : t.id)) : [];

      const processed: TrackWithPlaylist[] = tracksResult.map((t: any) => {
        const isFav = t.isFavorite === 1 || favIds.includes(t.id);
        const trackPlaylists = Array.isArray(playlistsResult)
          ? playlistsResult
              .filter((p: Playlist) => Array.isArray(p.tracks) && p.tracks.some((pt: Track) => pt.id === t.id))
              .map((p: Playlist) => p.id.toString())
          : [];
        return resolveTrackPaths({ ...t, isFavorite: isFav, playlists: trackPlaylists }, baseUrl);
      });

      set({ tracks: processed, playlists: playlistsResult || [] });
    } catch (error) {
      console.error("[LibraryStore] Refresh tracks error:", error);
      throw error;
    }
  },

  /**
   * Robust toggle favorite:
   * - Debounce guard per-track to avoid rapid duplicate toggles
   * - Call API then update local store using stringified id comparison
   * - Accepts either a full TrackWithPlaylist or a minimal object { id }
   */
  toggleTrackFavorite: async (track) => {
    try {
      const idStr = String((track as any).id ?? "");
      const idNum = Number((track as any).id);
      const DEBOUNCE_MS = 700;

      // debounce guard
      const now = Date.now();
      const last = _lastToggleTimestamps[idStr] ?? 0;
      if (now - last < DEBOUNCE_MS) {
        console.log(`[LibraryStore] toggle ignored (debounce) for id: ${idStr}`);
        return;
      }
      _lastToggleTimestamps[idStr] = now;

      console.log("[LibraryStore] toggleTrackFavorite called for id:", idNum);

      const res = await apiToggleFavorite(idNum);
      console.log("[LibraryStore] apiToggleFavorite response:", res);

      const newIsFavorite = typeof res?.isFavorite !== "undefined" ? Boolean(res.isFavorite) : !Boolean((track as any).isFavorite);

      // Update tracks (use String comparison to avoid number/string mismatch)
      set((state) => ({
        tracks: state.tracks.map((t) =>
          String(t.id) === idStr ? { ...t, isFavorite: newIsFavorite } : t
        ),
      }));

      // Update playlists entries if they contain track objects
      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (!Array.isArray(p.tracks)) return p;
          const updated = p.tracks.map((pt: any) =>
            String(pt.id) === idStr ? { ...pt, isFavorite: newIsFavorite } : pt
          );
          return { ...p, tracks: updated };
        }),
      }));

      console.log("[LibraryStore] toggleTrackFavorite updated local store for id:", idNum, "newIsFavorite:", newIsFavorite);
    } catch (err) {
      console.error("[LibraryStore] toggleTrackFavorite error:", err);
      throw err;
    } finally {
      // clear timestamp after a short window to avoid stale entries
      try {
        const key = String((track as any)?.id ?? "");
        setTimeout(() => {
          if (key) delete _lastToggleTimestamps[key];
        }, 1000);
      } catch {}
    }
  },

  /**
   * Legacy: addToPlaylist by passing a track object (keeps existing behavior).
   * This will call server API with track.id and update local store.
   */
  addToPlaylist: async (track, playlistName) => {
    try {
      let playlist = get().playlists.find((p) => p.name === playlistName);
      if (!playlist) {
        console.warn(`Playlist "${playlistName}" not found locally.`);
        return;
      }
      await apiAddTrackToPlaylist(playlist.id, Number(track.id));
      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlist?.id ? { ...p, tracks: [...(p.tracks ?? []), track] } : p)),
        tracks: state.tracks.map((t) =>
          String(t.id) === String(track.id) ? { ...t, playlists: Array.from(new Set([...(t.playlists ?? []), playlist?.id.toString()])) } : t
        ),
      }));
    } catch (err) {
      console.error("addToPlaylist error:", err);
    }
  },

  /**
   * New: addToPlaylistById - prefer adding by trackId (server expects track id).
   * This is the recommended path to avoid URL encoding mismatches.
   */
  addToPlaylistById: async (trackId, playlistId) => {
    try {
      await apiAddTrackToPlaylist(playlistId, Number(trackId));

      set((state) => {
        const trackObj = state.tracks.find((t) => String(t.id) === String(trackId)) ?? null;

        const updatedPlaylists = state.playlists.map((p) => {
          if (p.id === playlistId) {
            const existing = Array.isArray(p.tracks) ? p.tracks : [];
            const already = trackObj ? existing.some((et: any) => String(et.id) === String(trackId)) : false;
            return {
              ...p,
              tracks: already ? existing : [...existing, ...(trackObj ? [trackObj] : [])],
            };
          }
          return p;
        });

        const updatedTracks = state.tracks.map((t) =>
          String(t.id) === String(trackId)
            ? { ...t, playlists: Array.from(new Set([...(t.playlists ?? []), playlistId.toString()])) }
            : t
        );

        return { playlists: updatedPlaylists, tracks: updatedTracks };
      });
    } catch (err) {
      console.error("[LibraryStore] addToPlaylistById error:", err);
      throw err;
    }
  },

  removeFromPlaylist: async (track, playlistId) => {
    try {
      await apiRemoveTrackFromPlaylist(playlistId, Number(track.id));
      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlistId ? { ...p, tracks: (p.tracks ?? []).filter((t) => String(t.id) !== String(track.id)) } : p)),
        tracks: state.tracks.map((t) => (String(t.id) === String(track.id) ? { ...t, playlists: (t.playlists ?? []).filter((id) => Number(id) !== playlistId) } : t)),
      }));
    } catch (err) {
      console.error("removeFromPlaylist error:", err);
      throw err;
    }
  },

  createPlaylist: async (playlistName) => {
    try {
      const newPlaylist = await apiCreatePlaylist(playlistName);
      const playlistToAdd: Playlist = { id: newPlaylist.id, name: newPlaylist.name, tracks: [], artwork: false, artworkPreview: "" };
      set((state) => ({ playlists: [...state.playlists, playlistToAdd] }));
    } catch (err) {
      console.error("createPlaylist error:", err);
    }
  },

  deletePlaylist: async (playlistId) => {
    try {
      await apiRemovePlaylist(playlistId);
      set((state) => ({ playlists: state.playlists.filter((p) => p.id !== playlistId) }));
    } catch (err) {
      console.error("deletePlaylist error:", err);
    }
  },

  fetch: async () => {
    try {
      const baseUrl = getBaseUrl();
      const [tracksResult, playlistsResult, favoritesResult] = await Promise.all([fetchTracks(), fetchPlaylistsWithTracks(), fetchFavorites()]);

      const favIds = Array.isArray(favoritesResult) ? favoritesResult.map((t: any) => (typeof t === "number" ? t : t.id)) : [];

      const processed: TrackWithPlaylist[] = tracksResult.map((t: any) => {
        const isFav = t.isFavorite === 1 || favIds.includes(t.id);
        const trackPlaylists = Array.isArray(playlistsResult)
          ? playlistsResult
              .filter((p: Playlist) => Array.isArray(p.tracks) && p.tracks.some((pt: Track) => pt.id === t.id))
              .map((p: Playlist) => p.id.toString())
          : [];
        return resolveTrackPaths({ ...t, isFavorite: isFav, playlists: trackPlaylists }, baseUrl);
      });

      set({ tracks: processed, playlists: playlistsResult || [] });
    } catch (err: any) {
      console.error("Fetch library error:", err.message || err);
      throw err;
    }
  },

  updateSingleTrack: (updatedTrackData) => {
    const baseUrl = getBaseUrl();

    const resolvedUpdatedTrack = resolveTrackPaths(updatedTrackData ?? {}, baseUrl);

    set((state) => {
      const updatedTracks = state.tracks.map((track) => {
        if (track.id === resolvedUpdatedTrack.id) {
          return {
            ...track,
            title: resolvedUpdatedTrack.title ?? track.title,
            artists: resolvedUpdatedTrack.artists ?? track.artists,
            artist: resolvedUpdatedTrack.artist ?? track.artist,
            artwork: resolvedUpdatedTrack.artwork ?? track.artwork,
            url: resolvedUpdatedTrack.url ?? track.url,
            genre: resolvedUpdatedTrack.genre ?? track.genre,
            verified: typeof resolvedUpdatedTrack.verified !== "undefined" ? resolvedUpdatedTrack.verified : track.verified,
            isFavorite: typeof resolvedUpdatedTrack.isFavorite !== "undefined" ? resolvedUpdatedTrack.isFavorite : track.isFavorite,
            playlists: track.playlists,
            _localImageReloadToken: (updatedTrackData as any)?._localImageReloadToken ?? track._localImageReloadToken,
            updatedAt: resolvedUpdatedTrack.updatedAt ?? track.updatedAt,
          } as TrackWithPlaylist;
        }
        return track;
      });

      const updatedPlaylists = state.playlists.map((playlist) => {
        if (!Array.isArray(playlist.tracks)) return playlist;
        const trackIndex = playlist.tracks.findIndex((t) => t.id === resolvedUpdatedTrack.id);
        if (trackIndex > -1) {
          const newPlaylistTracks = [...playlist.tracks];
          newPlaylistTracks[trackIndex] = {
            ...newPlaylistTracks[trackIndex],
            title: resolvedUpdatedTrack.title ?? newPlaylistTracks[trackIndex].title,
            artwork: resolvedUpdatedTrack.artwork ?? newPlaylistTracks[trackIndex].artwork,
            artist: resolvedUpdatedTrack.artist ?? newPlaylistTracks[trackIndex].artist,
            updatedAt: resolvedUpdatedTrack.updatedAt ?? newPlaylistTracks[trackIndex].updatedAt,
          };
          return { ...playlist, tracks: newPlaylistTracks };
        }
        return playlist;
      });

      return { tracks: updatedTracks, playlists: updatedPlaylists };
    });
  },
}));

export const useTracks = () => useLibraryStore((state) => state.tracks);

export const useFavorites = () => {
  const tracks = useLibraryStore((state) => state.tracks);
  const toggleTrackFavorite = useLibraryStore((state) => state.toggleTrackFavorite);
  const favorites = useMemo(() => tracks.filter((t) => t.isFavorite), [tracks]);
  return { favorites, toggleTrackFavorite };
};

export const useArtists = () => {
  const tracks = useLibraryStore((state) => state.tracks);
  const { user } = useAuth();
  const baseUrl = getBaseUrl();
  const { users } = useUsers() as any;

  return useMemo<Array<Artist & { tracks: TrackWithPlaylist[] }>>(() => {
    if (!Array.isArray(users) || users.length === 0) {
      const artistsMap = new Map<string, Artist & { tracks: TrackWithPlaylist[] }>();
      tracks.forEach((track) => {
        const artistName = track.artist || "Unknown";
        if (!artistsMap.has(artistName)) {
          artistsMap.set(artistName, {
            id: -Math.abs(artistsMap.size + 1),
            name: artistName,
            tracks: [],
            avatar: unknownArtistImageUri,
          });
        }
        artistsMap.get(artistName)!.tracks.push(track);
      });
      return Array.from(artistsMap.values());
    }

    const tracksByUser = tracks.reduce<Record<number, TrackWithPlaylist[]>>((acc, t) => {
      const uid = Number((t as any).userId);
      if (!Number.isNaN(uid)) {
        if (!acc[uid]) acc[uid] = [];
        acc[uid].push(t);
      }
      return acc;
    }, {});

    const artists = users.map((u: any) => {
      const uid = Number(u.id);
      const userTracks = tracksByUser[uid] ?? [];
      const avatarUri = u.avatar
        ? u.avatar.startsWith("http")
          ? u.avatar
          : `${baseUrl}/${u.avatar.replace(/^\/+/, "")}`
        : unknownArtistImageUri;

      return {
        id: uid,
        name: u.name ?? u.username ?? "",
        tracks: userTracks,
        avatar: avatarUri,
        isVerified: u.isVerified === 1 || u.isVerified === true,
      } as Artist & { tracks: TrackWithPlaylist[] };
    });

    return artists;
  }, [tracks, users, user, baseUrl]);
};

export const usePlaylists = () => {
  const playlists = useLibraryStore((state) => state.playlists);
  const addToPlaylist = useLibraryStore((state) => state.addToPlaylist);
  const addToPlaylistById = useLibraryStore((state) => state.addToPlaylistById);
  const removeFromPlaylist = useLibraryStore((state) => state.removeFromPlaylist);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist);
  return { playlists, addToPlaylist, addToPlaylistById, removeFromPlaylist, createPlaylist, deletePlaylist };
};

export const useUpdateSingleTrack = () => useLibraryStore((state) => state.updateSingleTrack);
export { Artist };
