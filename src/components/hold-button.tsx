import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Colors, Fonts } from '@/constants/theme';

const HOLD_MS = 1800;

/** Press and hold to confirm. The fill grows while held, resets on release, and fires `onDone` when full. */
export function HoldButton({ title, disabled, onDone }: { title: string; disabled?: boolean; onDone: () => void }) {
  const progress = useSharedValue(0);
  const fired = useSharedValue(false);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTicks = () => {
    if (ticker.current) clearInterval(ticker.current);
    ticker.current = null;
  };

  const done = () => {
    stopTicks();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  };

  useAnimatedReaction(
    () => progress.value,
    (p) => {
      if (p >= 1 && !fired.value) {
        fired.set(true);
        scheduleOnRN(done);
      }
    },
  );

  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Press and hold to confirm"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={() => {
        fired.set(false);
        progress.set(withTiming(1, { duration: HOLD_MS * (1 - progress.value), easing: Easing.linear }));
        stopTicks();
        ticker.current = setInterval(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 180);
      }}
      onPressOut={() => {
        stopTicks();
        if (!fired.value) progress.set(withTiming(0, { duration: 250 }));
      }}
      style={[styles.button, disabled && styles.disabled]}>
      <Animated.View style={[styles.fill, fill]} />
      <View style={styles.labelWrap} pointerEvents="none">
        <Text style={[styles.label, disabled && { color: Colors.text3 }]}>{title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Colors.text,
    justifyContent: 'center',
  },
  disabled: { backgroundColor: Colors.surfaceHigh },
  fill: { ...StyleSheet.absoluteFill, right: undefined, backgroundColor: Colors.accent },
  labelWrap: { alignItems: 'center' },
  label: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.onLight },
});
