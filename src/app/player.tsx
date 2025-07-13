import { MovingText } from "@/components/MovingText";
import { PlayerControl } from "@/components/PlayerControl";
import { PlayerProgressBar } from "@/components/PlayerProgressBar";
import { unknownTracksImageUri } from "@/constants/images";
import { colors, screenPadding } from "@/constants/token";
import { defaultStyles } from "@/styles";
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome from "@expo/vector-icons/build/FontAwesome";
import { useRouter } from "expo-router";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveTrack } from "react-native-track-player";

const PlayerScreen = () => {
    const activeTrack = useActiveTrack();

    const { top, bottom } = useSafeAreaInsets();

    let isFavorite = false;

    const toggleFavorite = () => {
        if (isFavorite) {
            isFavorite = false;
        } else {
            isFavorite = true;
        }
    }

    if (!activeTrack)
        return (
            <View style={[defaultStyles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.icon} />
            </View>
        );

    return (
        <View style={styles.playerLayout}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <DismissPlayer />
                <TrackTitle />
                <FontAwesome 
                    name={isFavorite ? 'heart' : 'heart-o'} 
                    size={30} 
                    color={isFavorite ? colors.primary : colors.icon} 
                    style={{ position: 'absolute', right: 0, top: top + 25 }}
                    onPress={toggleFavorite} />
            </View>
            <View style={{ flex: 1, marginTop: top + 70, marginBottom: bottom }}>
                <View style={styles.artworkImageContainer}>
                    <Image
                        source={{
                            uri: activeTrack.artwork ?? unknownTracksImageUri
                        }}
                        resizeMode="cover" style={styles.artworkImage}
                    />
                </View>
                <PlayerProgressBar style={{marginTop: 80}}/>
                <PlayerControl style={{marginTop: 40}}/>
            </View>
            <View>

                {/* <Repeat/> */}
            </View>
            {/* <PlayerVolume/> */}
        </View>
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
            top: top + 25,
            left: 0,
            right: 320,
            flexDirection: 'row',
            justifyContent: 'center',
        }}>
            <TouchableOpacity onPress={dismissPlayerLayout}>
                <AntDesign name="shrink" size={32} color="white" />
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
            width: '75%',
        }}>
            <View style={{overflow: "hidden"}}>
                <MovingText 
                    text={activeTrack?.title ?? ''} 
                    animationThreshold={30} 
                    style={{...defaultStyles.text, overflow: "hidden"}} 
                />
            </View>
            <Text 
                style={{...defaultStyles.text, fontSize: 14, color: colors.text}}
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
    }
})

export default PlayerScreen