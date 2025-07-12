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

    useEffect(() => {
        if (!shouldAnimate) return;

        translateX.value = withDelay(1000, withRepeat(withTiming(-textWidth, { duration: 5000, easing: Easing.linear }), -1, true))

        return () => {
            cancelAnimation(translateX);
            translateX.value = 0;
        }
    }, [shouldAnimate,translateX,text,animationThreshold,textWidth]);

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