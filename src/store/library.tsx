import { unknownArtistImageUri, unknownTracksImageUri } from "@/constants/images";
import { Artist, Playlist, TrackWithPlaylist } from "@/helpers/type";
import { fetchTracks } from "@/services/trackService";
import { useMemo, } from "react";
import { Track } from "react-native-track-player";
import { create } from "zustand";


interface LibraryState {
  tracks: TrackWithPlaylist[];
  toggleTrackFavorite: (track: Track) => void;
  fetch: () => Promise<void>;
  addToPlaylist: (track: Track, playlistName: string) => void
}

export const useLibraryStore = create<LibraryState>((set) => ({
  tracks: [],
  toggleTrackFavorite: (track) => set((state) => ({
    tracks: state.tracks.map((currentTrack) => {
      if (currentTrack.url === track.url) {
        return {
          ...currentTrack,
          rating: currentTrack.rating === 1 ? 0 : 1
        }
      }
      return currentTrack
    })
  })),
  addToPlaylist: (track, playlistName) => set((state) => ({
    tracks: state.tracks.map((currentTrack) => {
      if(currentTrack.url === track.url) {
        return{
          ...currentTrack,
          playlist: [...(currentTrack.playlist ?? []), playlistName]
        }
      }
      return currentTrack
    })
  })),
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
    () => tracks.filter((track) => track.rating == 1),
    [tracks]
  )

  return { favorites, toggleTrackFavorite }
}

export const useArtists = () => {
  const tracks = useLibraryStore((state) => state.tracks);

  return useMemo(() => {
    return tracks.reduce((acc, track) => {
      const existingArtist = acc.find((artist) => artist.name === track.artist)
      if (existingArtist) {
        existingArtist.tracks.push(track)
      } else {
        acc.push({
          name: track.artist ?? 'Unknown',
          tracks: [track],
          image: track.image ?? unknownArtistImageUri
        })
      }

      return acc
    }, [] as Artist[])
  }, [tracks]);
}


export const usePlaylists = () => {
  const tracks = useLibraryStore((state) => state.tracks)

  const playlists = useMemo(() => {
    return tracks.reduce((acc, track) => {
      track.playlist?.forEach((playlistName: any) => {
        const existingPlaylist = acc.find((playlist) => playlist.name === playlistName)

        if (existingPlaylist) {
          existingPlaylist.tracks.push(track)
        } else {
          acc.push({
            name: playlistName,
            tracks: [track],
            artworkPreview: track.artwork ?? unknownTracksImageUri,
          })
        }
      })

      return acc

    }, [] as Playlist[])

  }, [tracks])

  const addToPlaylist = useLibraryStore((state) => state.addToPlaylist)

  return { playlists, addToPlaylist }
}


