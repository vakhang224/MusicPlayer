import { useEffect } from 'react';
import { TextStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
export type MovingTextProps = {
    text: string;
    animationThreshold: number;
    style?: TextStyle;
}

export const MovingText = ({ text, animationThreshold,style }: MovingTextProps) => {
    const translateX = useSharedValue(0);
    const shouldAnimate = text.length >= animationThreshold;
    const textWidth = text.length * 3;

    // EXTRA: push further left and slow down so the text travels deeper to the left
    const extraLeft = 100; // increase this to push further left
    const durationMs = 9000; // increase duration so travel is slower / longer

    useEffect(() => {
        if (!shouldAnimate) return;

        // animate to a deeper left position and take longer to do so
        translateX.value = withDelay(
            1000,
            withRepeat(
                withTiming(-(textWidth + extraLeft), { duration: durationMs, easing: Easing.linear }),
                -1,
                true
            )
        );

        return () => {
            cancelAnimation(translateX);
            translateX.value = 0;
        }
    }, [shouldAnimate, translateX, text, animationThreshold, textWidth, extraLeft, durationMs]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    return (
        <Animated.Text numberOfLines={1} style={[
            style,
            animatedStyle,
            shouldAnimate && {
                width: 9999,
                paddingLeft: 16,
            }
        ]}>
            {text}
        </Animated.Text>
    );
}

export default MovingText;
