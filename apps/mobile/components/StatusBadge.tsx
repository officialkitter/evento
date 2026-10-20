import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { statusColor } from './theme';

export function StatusBadge({ status }: { status?: string }) {
  const color = statusColor(status);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (status === 'live') {
      pulse.value = withRepeat(withTiming(0.2, { duration: 900 }), -1, true);
    } else {
      pulse.value = 1;
    }
  }, [status, pulse]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.wrap, { backgroundColor: color + '1F', borderColor: color }]}>
      <Animated.View style={[styles.dot, { backgroundColor: color }, dotStyle]} />
      <Text style={[styles.text, { color }]}>{(status ?? 'draft').replace('_', ' ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
