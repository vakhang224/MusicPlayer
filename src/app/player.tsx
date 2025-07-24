import { MovingText } from "@/components/MovingText";
import { PlayerControl, PlayPauseButton, SkipToBackButton, SkipToNextButton } from "@/components/PlayerControl";
import { PlayerProgressBar } from "@/components/PlayerProgressBar";
import { PlayerRepeat } from "@/components/PlayerRepeat";
import { PlayerVolumeBar } from "@/components/PlayerVolumeBar";
import { unknownTracksImageUri } from "@/constants/images";
import { colors, screenPadding } from "@/constants/token";
import { usePlayerBackground } from "@/hooks/usePlayerBackground";
import { useTrackPlayerFavorite } from "@/hooks/useTrackPlayerFavorite";
import { defaultStyles } from "@/styles";
import { FontAwesome6 } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/build/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import ImageColors from "react-native-image-colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RepeatMode, useActiveTrack } from "react-native-track-player";

const PlayerScreen = () => {
    const activeTrack = useActiveTrack();
    const {imageColors} = usePlayerBackground(activeTrack?.artwork ?? unknownTracksImageUri)

    const { top, bottom } = useSafeAreaInsets();

    const {isFavorites, toggleFavorite} = useTrackPlayerFavorite()
    if (!activeTrack)
        return (
            <View style={[defaultStyles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.icon} />
            </View>
        );

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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <DismissPlayer />
                <TrackTitle />
                <FontAwesome
                    name={isFavorites ? 'heart' : 'heart-o'}
                    size={30}
                    color={isFavorites ? colors.primary : colors.icon}
                    style={{ position: 'absolute', right: 0, top: top + 25 }}
                    onPress={toggleFavorite} />
            </View>
            <View style={{ flex: 1, marginTop: top + 95, marginBottom: bottom }}>
                <View style={styles.artworkImageContainer}>
                    <Image
                        source={{
                            uri: activeTrack.artwork ?? unknownTracksImageUri
                        }}
                        resizeMode="cover" style={styles.artworkImage}
                    />
                </View>
                <PlayerProgressBar style={{ marginTop: 70 }} />
                <View style={[{ marginTop: 30 }, styles.playerControlRow]}>
                    <SkipToBackButton />
                    <PlayPauseButton iconSize={60} />
                    <SkipToNextButton />

                </View>
                <View
                    style={{ alignItems: 'center', marginTop: 30 }}>
                    <PlayerRepeat />
                </View>
                <PlayerVolumeBar style={{ marginTop: 20 }} />
            </View>

        </View>
        </LinearGradient>
    );
}

const dismissPlayerLayout = () => {
    const router = useRouter();
    router.back();
}

const DismissPlayer = () => {
    const { top, bottom } = useSafeAreaInsets();
    return (
        <View style={{
            position: 'absolute',
            top: top + 30,
            left: 5
        }}>
            <TouchableOpacity onPress={dismissPlayerLayout}>
                <FontAwesome6 name="minimize" size={24} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const TrackTitle = () => {
    const activeTrack = useActiveTrack();
    const { top, bottom } = useSafeAreaInsets();
    return (
        <View style={{
            position: 'absolute',
            top: top + 20,
            left: 55,
            right: 0,
            flexDirection: 'column',
            justifyContent: 'flex-start',
            width: '70%',
        }}>
            <View style={{ overflow: "hidden" }}>
                <MovingText
                    text={activeTrack?.title ?? ''}
                    animationThreshold={10}
                    style={{ ...defaultStyles.text, overflow: "hidden" }}
                />
            </View>
            <Text
                style={{ ...defaultStyles.text, fontSize: 14, color: colors.text }}
            >
                {activeTrack?.artist ?? ''}
            </Text>
        </View>
    );
}


const styles = StyleSheet.create({
    playerLayout: {
        ...defaultStyles.container,
        paddingHorizontal: screenPadding.horizontal,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    artworkImageContainer: {
        shadowOffset: {
            width: 0,
            height: 8,
        },
        marginTop: 10,
        shadowOpacity: 0.44,
        shadowRadius: 11,
        flexDirection: 'row',
        justifyContent: 'center',
        height: '45%',
    },
    artworkImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 12,
    },
    playerControlRow: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    }

})

export default PlayerScreen