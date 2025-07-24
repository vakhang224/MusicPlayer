import { Track } from "react-native-track-player";

export type Playlist = {
    name:string;
    tracks: Track[];
    artworkPreview: string;
}

export type Artist = {
    name: string;
    tracks: Track[];
    image: string;
}

export type TrackWithPlaylist = Track & {playlists?: string[]}