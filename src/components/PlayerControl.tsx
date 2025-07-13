import { colors } from "@/constants/token"
import { FontAwesome, FontAwesome6 } from "@expo/vector-icons"
import { StyleSheet, TouchableOpacity, View, ViewStyle } from "react-native"
import TrackPlayer, { useIsPlaying } from "react-native-track-player"

type PlayerControlProps = {
    style?: ViewStyle
}

type PlayerButtonProps = {
    style?: ViewStyle
    iconSize?: number
}

export const PlayerControl = ({ style }: PlayerControlProps) => {
    return (
        <View style={[styles.container, style]}>
            <View style={styles.row}>
                <SkipToBackButton/>
                <PlayPauseButton/>
                <SkipToNextButton/>
            </View>
        </View>
    );
}

export const PlayPauseButton = ({style, iconSize}: PlayerButtonProps) => {
    const {playing} = useIsPlaying();

    return (
        <View style={[{ height: iconSize }]}>
            <TouchableOpacity activeOpacity={0.85} onPress={playing ? TrackPlayer.pause : TrackPlayer.play}>
                <FontAwesome name={playing ? 'pause' : 'play'} size={50} color={colors.text}/>
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

const styles = StyleSheet.create({
    container: {
        width: '100%'
    },
    row:{
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems:'center'  
    }
})