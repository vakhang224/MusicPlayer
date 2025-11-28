// src/app/addToPlaylist.tsx
import { PlaylistsList } from "@/components/PlaylistsList";
import { screenPadding } from "@/constants/token";
import { Playlist, TrackWithPlaylist } from "@/helpers/type";
import { usePlaylists, useTracks } from "@/store/library";
import { useQueue } from "@/store/queue";
import { defaultStyles } from "@/styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, StyleSheet } from "react-native";
import TrackPlayer, { Track } from "react-native-track-player";
import { unknownTracksImageUri } from "@/constants/images";

/**
 * Helper: lấy ảnh cover từ bài hát đầu tiên hoặc fallback
 */
const getPlaylistCover = (playlist: Playlist) => {
  const tracks = Array.isArray(playlist.tracks) ? playlist.tracks : [];
  return tracks[0]?.artwork || unknownTracksImageUri;
};

const AddToPlaylistModule = () => {
  const router = useRouter();
  const { activeQueueId } = useQueue();
  const { playlists, addToPlaylist, addToPlaylistById } = usePlaylists();
  const params = useLocalSearchParams() as any;
  const trackUrlParam = params?.trackUrl as Track["url"] | undefined;
  const trackIdParam = params?.trackId ?? null;

  // Giả sử useTracks trả về mảng TrackWithPlaylist
  const tracks = useTracks();

  // Ưu tiên tìm theo id nếu có, fallback theo url
  const track = (() => {
    if (trackIdParam != null) {
      const idStr = String(trackIdParam);
      const byId = tracks.find((t) => String(t.id) === idStr);
      if (byId) return byId as TrackWithPlaylist;
      // nếu không tìm thấy trong library nhưng có url param, thử match url
      if (trackUrlParam) {
        const byUrl = tracks.find((t) => String(t.url) === String(trackUrlParam));
        if (byUrl) return byUrl as TrackWithPlaylist;
      }
      // nếu không tìm thấy, tạo minimal object để dùng addToPlaylistById
      return { id: Number(trackIdParam), url: trackUrlParam, title: "", artist: "", artwork: undefined, playlists: [], isFavorite: false } as any;
    }

    if (trackUrlParam) {
      const byUrl = tracks.find((currentTrack) => String(currentTrack.url) === String(trackUrlParam));
      if (byUrl) return byUrl as TrackWithPlaylist;
    }

    return null;
  })();

  if (!track) {
    console.error("Track not found for URL/ID:", { trackUrl: trackUrlParam, trackId: trackIdParam });
    return null;
  }

  // Lọc ra các playlist chưa chứa bài hát này (so sánh bằng id nếu có, fallback url)
  const availablePlaylists = playlists.filter((playlist) => {
    const existing = Array.isArray(playlist.tracks) ? playlist.tracks : [];
    return !existing.some((playlistTrack) => {
      if (track.id != null && playlistTrack?.id != null) {
        return String(playlistTrack.id) === String(track.id);
      }
      if (track.url && playlistTrack?.url) {
        return String(playlistTrack.url) === String(track.url);
      }
      return false;
    });
  });

  const handlePlaylistPress = async (playlist: Playlist) => {
    try {
      // Nếu có id hợp lệ, ưu tiên add bằng id
      if (track.id != null) {
        await addToPlaylistById(track.id, playlist.id);
      } else {
        // fallback: dùng object track (server sẽ xử lý theo id hoặc url)
        await addToPlaylist(track as TrackWithPlaylist, playlist.name);
      }

      // Nếu playlist đang active (theo tên queue), append vào native queue (best-effort)
      try {
        if (activeQueueId?.startsWith(String(playlist.name))) {
          const toAdd: any = {
            id: track.id ?? track.url ?? Math.random().toString(),
            url: track.url ?? undefined,
            title: (track as any).title ?? "Unknown",
            artist: (track as any).artist ?? undefined,
            artwork: (track as any).artwork ?? undefined,
          };
          if (toAdd.url) {
            await TrackPlayer.add(toAdd);
          }
        }
      } catch (e) {
        // ignore native queue append errors
      }

      router.dismiss();
    } catch (err) {
      console.error("[AddToPlaylist] handlePlaylistPress error:", err);
      // giữ UI ổn định, thông báo đơn giản
      alert("Không thể thêm bài hát vào playlist. Kiểm tra console để biết chi tiết.");
    }
  };

  return (
    <SafeAreaView style={[styles.moduleContainer, { paddingTop: 10 }]}>
      <PlaylistsList
        playlists={availablePlaylists.map((pl) => ({
          ...pl,
          cover: getPlaylistCover(pl),
        }))}
        onPlaylistPress={handlePlaylistPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  moduleContainer: {
    ...defaultStyles.container,
    paddingHorizontal: screenPadding.horizontal,
    flex: 1,
  },
});

export default AddToPlaylistModule;
