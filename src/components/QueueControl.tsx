import { colors } from "@/constants/token"
import { defaultStyles } from "@/styles"
import { StyleSheet, Text, TouchableOpacity, View, ViewProps } from "react-native"
import TrackPlayer, { Track } from "react-native-track-player"
import { Ionicons, FontAwesome } from '@expo/vector-icons'

type QueueControlProps = {
    track: Track[]
} & ViewProps

export const QueueControl = ({ track, style, ...viewProps }: QueueControlProps) => {
    const handlePlay = async () => {
        await TrackPlayer.setQueue(track);
        await TrackPlayer.play();
    }

    const handleShufflePlay = async () => {
        const suffleTrack = [...track].sort(() => Math.random() - 0.5);

        await TrackPlayer.setQueue(suffleTrack);
        await TrackPlayer.play();
    }

    return (
        <View style={[{ flexDirection: 'row', columnGap: 16 }, style]}>
            <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={handlePlay} activeOpacity={0.8} style={styles.button}>
                    <FontAwesome name='play' size={18} color={colors.primary}/>
                    <Text style={styles.buttonText}>Play</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={handleShufflePlay} activeOpacity={0.8} style={styles.button}>
                    <FontAwesome name='random' size={18} color={colors.primary} style={{marginTop:3}} />
                    <Text style={styles.buttonText}>Shuffle</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        padding: 12,
        backgroundColor: 'rgba(47,47,47,0.5)',
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        columnGap: 8,
    },
    buttonText: {
        ...defaultStyles.text,
        color: colors.primary,
        fontWeight: '600',
        fontSize: 18,
        textAlign: 'center'
    }
})