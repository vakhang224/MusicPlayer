// src/app/(tabs)/player.tsx
import React, { useCallback } from "react";
import { MovingText } from "@/components/MovingText";
import { PlayPauseButton, SkipToBackButton, SkipToNextButton } from "@/components/PlayerControl";
import { PlayerProgressBar } from "@/components/PlayerProgressBar";
import { PlayerRepeat } from "@/components/PlayerRepeat";
import { PlayerVolumeBar } from "@/components/PlayerVolumeBar";
import { unknownTracksImageUri } from "@/constants/images";
import { colors, screenPadding } from "@/constants/token";
import { usePlayerBackground } from "@/hooks/usePlayerBackground";
import useTrackPlayerFavorite from "@/hooks/useTrackPlayerFavorite";
import { defaultStyles } from "@/styles";
import { FontAwesome6 } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TrackPlayer, {
  useActiveTrack,
  usePlaybackState,
  State as TrackPlayerState
} from "react-native-track-player";

/**
 * Helper: normalize playback state to boolean isPlaying.
 * Accepts number, object, or string shapes returned by different TrackPlayer versions.
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
    console.warn("[PlayerScreen] isRawStatePlaying error:", e);
    return false;
  }
};

const PlayerScreen: React.FC = () => {
  // --- hooks at top level only ---
  const activeTrack = useActiveTrack();
  const rawPlaybackState = usePlaybackState();
  const isPlaying = isRawStatePlaying(rawPlaybackState);

  const { imageColors } = usePlayerBackground(activeTrack?.artwork ?? unknownTracksImageUri);
  const { top, bottom } = useSafeAreaInsets();

  const { isFavorites, isToggling, toggleFavorite: rawToggleFavorite } = useTrackPlayerFavorite();
  const router = useRouter();

  // handlers (useCallback)
  const toggleFavorite = useCallback(async () => {
    if (isToggling) {
      console.log("[PlayerScreen] toggle ignored because isToggling=true");
      return;
    }
    try {
      console.log("[PlayerScreen] user pressed favorite");
      await rawToggleFavorite();
    } catch (e) {
      console.warn("[PlayerScreen] toggleFavorite error:", e);
    }
  }, [rawToggleFavorite, isToggling]);

  const handleTogglePlay = useCallback(async () => {
    try {
      const rawState = await (TrackPlayer as any).getState?.();
      const currentlyPlaying =
        typeof rawState === "number"
          ? Number(rawState) === Number(TrackPlayerState.Playing)
          : String(rawState).toLowerCase().includes("play");

      if (currentlyPlaying) {
        if (typeof (TrackPlayer as any).pause === "function") {
          await (TrackPlayer as any).pause();
        }
      } else {
        if (typeof (TrackPlayer as any).play === "function") {
          await (TrackPlayer as any).play();
        }
      }

      // short poll to let native update state
      const MAX_WAIT = 1500;
      const INTERVAL = 100;
      const start = Date.now();
      while (Date.now() - start < MAX_WAIT) {
        const s = await (TrackPlayer as any).getState?.();
        const nowPlaying =
          typeof s === "number" ? Number(s) === Number(TrackPlayerState.Playing) : String(s).toLowerCase().includes("play");
        if (nowPlaying !== currentlyPlaying) break;
        await new Promise((r) => setTimeout(r, INTERVAL));
      }
    } catch (e) {
      console.warn("[PlayerScreen] handleTogglePlay error:", e);
    }
  }, []);

  const handleSkipBack = useCallback(async () => {
    try {
      if (typeof (TrackPlayer as any).skipToPrevious === "function") {
        await (TrackPlayer as any).skipToPrevious();
      } else {
        const idx = await TrackPlayer.getActiveTrackIndex();
        const q = await TrackPlayer.getQueue();
        const prevIdx = typeof idx === "number" ? Math.max(0, idx - 1) : 0;
        if (typeof (TrackPlayer as any).skip === "function") {
          await (TrackPlayer as any).skip(prevIdx);
        }
      }
    } catch (e) {
      console.warn("[PlayerScreen] handleSkipBack error:", e);
    }
  }, []);

  const handleSkipNext = useCallback(async () => {
    try {
      if (typeof (TrackPlayer as any).skipToNext === "function") {
        await (TrackPlayer as any).skipToNext();
      } else {
        const idx = await TrackPlayer.getActiveTrackIndex();
        const q = await TrackPlayer.getQueue();
        const nextIdx = typeof idx === "number" ? Math.min(q.length - 1, idx + 1) : 0;
        if (typeof (TrackPlayer as any).skip === "function") {
          await (TrackPlayer as any).skip(nextIdx);
        }
      }
    } catch (e) {
      console.warn("[PlayerScreen] handleSkipNext error:", e);
    }
  }, []);

  const dismissPlayer = useCallback(() => {
    try {
      router.back();
    } catch (e) {
      console.warn("[PlayerScreen] dismissPlayer error:", e);
    }
  }, [router]);

  if (!activeTrack) {
    return (
      <View style={[defaultStyles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.icon} />
      </View>
    );
  }

  // Inner components that use hooks are defined inside the component so hooks order is stable
  const DismissPlayer = () => {
    return (
      <View style={{ position: "absolute", top: top + 30, left: 5 }}>
        <TouchableOpacity onPress={dismissPlayer}>
          <FontAwesome6 name="minimize" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const TrackTitle = () => {
    return (
      <View
        style={{
          position: "absolute",
          top: top + 20,
          left: 55,
          right: 0,
          flexDirection: "column",
          justifyContent: "flex-start",
          width: "70%"
        }}
      >
        <View style={{ overflow: "hidden" }}>
          <MovingText text={activeTrack?.title ?? ""} animationThreshold={10} style={{ ...defaultStyles.text, overflow: "hidden" }} />
        </View>
        <Text style={{ ...defaultStyles.text, fontSize: 14, color: colors.text }}>{activeTrack?.artist ?? ""}</Text>
      </View>
    );
  };

  return (
    <LinearGradient
      style={{ flex: 1 }}
      colors={
        imageColors && imageColors.dominant && imageColors.average
          ? [imageColors.dominant, imageColors.average]
          : [colors.background, colors.background]
      }
    >
      <View style={styles.playerLayout}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <DismissPlayer />
          <TrackTitle />
          <TouchableOpacity
            onPress={toggleFavorite}
            style={{ position: "absolute", right: 0, top: top + 25, padding: 6, opacity: isToggling ? 0.6 : 1 }}
            activeOpacity={0.7}
            disabled={isToggling}
          >
            <FontAwesome
              name={isFavorites ? "heart" : "heart-o"}
              size={30}
              color={isFavorites ? colors.primary : colors.icon}
            />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, marginTop: top + 95, marginBottom: bottom }}>
          <View style={styles.artworkImageContainer}>
            <Image
              source={{
                uri: activeTrack.artwork ?? unknownTracksImageUri
              }}
              resizeMode="cover"
              style={styles.artworkImage}
            />
          </View>

          <PlayerProgressBar style={{ marginTop: 70 }} />

          <View style={[{ marginTop: 30 }, styles.playerControlRow]}>
            <SkipToBackButton onPress={handleSkipBack} iconSize={30} />
            <PlayPauseButton iconSize={60} onPress={handleTogglePlay} isPlaying={isPlaying} />
            <SkipToNextButton onPress={handleSkipNext} iconSize={30} />
          </View>

          <View style={{ alignItems: "center", marginTop: 30 }}>
            <PlayerRepeat />
          </View>

          <PlayerVolumeBar style={{ marginTop: 20 }} />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  playerLayout: {
    flex: 1,
    marginHorizontal: screenPadding.horizontal,
  },
  artworkImageContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  artworkImage: {
    width: 260,
    height: 260,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  playerControlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
});

export default PlayerScreen;
