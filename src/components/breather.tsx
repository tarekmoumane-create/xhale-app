import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

import { Colors, Fonts } from '@/constants/theme';

export type BreatherMood = 'hello' | 'in' | 'out' | 'happy';

const INK = '#0B2E2A';
const CHEEK = 'rgba(255,128,110,0.38)';
// Slightly uneven, like it was drawn by hand.
const BODY = 'M100 8 C153 5 194 46 192 101 C190 153 150 194 98 192 C46 190 6 151 8 98 C10 47 48 11 100 8 Z';

/**
 * Xhale's breathing buddy: a soft mint character that breathes with you.
 * It grows with `scale` as you breathe in, closes its eyes to breathe, blows the smoke away on the
 * breath out, and beams when the air is clear. `count` shows inside it to pace the breath.
 */
export function Breather({
  mood,
  count,
  scale,
  size = 230,
}: {
  mood: BreatherMood;
  count?: number;
  scale: SharedValue<number>;
  size?: number;
}) {
  const puff = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    bob.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [bob]);

  useEffect(() => {
    if (mood === 'out') {
      puff.set(0);
      puff.set(withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 0 })), -1));
    } else puff.set(withTiming(0, { duration: 200 }));
  }, [mood, puff]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: (bob.value - 0.5) * 6 }, { scale: scale.value }],
  }));
  const breeze = useAnimatedStyle(() => ({
    opacity: Math.sin(puff.value * Math.PI),
    transform: [{ translateX: puff.value * 18 }, { translateY: puff.value * -10 }],
  }));

  const closed = mood === 'in' || mood === 'out';

  return (
    <View style={{ width: size * 1.35, height: size * 1.1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: size, height: size }, body]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Path d={BODY} fill={Colors.accent} />
          {/* A soft highlight so it reads as round and friendly. */}
          <Ellipse cx={70} cy={48} rx={26} ry={14} fill="rgba(255,255,255,0.28)" transform="rotate(-24 70 48)" />
          <Circle cx={56} cy={112} r={11} fill={CHEEK} />
          <Circle cx={144} cy={112} r={11} fill={CHEEK} />

          {/* Eyes */}
          {mood === 'hello' ? (
            <G fill={INK}>
              <Ellipse cx={72} cy={88} rx={6} ry={8} />
              <Ellipse cx={128} cy={88} rx={6} ry={8} />
            </G>
          ) : closed ? (
            <G stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none">
              <Path d="M60 88 Q72 97 84 88" />
              <Path d="M116 88 Q128 97 140 88" />
            </G>
          ) : (
            <G stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none">
              <Path d="M60 92 Q72 78 84 92" />
              <Path d="M116 92 Q128 78 140 92" />
            </G>
          )}

          {/* Mouth */}
          {mood === 'out' ? (
            <Ellipse cx={100} cy={118} rx={8} ry={10} fill={INK} />
          ) : mood === 'happy' ? (
            <Path d="M76 110 Q100 138 124 110 Z" fill={INK} />
          ) : mood === 'in' ? (
            <Path d="M88 116 Q100 124 112 116" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
          ) : (
            <Path d="M82 112 Q100 128 118 112" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
          )}
        </Svg>

        {count !== undefined ? (
          <View style={styles.countWrap} pointerEvents="none">
            <Text style={styles.count}>{count}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Little gusts drifting from its mouth on the breath out. */}
      <Animated.View pointerEvents="none" style={[styles.breeze, { left: size * 0.9, top: size * 0.52 }, breeze]}>
        <Svg width={60} height={40} viewBox="0 0 60 40">
          <G stroke="rgba(245,243,239,0.9)" strokeWidth={3.5} strokeLinecap="round" fill="none">
            <Path d="M4 10 Q22 4 40 10" />
            <Path d="M10 22 Q30 16 54 22" />
            <Path d="M4 34 Q20 28 36 34" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  countWrap: { position: 'absolute', left: 0, right: 0, bottom: '9%', alignItems: 'center' },
  count: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, color: INK, fontVariant: ['tabular-nums'] },
  breeze: { position: 'absolute' },
});
