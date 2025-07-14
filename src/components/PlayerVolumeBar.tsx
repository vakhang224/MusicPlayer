import { View, ViewProps } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import {Ionicons} from "@expo/vector-icons"
import { colors } from "@/constants/token";
import { Slider } from "react-native-awesome-slider";
import { utilsStyles } from "@/styles";
import { useTrackPlayerVolume } from "@/hooks/useTrackPlayerVolume";

export const PlayerVolumeBar = ({ style }: ViewProps) => {
    const {volume, updateVolume} = useTrackPlayerVolume()


    const progress = useSharedValue(0);
    const min = useSharedValue(0);
    const max = useSharedValue(1);

    progress.value = volume ?? 0;

    return (
        <View style={style}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Ionicons name='volume-low' size={20} color={colors.icon} style={{opacity: 0.8}}/>


                <View style={{flex: 1, flexDirection: 'row', paddingHorizontal: 10}}>
                    <Slider
                        progress={progress}
                        minimumValue={min}
                        maximumValue={max}
                        containerStyle={utilsStyles.slider}
                        onValueChange={(value) => {
                            updateVolume(value)
                        }}
                        renderBubble={() => null}
                        theme={{
                            maximumTrackTintColor: colors.maxTrackTintColor,
                            minimumTrackTintColor: colors.minTrackTintColor,
                        }}
                        thumbWidth={0}
                    />
                </View>
                <Ionicons name='volume-high' size={20} color={colors.icon} style={{opacity: 0.8}}/>
            </View>
        </View>
    );
} 