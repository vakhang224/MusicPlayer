// src/components/TrackShortcutMenu.tsx
import { useLibraryStore } from "@/store/library";
import { useQueue } from "@/store/queue";
import { MenuView } from "@react-native-menu/menu";
import { useRouter } from "expo-router";
import React, { PropsWithChildren, useMemo } from "react";
import { Track } from "react-native-track-player";
import { match } from "ts-pattern";
import { useTranslation } from "react-i18next";
import { normalizeUrl } from "@/helpers/url";

type TrackShortcutMenuProps = PropsWithChildren<{
  track: Track & { playlists?: string[] };
  playlistId?: number;
}>;

export const TrackShortcutMenu = ({ track, children, playlistId }: TrackShortcutMenuProps) => {
  const router = useRouter();
  const { t } = useTranslation();

  const toggleTrackFavorite = useLibraryStore((state) => state.toggleTrackFavorite);
  const removeFromPlaylist = useLibraryStore((state) => state.removeFromPlaylist);
  const playlists = useLibraryStore((state) => state.playlists);

  // informational only; do not call TrackPlayer from menu actions
  const { activeQueueId } = useQueue();

  const isFavorite = track.isFavorite === true;

  const isInThisPlaylist = useMemo(() => {
    if (!playlistId) return false;
    const pl = playlists.find((p) => p.id === playlistId);
    return !!pl && !!pl.tracks && pl.tracks.some((t) => t.id === track.id);
  }, [playlists, playlistId, track.id]);

  const handlePressAction = (id: string) => {
    match(id)
      .with("add-to-favorite", async () => {
        // Await toggle so store updates before menu closes
        try {
          await toggleTrackFavorite({ ...track, playlists: track.playlists?.map(String) });
        } catch (e) {
          console.warn("[TrackShortcutMenu] toggle favorite error:", e);
        }
      })
      .with("remove-from-favorite", async () => {
        try {
          await toggleTrackFavorite({ ...track, playlists: track.playlists?.map(String) });
        } catch (e) {
          console.warn("[TrackShortcutMenu] toggle favorite error:", e);
        }
      })
      .with("add-to-playlist", () => {
        // Pass both id and normalized url so addToPlaylist screen can match robustly
        const payload: Record<string, string | number | null> = {
          trackId: (track as any).id ?? null,
          trackUrl: track.url ? normalizeUrl(String(track.url)) : null,
        };
        router.push({ pathname: "/addToPlaylist", params: payload });
      })
      .with("remove-from-playlist", async () => {
        if (!playlistId) return;
        const pl = playlists.find((p) => p.id === playlistId);
        if (!pl) return;
        try {
          await removeFromPlaylist(track as any, playlistId);
        } catch (e) {
          console.warn("[TrackShortcutMenu] removeFromPlaylist error:", e);
        }
      })
      .otherwise(() => console.warn(`Unknown menu action ${id}`));
  };

  return (
    <MenuView
      onPressAction={({ nativeEvent: { event } }) => handlePressAction(event)}
      actions={[
        {
          id: isFavorite ? "remove-from-favorite" : "add-to-favorite",
          title: isFavorite ? t("menu.removeFromFavorite") : t("menu.addToFavorite"),
          image: isFavorite ? "star.fill" : "star",
        },
        isInThisPlaylist
          ? {
              id: "remove-from-playlist",
              title: t("menu.removeFromPlaylist"),
              image: "trash",
            }
          : {
              id: "add-to-playlist",
              title: t("menu.addToPlaylist"),
              image: "text.badge.plus",
            },
      ]}
    >
      {children}
    </MenuView>
  );
};

export default TrackShortcutMenu;
