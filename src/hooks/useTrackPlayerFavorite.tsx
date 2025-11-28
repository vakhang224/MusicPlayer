// src/hooks/useTrackPlayerFavorite.tsx
import { useCallback, useMemo, useRef, useState } from "react";
import { useActiveTrack } from "react-native-track-player";
import { useFavorites, useTracks } from "@/store/library";
import { normalizeUrl } from "@/helpers/url";

/**
 * Robust hook with in-flight lock and debounce to avoid double toggles.
 * Returns: { isFavorites, isToggling, toggleFavorite }
 */
export const useTrackPlayerFavorite = () => {
  const activeTrack = useActiveTrack();
  const { favorites, toggleTrackFavorite } = useFavorites();
  const allTracks = useTracks();

  const [isToggling, setIsToggling] = useState(false);
  const toggleLockRef = useRef(false);

  const normalize = (u?: any) => (u ? normalizeUrl(String(u)) : "");
  const getFilename = (u?: string) => {
    try {
      if (!u) return "";
      const parts = String(u).split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : String(u);
    } catch {
      return String(u ?? "");
    }
  };

  const matchedTrack = useMemo(() => {
    if (!activeTrack) return null;
    const activeId = activeTrack?.id != null ? String(activeTrack.id) : "";
    const activeUrl = activeTrack?.url ? normalize(activeTrack.url) : "";

    // 1) match by id
    if (activeId) {
      const byId = allTracks.find((t) => String(t?.id ?? "") === activeId);
      if (byId) return byId;
    }

    // 2) match by normalized url
    if (activeUrl) {
      const byUrl = allTracks.find((t) => (t?.url ? normalize(t.url) === activeUrl : false));
      if (byUrl) return byUrl;
    }

    // 3) try decode/encode variants
    if (activeUrl) {
      try {
        const decoded = normalize(decodeURI(activeUrl));
        const byDecoded = allTracks.find((t) => (t?.url ? normalize(t.url) === decoded : false));
        if (byDecoded) return byDecoded;
      } catch {}
      try {
        const encoded = normalize(encodeURI(String(activeTrack.url ?? activeUrl)));
        const byEncoded = allTracks.find((t) => (t?.url ? normalize(t.url) === encoded : false));
        if (byEncoded) return byEncoded;
      } catch {}
    }

    // 4) filename fallback
    const activeFilename = getFilename(activeUrl || String(activeTrack?.url ?? ""));
    if (activeFilename) {
      const byFilename = allTracks.find((t) => {
        const tFilename = getFilename(t?.url ?? "");
        return tFilename && tFilename === activeFilename;
      });
      if (byFilename) return byFilename;
    }

    // 5) fallback: check favorites list
    if (activeId) {
      const favById = favorites.find((t) => String(t.id) === activeId);
      if (favById) return favById;
    }
    if (activeUrl) {
      const favByUrl = favorites.find((t) => (t?.url ? normalize(t.url) === activeUrl : false));
      if (favByUrl) return favByUrl;
    }

    return null;
  }, [activeTrack, allTracks, favorites]);

  const isFavorites = Boolean(matchedTrack ? matchedTrack.isFavorite : false);

  const toggleFavorite = useCallback(async () => {
    // Prevent concurrent toggles
    if (toggleLockRef.current) {
      console.log("[useTrackPlayerFavorite] toggle ignored: already in-flight");
      return;
    }
    toggleLockRef.current = true;
    setIsToggling(true);

    try {
      if (matchedTrack) {
        await toggleTrackFavorite(matchedTrack);
        return;
      }

      // If no matched library track but activeTrack has an id, attempt toggle by id
      if (activeTrack?.id != null) {
        const minimal = { id: activeTrack.id } as any;
        console.warn("[useTrackPlayerFavorite] No matching library track found; attempting toggle by id with minimal object:", minimal);
        await toggleTrackFavorite(minimal);
        return;
      }

      console.warn("[useTrackPlayerFavorite] No matching library track found for activeTrack; cannot toggle favorite. activeTrack snapshot:", activeTrack);
    } catch (e) {
      console.warn("[useTrackPlayerFavorite] toggleFavorite error:", e);
      throw e;
    } finally {
      // small delay to coalesce rapid presses (debounce)
      await new Promise((r) => setTimeout(r, 300));
      toggleLockRef.current = false;
      setIsToggling(false);
    }
  }, [matchedTrack, toggleTrackFavorite, activeTrack]);

  return { isFavorites, isToggling, toggleFavorite };
};

export default useTrackPlayerFavorite;
