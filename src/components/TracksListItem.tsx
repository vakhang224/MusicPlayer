// src/components/TracksListItem.tsx
import React, { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableHighlight, View, ActivityIndicator } from "react-native";
import { Track, useActiveTrack, usePlaybackState, State as TrackPlayerState } from "react-native-track-player";
import { unknownTracksImageUri } from "@/constants/images";
import { colors, fontSize } from "@/constants/token";
import { defaultStyles } from "@/styles";
import { Entypo, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { TrackShortcutMenu } from "./TrackShortcutMenu";
import { Unduplicated } from "./Unduplicated";
import { TrackWithPlaylist } from "@/helpers/type";
import { getBaseUrl } from "@/services/baseUrlManager";
import { normalizeUrl } from "@/helpers/url";
import { useQueue } from "@/store/queue";

export type TracksListItemProps = {
  track: (Track | TrackWithPlaylist) & { verified?: number | boolean; artwork?: string; _localImageReloadToken?: number };
  onTrackSelected: (track: (Track | TrackWithPlaylist) & { verified?: number | boolean }) => void;
  playlistId?: number;
  hideMenu?: boolean;
  listId?: string;
};

const TracksListItem = ({ track, onTrackSelected, playlistId, hideMenu = false, listId }: TracksListItemProps) => {
  // --- hooks at top ---
  const rawPlaybackState = usePlaybackState();

  // normalize playback state to a numeric value (defensive for different return shapes)
  let numericPlaybackState: number | undefined;
  if (rawPlaybackState == null) {
    numericPlaybackState = undefined;
  } else if (typeof rawPlaybackState === "number") {
    numericPlaybackState = rawPlaybackState;
  } else if (typeof rawPlaybackState === "object" && "state" in rawPlaybackState) {
    // defensive cast for unexpected typings
    // @ts-ignore
    numericPlaybackState = (rawPlaybackState as any).state;
  } else {
    numericPlaybackState = undefined;
  }

  // compare as numbers to avoid TS mismatch
  const isPlaying = Number(numericPlaybackState) === Number(TrackPlayerState.Playing);

  const activeTrack = useActiveTrack();
  const { activeQueueId, userActivated } = useQueue();

  // --- derived values ---
  const activeUrl = activeTrack?.url ? normalizeUrl(String(activeTrack.url)) : null;
  const thisUrl = track?.url ? normalizeUrl(String(track.url)) : null;
  const isNativeActive = activeUrl && thisUrl ? activeUrl === thisUrl : false;

  // Only mark active when native active AND user explicitly activated AND same list
  const isActiveTrack = Boolean(isNativeActive && userActivated && listId && String(activeQueueId) === String(listId));

  // optional debug (no heavy logging)
  useEffect(() => {
    // console.debug("[TL] active check", { id: track.id, isNativeActive, isActiveTrack, userActivated, activeQueueId, listId });
  }, [isNativeActive, isActiveTrack, userActivated, activeQueueId, listId, track.id]);

  const baseUrl = getBaseUrl();
  const buildArtworkSrc = (raw?: string | undefined, token?: number) => {
    if (!raw) return unknownTracksImageUri;
    const base = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `${baseUrl}/${raw.replace(/^\/+/, "")}`;
    const encoded = normalizeUrl(base);
    return token ? `${encoded}${encoded.includes('?') ? '&' : '?'}t=${token}` : encoded;
  };
  const artworkUri = buildArtworkSrc(track.artwork, (track as any)?._localImageReloadToken);

  const handlePress = async () => {
    try { onTrackSelected(track); } catch (e) { console.warn("[TracksListItem] onTrackSelected failed:", e); }
    // NOTE: do NOT call playFromQueue here — TracksList (parent) will call store API to set rotated queue or skip.
  };

  return (
    <TouchableHighlight onPress={handlePress} underlayColor="transparent">
      <View style={styles.trackItemContainer}>
        <View>
          <Image
            source={{ uri: artworkUri }}
            style={[styles.trackArtworkImage, isActiveTrack ? styles.activeArtwork : null]}
            defaultSource={require('@/assets/unknown_track.png')}
          />

          {/* overlay + playing indicator */}
          {isActiveTrack && (
            <View style={styles.overlayContainer} pointerEvents="none">
              <View style={styles.overlayTint} />
              <View style={styles.playIconContainer}>
                {isPlaying ? (
                  <ActivityIndicator size="small" color={colors.icon} />
                ) : (
                  <Ionicons name="play" size={18} color={colors.icon} />
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.trackMenu}>
          <View style={styles.trackInfoContainer}>
            <Text numberOfLines={1} style={{ ...styles.trackTitleText, color: isActiveTrack ? colors.primary : colors.text }}>
              {track.title ?? 'Unknown Title'}
            </Text>

            {(track.artist || (track as any).artists) && (
              <View style={styles.artistContainer}>
                <Text numberOfLines={1} style={styles.trackArtistText}>
                  {track.artist || (track as any).artists}
                </Text>
                {track.verified === 1 && (
                  <MaterialIcons name="verified" size={16} color={colors.primary} style={styles.verifiedIcon} />
                )}
              </View>
            )}
          </View>

          {!hideMenu && (
            <Unduplicated>
              <TrackShortcutMenu track={track as TrackWithPlaylist} playlistId={playlistId}>
                <Entypo name="dots-three-horizontal" size={18} color={colors.icon} />
              </TrackShortcutMenu>
            </Unduplicated>
          )}
        </View>
      </View>
    </TouchableHighlight>
  );
};

const styles = StyleSheet.create({
  trackItemContainer: { flexDirection: "row", alignItems: "center", columnGap: 12, paddingVertical: 8 },
  trackArtworkImage: { borderRadius: 8, width: 50, height: 50, backgroundColor: '#2C2C2E' },
  activeArtwork: { opacity: 0.7 }, // slight dim under overlay
  overlayContainer: { position: 'absolute', top: 0, left: 0, width: 50, height: 50, borderRadius: 8, overflow: 'hidden' },
  overlayTint: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,250,229,0.12)' }, // subtle cyan tint
  playIconContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  trackMenu: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center", overflow: 'hidden' },
  trackInfoContainer: { flex: 1, marginRight: 8 },
  trackTitleText: { ...defaultStyles.text, fontSize: fontSize.sm, fontWeight: "600", color: colors.text, marginBottom: 2 },
  trackArtistText: { ...defaultStyles.text, color: colors.textMuted, fontSize: 14 },
  trackPlayingIconContainer: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  trackPlayingIconLoader: { width: 20, height: 20 },
  artistContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  verifiedIcon: { marginLeft: 4 },
});

export default React.memo(TracksListItem);
