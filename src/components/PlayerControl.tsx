import { colors } from "@/constants/token"
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons"
import { TouchableOpacity, View, ViewStyle } from "react-native"
import TrackPlayer, { useIsPlaying } from "react-native-track-player"

type PlayerControlProps = {
    style?: ViewStyle
}

type PlayerButtonProps = {
    style?: ViewStyle
    iconSize?: number
}

export const PlayPauseButton = ({style, iconSize}: PlayerButtonProps) => {
    const {playing} = useIsPlaying();

    return (
        <View style={[{ height: iconSize }]}>
            <TouchableOpacity activeOpacity={0.85} onPress={playing ? TrackPlayer.pause : TrackPlayer.play}>
                <FontAwesome name={playing ? 'pause' : 'play'} size={iconSize} color={colors.text}/>
            </TouchableOpacity>
        </View>
    );
}

export const SkipToNextButton = ({style, iconSize = 30}: PlayerButtonProps) => {
    return (
        <TouchableOpacity activeOpacity={0.7} onPress={() =>TrackPlayer.skipToNext()}>
            <FontAwesome6 name="forward" size={iconSize} color={colors.text} />
        </TouchableOpacity>
    );
}

export const SkipToBackButton = ({style, iconSize = 30}: PlayerButtonProps) => {
    return (
        <TouchableOpacity activeOpacity={0.7} onPress={() => TrackPlayer.skipToPrevious()}>
            <FontAwesome6 name="backward" size={iconSize} color={colors.text} />
        </TouchableOpacity>
    );
}