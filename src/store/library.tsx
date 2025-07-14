import { TrackWithPlaylist } from "@/helpers/type";
import { fetchTracks } from "@/services/trackService";
import { useEffect, useMemo, useState } from "react";
import { Track } from "react-native-track-player";
import { create } from "zustand";

export const useFirebase = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const data = await fetchTracks();
        setTracks(data);
      } catch (error) {
        console.error("Error fetching tracks:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTracks();
  }, []);

  return { tracks, loading };
};

interface LibraryState {
    tracks: TrackWithPlaylist[];
    toggleTrackFavorite: (track: Track) => void;
    fetch: () => Promise<void>;
    addToPlaylist: (track: Track, playlistName: string) => void
}

export const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],
  toggleTrackFavorite: () => {},
  addToPlaylist: () => {},
  fetch: async () => {
    try {
      const data = await fetchTracks();
      set({ tracks: data }); // cập nhật store sau khi fetch xong
    } catch (e) {
      console.error("Failed to fetch tracks:", e);
    }
  },
}));
export const useTracks = () => useLibraryStore((state) => state.tracks)

export const useFavorites = () => {
  const tracks = useLibraryStore((state) => state.tracks)
  const toggleTrackFavorite = useLibraryStore((state) => state.toggleTrackFavorite)

  const favorites = useMemo(
    () => tracks.filter((track) => track.rating == 6),
    [tracks]
  )

  return { favorites, toggleTrackFavorite }
}
