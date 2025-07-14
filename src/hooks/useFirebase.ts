import { useEffect, useState } from "react";
import { fetchTracks } from "@/services/trackService";
import { Track } from "react-native-track-player";

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
