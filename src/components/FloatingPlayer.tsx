// src/components/FloatingPlayer.tsx
import React, { useCallback, useEffect } from "react";
import { Image, StyleSheet, TouchableOpacity, View, ViewProps, Text } from "react-native";
import TrackPlayer, { useActiveTrack, usePlaybackState, State as TrackPlayerState } from "react-native-track-player";
import { useLastActiveTrack } from "@/hooks/useLastActiveTrack";
import { MovingText } from "./MovingText";
import { PlayPauseButton, SkipToNextButton } from "./PlayerControl";
import { unknownTracksImageUri } from "@/constants/images";
import { defaultStyles } from "@/styles";
import { useQueue } from "@/store/queue";
import { normalizeUrl } from "@/helpers/url";
import { useRouter } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import useTrackPlayerFavorite from "@/hooks/useTrackPlayerFavorite";

/**
 * Robust helper to determine whether a raw playback state indicates "playing".
 */
const isRawStatePlaying = (raw: any) => {
  try {
    if (raw == null) return false;
    if (typeof raw === "number") return Number(raw) === Number(TrackPlayerState.Playing);
    if (typeof raw === "object") {
      const v = (raw as any).state ?? (raw as any).playbackState ?? raw;
      if (typeof v === "number") return Number(v) === Number(TrackPlayerState.Playing);
      if (typeof v === "string") {
        const s = String(v).toLowerCase();
        return s.includes("play") && !s.includes("paused") && !s.includes("stop");
      }
    }
    const s = String(raw).toLowerCase();
    return s.includes("play") && !s.includes("paused") && !s.includes("stop");
  } catch (e) {
    console.warn("[FloatingPlayer] isRawStatePlaying error:", e);
    return false;
  }
};

const FloatingPlayer = ({ style }: ViewProps) => {
  const activeTrack = useActiveTrack();
  const lastActiveTrack = useLastActiveTrack();
  const rawPlaybackState = usePlaybackState();
  const { userActivated } = useQueue();
  const router = useRouter();

  const favHook = useTrackPlayerFavorite();
  const isFavorites = favHook?.isFavorites ?? false;
  const isToggling = favHook?.isToggling ?? false;
  const toggleFavorite = favHook?.toggleFavorite ?? (async () => {});

  const isPlaying = isRawStatePlaying(rawPlaybackState);

  useEffect(() => {
    try {
      console.log("[FloatingPlayer] rawPlaybackState:", rawPlaybackState, "isPlaying:", isPlaying);
    } catch {}
  }, [rawPlaybackState, isPlaying]);

  const onTogglePlay = useCallback(async () => {
    try {
      const rawState = await (TrackPlayer as any).getState?.();
      const currentlyPlaying = isRawStatePlaying(rawState);

      if (currentlyPlaying) {
        if (typeof (TrackPlayer as any).pause === "function") {
          await (TrackPlayer as any).pause();
        }
      } else {
        if (typeof (TrackPlayer as any).play === "function") {
          await (TrackPlayer as any).play();
        }
      }

      // short poll to let native update
      const MAX_WAIT = 1200;
      const INTERVAL = 100;
      const start = Date.now();
      while (Date.now() - start < MAX_WAIT) {
        const s = await (TrackPlayer as any).getState?.();
        const nowPlaying = isRawStatePlaying(s);
        if (nowPlaying !== currentlyPlaying) break;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, INTERVAL));
      }
    } catch (e) {
      console.warn("[FloatingPlayer] toggle play failed:", e);
    }
  }, []);

  const onSkipNext = useCallback(async () => {
    try {
      if (typeof (TrackPlayer as any).skipToNext === "function") {
        await (TrackPlayer as any).skipToNext();
      }
    } catch (e) {
      console.warn("[FloatingPlayer] skip next failed:", e);
    }
  }, []);

  const onOpenPlayer = useCallback(() => {
    try {
      router.push("/player");
    } catch (e) {
      console.warn("[FloatingPlayer] open player failed:", e);
    }
  }, [router]);

  const onToggleFavorite = useCallback(async () => {
    if (isToggling) return;
    try {
      await toggleFavorite();
    } catch (e) {
      console.warn("[FloatingPlayer] toggleFavorite failed:", e);
    }
  }, [toggleFavorite, isToggling]);

  const displayTrack = activeTrack ?? lastActiveTrack;
  if (!displayTrack || !userActivated) return null;

  const title = displayTrack?.title ?? "Unknown";
  const artist = displayTrack?.artist ?? "";
  const artwork = displayTrack?.artwork ? normalizeUrl(String(displayTrack.artwork)) : undefined;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity onPress={onOpenPlayer} activeOpacity={0.9} style={styles.leftArea}>
        <Image source={{ uri: artwork ?? unknownTracksImageUri }} style={styles.trackArtwork} />

        <View style={styles.trackTitleContainer}>
          {/* MovingText: pass numberOfLines/ellipsizeMode if supported; fallback to Text for safety */}
          <MovingText
            text={title}
            style={styles.trackTitle}
            animationThreshold={25}
            // @ts-ignore allow optional props if MovingText supports them
            numberOfLines={1}
            // @ts-ignore
            ellipsizeMode="tail"
          />
          <Text numberOfLines={1} ellipsizeMode="tail" style={styles.trackArtist}>
            {artist}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.trackControl}>
        <TouchableOpacity
          onPress={onToggleFavorite}
          style={styles.iconButton}
          activeOpacity={0.7}
          disabled={isToggling}
        >
          <FontAwesome name={isFavorites ? "heart" : "heart-o"} size={18} color={isFavorites ? "#05fae5" : "#fff"} />
        </TouchableOpacity>

        <View style={{ marginLeft: 10 }}>
          <PlayPauseButton iconSize={24} onPress={onTogglePlay} isPlaying={Boolean(isPlaying)} />
        </View>
        <TouchableOpacity onPress={() => onSkipNext()} style={styles.iconButton} activeOpacity={0.7}>
          <SkipToNextButton iconSize={24} onPress={() => onSkipNext()} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#111",
    borderRadius: 10,
    marginBottom: 15,
  },
  leftArea: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0, // important for Android text truncation
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 10,
  },
  trackTitleContainer: {
    flex: 1,
    minWidth: 0, // allow shrinking on Android
    overflow: "hidden",
  },
  trackTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    flexShrink: 1,
  },
  trackArtist: {
    color: "#ddd",
    fontSize: 12,
    marginTop: 2,
    flexShrink: 1,
  },
  trackControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },
  iconButton: {
    padding: 8,
  },
});

export default FloatingPlayer;
