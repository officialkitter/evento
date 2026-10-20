import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors } from './theme';

export function Loader({ size = 44, color = colors.gold }: { size?: number; color?: string }) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
  }, [rotation]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 50 50">
        <Circle cx={25} cy={25} r={20} stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="90 150" />
      </Svg>
    </Animated.View>
  );
}
