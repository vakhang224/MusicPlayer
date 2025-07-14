import { ComponentProps } from "react";
import { RepeatMode } from "react-native-track-player"
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { match } from "ts-pattern";
import { colors } from "@/constants/token";
import { useTrackPlayerRepeat } from "@/hooks/useTrackPlayerRepeat";

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type IconProps = Omit<ComponentProps<typeof MaterialCommunityIcons>, 'name'>;

const repeatOrder = [RepeatMode.Off, RepeatMode.Track, RepeatMode.Queue] as const;

export const PlayerRepeat = ({ ...iconProps }: IconProps) => {
    const { repeatMode, changeRepeatMode } = useTrackPlayerRepeat();

    const toggleRepeatMode = () => {
        if (repeatMode == null) return;

        const currentIndex = repeatOrder.indexOf(repeatMode);
        const nextIndex = (currentIndex + 1) % repeatOrder.length;

        changeRepeatMode(repeatOrder[nextIndex])
    }

    const icon = match(repeatMode)
        .returnType<IconName>()
        .with(RepeatMode.Off, () => 'repeat-off')
        .with(RepeatMode.Track, () => 'repeat-once')
        .with(RepeatMode.Queue, () => 'repeat')
        .otherwise(() => 'repeat-off');

    return (
        <MaterialCommunityIcons
            name={icon}
            onPress={toggleRepeatMode}
            color={colors.icon}
            size={30}
            {...iconProps}
        />
    );

}