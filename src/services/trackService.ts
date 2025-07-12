// services/trackService.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "FirebaseConfig";
import { Track } from "react-native-track-player";

export const fetchTracks = async (): Promise<Track[]> => {
  const snapshot = await getDocs(collection(db, "tracks"));

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      title: data.title,
      artist: data.artists,
      artwork: data.artwork,
      url: data.url,
      playlist: typeof data.playlist === "string"
        ? data.playlist.split(",").map((tag: string) => tag.trim())
        : data.playlist,
      rating: (typeof data.rating !== "undefined" ? parseInt(data.rating, 10) : undefined),
    };
  });
};
