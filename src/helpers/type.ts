import { Track } from "react-native-track-player";

export type Playlist = {
    artwork: boolean;
    id: number;
    name: string;
    tracks: Track[];
    artworkPreview: string;
    cover?: string; // 🔹 thêm field cover (optional)
}

export type Artist = {
    id: number;           // 🔹 thêm id để định danh
    name: string;
    username?: string;    // 🔹 thêm username nếu cần
    avatar?: string;      // 🔹 thêm avatar
    // ----- ĐÃ XÓA 'image' -----
    isVerified?: boolean;
    isAdmin?: boolean;    // 🔹 thêm trạng thái admin
    tracks: Track[];
}

export type TrackWithPlaylist = Track & { playlists?: string[] }

export { Track };