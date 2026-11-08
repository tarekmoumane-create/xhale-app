import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Breather } from '@/components/breather';
import { Icon, LinkButton } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { setState, useStore } from '@/lib/store';

type Target = 'today' | 'craving' | 'plan' | 'recovery';

const SIZE = 80;
// Breather's own box is wider and taller than the face.
const BOX_W = SIZE * 1.35;
const BOX_H = SIZE * 1.1;
const ARROW = 30;
const MOVE = { duration: 650, easing: Easing.inOut(Easing.cubic) };

/**
 * A tiny first-run tour on Today, right after the paywall. No card: the buddy itself slides
 * across the screen to Today, the craving button, Plan and Recovery, with a line of text above it.
 * Tap anywhere to go on. Shown once.
 */
export function Tour() {
  const seen = useStore((s) => s.tourSeen);
  const name = useStore((s) => s.name);
  const [i, setI] = useState(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  // The floating craving button sits insets.bottom + 62 from the bottom, 52 tall.
  const btnBottom = insets.bottom + 62;
  const btnH = 52;
  // Just above the tab bar, where the buddy points down at a tab.
  const tabArrowBottom = insets.bottom + 58;

  const steps: { target: Target; text: string; x: number; arrowBottom: number }[] = [
    {
      target: 'today',
      text: `Hi${name ? ` ${name}` : ''}! I’m your buddy. Today shows your streak and the money you’ve kept.`,
      x: width * 0.2,
      arrowBottom: tabArrowBottom,
    },
    { target: 'craving', text: 'Craving? Tap this anytime. I’ll breathe you through it.', x: width / 2, arrowBottom: btnBottom + btnH + 10 },
    { target: 'plan', text: 'Plan has your go-to moves for your hardest moments.', x: width / 2, arrowBottom: tabArrowBottom },
    { target: 'recovery', text: 'Recovery shows your body healing, day by day.', x: width * 0.8, arrowBottom: tabArrowBottom },
  ];
  const step = steps[i];

  const x = useSharedValue(step.x);
  const bottom = useSharedValue(step.arrowBottom);
  useEffect(() => {
    x.set(withTiming(step.x, MOVE));
    bottom.set(withTiming(step.arrowBottom, MOVE));
  }, [step.x, step.arrowBottom, x, bottom]);

  const buddyStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - BOX_W / 2 }],
    bottom: bottom.value + ARROW,
  }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value - ARROW / 2 }],
    bottom: bottom.value,
  }));
  const textStyle = useAnimatedStyle(() => ({ bottom: bottom.value + ARROW + BOX_H + 6 }));

  if (seen) return null;
  const last = i === steps.length - 1;
  const done = () => setState({ tourSeen: true });
  const next = () => {
    Haptics.selectionAsync();
    if (last) done();
    else setI(i + 1);
  };

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
      <Pressable accessibilityRole="button" accessibilityLabel={last ? 'Finish tour' : 'Next'} onPress={next} style={StyleSheet.absoluteFill}>
        {step.target === 'craving' ? (
          <CutoutDim width={width} holeW={286} holeH={btnH + 16} holeBottom={btnBottom - 8} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.dim]} />
        )}
      </Pressable>

      <View pointerEvents="box-none" style={[styles.skip, { top: insets.top + 10 }]}>
        <LinkButton title="Skip" onPress={done} />
      </View>

      <Animated.View pointerEvents="none" style={[styles.textWrap, textStyle]}>
        <Animated.Text key={i} entering={FadeIn.duration(350)} style={styles.text}>
          {step.text}
        </Animated.Text>
        <Text style={styles.hint}>{last ? 'Tap to start' : `Tap to continue · ${i + 1} of ${steps.length}`}</Text>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.abs, buddyStyle]}>
        <Breather mood="hello" scale={scale} size={SIZE} />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.abs, arrowStyle]}>
        <Bob>
          <Icon name="arrow.down" android="arrow_downward" size={24} color={Colors.accent} />
        </Bob>
      </Animated.View>
    </Animated.View>
  );
}

/** Dims the screen except a rounded hole around the craving button. */
function CutoutDim({ width, holeW, holeH, holeBottom }: { width: number; holeW: number; holeH: number; holeBottom: number }) {
  const { height } = useWindowDimensions();
  const x = (width - holeW) / 2;
  const y = height - holeBottom - holeH;
  const r = holeH / 2;
  const d =
    `M0 0 H${width} V${height} H0 Z ` +
    `M${x + r} ${y} H${x + holeW - r} A${r} ${r} 0 0 1 ${x + holeW - r} ${y + holeH} H${x + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  return (
    <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
      <Path d={d} fill="rgba(4,6,8,0.8)" fillRule="evenodd" />
    </Svg>
  );
}

/** Gently bobs its child up and down. */
function Bob({ children }: { children: React.ReactNode }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [v]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: v.value * 6 }] }));
  return <Animated.View style={[{ width: ARROW, height: ARROW, alignItems: 'center', justifyContent: 'center' }, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(4,6,8,0.8)' },
  abs: { position: 'absolute', left: 0 },
  skip: { position: 'absolute', right: 22 },
  textWrap: { position: 'absolute', left: 28, right: 28, alignItems: 'center', gap: 8 },
  text: { fontFamily: Fonts.displaySemi, fontSize: 22, lineHeight: 29, color: Colors.text, textAlign: 'center' },
  hint: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text3 },
});
