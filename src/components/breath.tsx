import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { Colors } from '@/constants/theme';

/** A slow breathing orb: 4s in, 6s out, forever. */
export function BreathOrb({ size = 220, color = Colors.accent, style }: { size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 6000, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [t]);

  const outer = useAnimatedStyle(() => ({ opacity: 0.1 + t.value * 0.12, transform: [{ scale: 0.82 + t.value * 0.28 }] }));
  const middle = useAnimatedStyle(() => ({ opacity: 0.18 + t.value * 0.16, transform: [{ scale: 0.78 + t.value * 0.22 }] }));
  const core = useAnimatedStyle(() => ({ transform: [{ scale: 0.74 + t.value * 0.16 }] }));

  const circle = (k: number) => ({ width: size * k, height: size * k, borderRadius: (size * k) / 2 });

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, circle(1), { backgroundColor: color }, outer]} />
      <Animated.View style={[styles.abs, circle(0.74), { backgroundColor: color }, middle]} />
      <Animated.View style={[circle(0.46), { backgroundColor: color }, core]} />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
