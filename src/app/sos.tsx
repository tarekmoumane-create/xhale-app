import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Breather } from '@/components/breather';
import { LungsFigure } from '@/components/lungs';
import { Smoke } from '@/components/smoke';
import { Button, Caption, IconButton, LinkButton, Tap } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { lungClarity, lungDays, lungsSince, lungUpdate } from '@/lib/lungs';
import { money, moneySaved, yearlyCost } from '@/lib/plan';
import { pickQuote } from '@/lib/quotes';
import { getState, setState } from '@/lib/store';

/*
 * Three calm, natural breaths: in for 4, out for 6 (about six breaths a minute, a pace known to
 * settle the nervous system). Nothing to blow at and no counting. Each breath out drifts a third of
 * the smoke away in time with it. Short on purpose: longer or forced breathing can make people light-headed.
 */
const FILL_MS = 2000;
const IN_MS = 4000;
const OUT_MS = 6000;
const BREATHS = 3;

type Phase = 'fill' | 'in' | 'out' | 'clear';

export default function SOS() {
  const [phase, setPhase] = useState<Phase>('fill');
  const [round, setRound] = useState(0);
  const [count, setCount] = useState(0);
  const density = useSharedValue(0);
  const clear = useSharedValue(0);
  const shade = useSharedValue(0);
  const orb = useSharedValue(0.84);

  const me = useMemo(() => {
    const s = getState();
    const since = lungsSince(s);
    const day = since === null ? null : lungDays(since);
    const vapeOnly = s.substances.length === 1 && s.substances[0] === 'vape';
    return {
      state: s,
      day,
      lungs: day === null ? null : lungUpdate(day, vapeOnly).current,
      clarity: day === null ? 0.08 : lungClarity(day),
      saved: moneySaved(s),
      perDay: yearlyCost(s.habits, s.substances).total / 365,
    };
  }, []);
  const quote = pickQuote(me.state, round);

  useEffect(() => {
    setState((s) => ({ cravings: [...s.cravings, { t: Date.now() }] }));
    track('sos_opened');
  }, []);

  // The session: the smoke rolls in, then three slow breaths each drift a third of it away.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));
    const calm = Easing.inOut(Easing.sin);
    // Count down one number per second, e.g. 4-3-2-1, while a breath runs.
    const countDown = async (ms: number) => {
      for (let s = ms / 1000; s > 0 && !cancelled; s--) {
        setCount(s);
        await wait(1000);
      }
    };

    (async () => {
      clear.set(0);
      shade.set(0);
      orb.set(0.84);
      setPhase('fill');
      density.set(0);
      density.set(withTiming(1, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }));
      await wait(FILL_MS);

      for (let b = 1; b <= BREATHS && !cancelled; b++) {
        setPhase('in');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        orb.set(withTiming(1.08, { duration: IN_MS, easing: calm }));
        await countDown(IN_MS);
        if (cancelled) return;

        setPhase('out');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        orb.set(withTiming(0.84, { duration: OUT_MS, easing: calm }));
        clear.set(withTiming(b / BREATHS, { duration: OUT_MS, easing: calm }));
        await countDown(OUT_MS);
      }
      if (cancelled) return;

      setPhase('clear');
      shade.set(withTiming(1, { duration: 900 }));
      track('sos_cleared');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [round, clear, shade, orb, density]);

  const shadeStyle = useAnimatedStyle(() => ({ opacity: shade.value * 0.88 }));

  return (
    <View style={styles.root}>
      <Smoke density={density} clear={clear} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.shade, shadeStyle]} />

      <SafeAreaView style={styles.layer} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="box-none">
          <IconButton icon="xmark" android="close" label="Close" onPress={() => router.back()} />
        </View>

        {phase !== 'clear' ? (
          <View pointerEvents="none" style={styles.cueWrap}>
            <Breather
              mood={phase === 'fill' ? 'hello' : phase === 'in' ? 'in' : 'out'}
              count={phase === 'fill' ? undefined : count}
              scale={orb}
            />
            <View style={styles.pill}>
              <Animated.Text key={phase} entering={FadeIn.duration(700)} exiting={FadeOut.duration(400)} style={styles.cueBig}>
                {phase === 'fill' ? 'Three slow breaths with me' : phase === 'in' ? 'Breathe in' : 'Now slowly out'}
              </Animated.Text>
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.reveal} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center' }}>
              <Breather mood="happy" scale={orb} size={120} />
            </Animated.View>
            <Animated.View entering={FadeInDown.duration(700).delay(500)}>
              <Text style={styles.quote}>{quote}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(1300)} style={styles.card}>
              <LungsFigure clarity={me.clarity} size={80} />
              <View style={{ flex: 1, gap: 3 }}>
                <Caption style={styles.label}>{me.day === null ? 'Your lungs' : `Your lungs, day ${me.day}`}</Caption>
                <Text style={styles.cardTitle}>{me.lungs ? me.lungs.title : 'Healing starts when your plan hits zero'}</Text>
                <Text style={styles.cardBody}>{me.lungs ? me.lungs.body : 'Every one you cut before then already helps.'}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(1700)} style={styles.card}>
              <View style={{ flex: 1, gap: 2 }}>
                <Caption style={styles.label}>{me.saved >= 1 ? 'Money you’ve kept' : 'Every day you skip it'}</Caption>
                <Text style={styles.money}>{money(me.saved >= 1 ? me.saved : me.perDay)}</Text>
                <Text style={styles.cardBody}>{me.saved >= 1 ? 'Not spent on it since you started.' : 'stays in your pocket.'}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(500).delay(2200)} style={{ gap: 10, paddingTop: 8 }}>
              <Button title="I’m okay now" tone="accent" onPress={() => router.back()} />
              <View style={styles.row}>
                <Tap accessibilityRole="button" onPress={() => setRound((r) => r + 1)} style={styles.secondary}>
                  <Text style={styles.secondaryText}>Breathe again</Text>
                </Tap>
                <Tap
                  accessibilityRole="button"
                  onPress={() =>
                    Linking.openURL(`sms:&body=${encodeURIComponent('Having a rough craving right now. Could you talk for 5 minutes?')}`)
                  }
                  style={styles.secondary}>
                  <Text style={styles.secondaryText}>Text a friend</Text>
                </Tap>
              </View>
              <LinkButton title="I gave in. Log it without judgement." onPress={() => router.replace('/slip')} />
            </Animated.View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  shade: { backgroundColor: Colors.bg },
  layer: { ...StyleSheet.absoluteFill, paddingHorizontal: 20 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  cueWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  pill: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(10,11,13,0.55)',
  },
  cueBig: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, color: Colors.text, textAlign: 'center' },
  reveal: { flexGrow: 1, justifyContent: 'center', gap: 14, paddingVertical: 24 },
  quote: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 39, letterSpacing: -0.5, color: Colors.text, paddingBottom: 8 },
  label: { fontFamily: Fonts.semi, color: Colors.accent },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardTitle: { fontFamily: Fonts.displaySemi, fontSize: 18, lineHeight: 23, color: Colors.text },
  cardBody: { fontFamily: Fonts.body, fontSize: 14.5, lineHeight: 20, color: Colors.text2 },
  money: { fontFamily: Fonts.display, fontSize: 44, lineHeight: 50, color: Colors.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryText: { fontFamily: Fonts.semi, fontSize: 15, color: Colors.text },
});
