import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Breather } from '@/components/breather';
import { Button, Icon, LinkButton } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { setState, useStore } from '@/lib/store';

type Target = 'none' | 'craving' | 'plan' | 'recovery';

/**
 * A tiny first-run tour on Today, right after the paywall. The buddy points out Today,
 * the craving button, and the Plan and Recovery tabs, one at a time. Shown once.
 */
export function Tour() {
  const seen = useStore((s) => s.tourSeen);
  const name = useStore((s) => s.name);
  const [i, setI] = useState(0);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const steps: { target: Target; text: string }[] = [
    { target: 'none', text: `Hi${name ? ` ${name}` : ''}! I’m your buddy. This is Today, where you see your streak and the money you’ve kept.` },
    { target: 'craving', text: 'Craving? Tap this anytime. I’ll breathe you through it.' },
    { target: 'plan', text: 'Plan has your go-to moves for your hardest moments.' },
    { target: 'recovery', text: 'Recovery shows your body healing, day by day.' },
  ];

  if (seen) return null;
  const step = steps[i];
  const last = i === steps.length - 1;
  const done = () => setState({ tourSeen: true });
  const next = () => {
    Haptics.selectionAsync();
    if (last) done();
    else setI(i + 1);
  };

  // The floating craving button sits insets.bottom + 62 from the bottom, 52 tall.
  const btnW = 270;
  const btnH = 52;
  const btnBottom = insets.bottom + 62;
  const pad = 8;

  return (
    <Animated.View entering={FadeIn.duration(400)} exiting={FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
      {step.target === 'craving' ? (
        <CutoutDim width={width} holeW={btnW + pad * 2} holeH={btnH + pad * 2} holeBottom={btnBottom - pad} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.dim]} />
      )}

      <View style={[styles.card, { top: insets.top + 90 }]}>
        <Breather mood="hello" scale={scale} size={84} />
        <Animated.Text key={i} entering={FadeIn.duration(300)} style={styles.text}>
          {step.text}
        </Animated.Text>
        <View style={styles.row}>
          <Text style={styles.count}>
            {i + 1} of {steps.length}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            {!last ? <LinkButton title="Skip" onPress={done} /> : null}
            <Button title={last ? 'Let’s go' : 'Next'} onPress={next} style={{ height: 48, paddingHorizontal: 26 }} />
          </View>
        </View>
      </View>

      {step.target === 'craving' ? <Pointer x={width / 2} bottom={btnBottom + btnH + pad + 6} /> : null}
      {step.target === 'plan' ? <Pointer x={width / 2} bottom={insets.bottom + 54} /> : null}
      {step.target === 'recovery' ? <Pointer x={width * 0.8} bottom={insets.bottom + 54} /> : null}
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
      <Path d={d} fill="rgba(4,6,8,0.78)" fillRule="evenodd" />
    </Svg>
  );
}

/** A gently bobbing arrow pointing down at what's being shown. */
function Pointer({ x, bottom }: { x: number; bottom: number }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value * 8 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.pointer, { left: x - 20, bottom }, style]}>
      <Icon name="arrow.down" android="arrow_downward" size={26} color={Colors.accent} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(4,6,8,0.78)' },
  card: {
    position: 'absolute',
    left: 22,
    right: 22,
    alignItems: 'center',
    gap: 6,
    padding: 18,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  text: { fontFamily: Fonts.semi, fontSize: 18, lineHeight: 25, color: Colors.text, textAlign: 'center' },
  row: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10 },
  count: { fontFamily: Fonts.body, fontSize: 13, color: Colors.text3 },
  pointer: { position: 'absolute', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
