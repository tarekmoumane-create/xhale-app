import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { Caption, Card, Icon, Tap } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { lungClarity, lungDays, lungsSince, lungUpdate } from '@/lib/lungs';
import { taperEnd } from '@/lib/plan';
import type { State } from '@/lib/store';

const AnimatedG = Animated.createAnimatedComponent(G);

const LEFT = 'M92 44 C72 30 34 58 26 116 C21 150 40 170 64 162 C84 156 92 142 92 122 Z';
const RIGHT = 'M108 44 C128 30 166 58 174 116 C179 150 160 170 136 162 C116 156 108 142 108 122 Z';
const AIRWAY = 'M100 6 V58 M100 58 C100 70 94 78 86 88 M100 58 C100 70 106 78 114 88';

// Soot specks that fade as the lungs clear.
const SPECKS = [
  [52, 92, 5],
  [66, 120, 7],
  [44, 136, 5],
  [78, 146, 4],
  [60, 70, 4],
  [148, 94, 5],
  [134, 124, 7],
  [156, 138, 5],
  [122, 146, 4],
  [140, 70, 4],
  [70, 100, 3],
  [130, 104, 3],
];

/** Two lungs with a haze over them. `clarity` 0 is fully smoky, 1 is clear. */
export function LungsFigure({ clarity, size = 120 }: { clarity: number; size?: number }) {
  const c = useSharedValue(0);
  useEffect(() => {
    c.set(withTiming(clarity, { duration: 1400, easing: Easing.out(Easing.cubic) }));
  }, [c, clarity]);
  const haze = useAnimatedProps(() => ({ opacity: 0.88 * (1 - c.value) }));
  const soot = useAnimatedProps(() => ({ opacity: Math.max(0, 1 - c.value * 1.4) }));

  return (
    <Svg width={size} height={size * 0.9} viewBox="0 0 200 180" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={LEFT} fill={Colors.accent} opacity={0.9} />
      <Path d={RIGHT} fill={Colors.accent} opacity={0.9} />
      <AnimatedG animatedProps={haze}>
        <Path d={LEFT} fill="#6E6A64" />
        <Path d={RIGHT} fill="#6E6A64" />
      </AnimatedG>
      <AnimatedG animatedProps={soot}>
        {SPECKS.map(([x, y, r], i) => (
          <Circle key={i} cx={x} cy={y} r={r} fill="#2B2926" opacity={0.7} />
        ))}
      </AnimatedG>
      <Path d={AIRWAY} stroke={Colors.text} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.85} />
    </Svg>
  );
}

function lungView(state: State, now: number) {
  const since = lungsSince(state, now);
  const vapeOnly = state.substances.length === 1 && state.substances[0] === 'vape';
  if (since === null) {
    const starts = state.startedAt ? state.substances.map((s) => (state.modes[s] === 'cold' ? state.startedAt! : taperEnd(state.startedAt!, s))) : [];
    const from = starts.length ? Math.max(...starts) : null;
    return { tapering: true as const, from, clarity: 0.08, vapeOnly };
  }
  const day = lungDays(since, now);
  return { tapering: false as const, day, clarity: lungClarity(day), vapeOnly, ...lungUpdate(day, vapeOnly) };
}

/** Compact card for the Today screen: today's lung update. Tapping opens Recovery. */
export function LungCard({ state, now }: { state: State; now: number }) {
  const l = lungView(state, now);
  const fmt = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <Tap accessibilityRole="button" accessibilityHint="Opens Recovery" onPress={() => router.navigate('/recovery')} scaleTo={0.985}>
      <Card style={styles.card}>
        <LungsFigure clarity={l.clarity} size={92} />
        <View style={{ flex: 1, gap: 3 }}>
          {l.tapering ? (
            <>
              <Caption style={styles.kicker}>Your lungs</Caption>
              <Text style={styles.title}>Healing starts {l.from ? fmt(l.from) : 'soon'}</Text>
              <Caption style={styles.body}>Every one you cut before then already helps.</Caption>
            </>
          ) : (
            <>
              <Caption style={styles.kicker}>Your lungs, day {l.day}</Caption>
              <Text style={styles.title}>{l.current.title}</Text>
              <Caption style={styles.body}>{l.current.body}</Caption>
            </>
          )}
        </View>
        <Icon name="chevron.right" android="chevron_right" size={14} color={Colors.text3} />
      </Card>
    </Tap>
  );
}

/** Large version for the top of the Recovery tab, with what's coming next. */
export function LungHero({ state, now }: { state: State; now: number }) {
  const l = lungView(state, now);
  const fmt = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return (
    <Card style={styles.hero}>
      <View style={{ alignItems: 'center' }}>
        <LungsFigure clarity={l.clarity} size={190} />
      </View>
      {l.tapering ? (
        <View style={{ gap: 4 }}>
          <Caption style={styles.kicker}>Your lungs</Caption>
          <Text style={styles.heroTitle}>Healing starts {l.from ? fmt(l.from) : 'soon'}</Text>
          <Text style={styles.heroBody}>That’s when your plan reaches zero. Every one you cut before then already helps.</Text>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <Caption style={styles.kicker}>Your lungs, day {l.day}</Caption>
          <Text style={styles.heroTitle}>{l.current.title}</Text>
          <Text style={styles.heroBody}>{l.current.body}</Text>
          {l.next ? (
            <View style={styles.next}>
              <Caption style={{ color: Colors.text3 }}>
                {l.next.day === l.day + 1 ? 'Tomorrow' : `In ${l.next.day - l.day} days`}: {l.next.title.toLowerCase()}
              </Caption>
            </View>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  kicker: { color: Colors.accent, fontFamily: Fonts.semi },
  title: { fontFamily: Fonts.displaySemi, fontSize: 18, lineHeight: 22, color: Colors.text },
  body: { color: Colors.text2, fontSize: 14, lineHeight: 19 },
  hero: { gap: 14, padding: 20 },
  heroTitle: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 31, letterSpacing: -0.3, color: Colors.text },
  heroBody: { fontFamily: Fonts.body, fontSize: 16.5, lineHeight: 24, color: Colors.text2 },
  next: { marginTop: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderStrong },
});
