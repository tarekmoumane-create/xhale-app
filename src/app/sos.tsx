import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

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
 * Slow breathing with a long exhale calms the body's stress response and brings the heart rate
 * down. Four rounds of in-for-4, out-for-7 take about 45 seconds. Each slow breath out clears a
 * quarter of the smoke; with the mic on, it only clears while they're actually breathing out.
 */
const FILL_MS = 2500;
const IN_S = 4;
const OUT_S = 7;
const ROUNDS = 4;
const MAX_ROUNDS = 6;
const TICK_MS = 100;
// A breath out counts when the mic is this many dB above the room's quiet level.
const BREATH_ABOVE_DB = 7;

type Phase = 'fill' | 'in' | 'out' | 'clear';

export default function SOS() {
  const [phase, setPhase] = useState<Phase>('fill');
  const [count, setCount] = useState(IN_S);
  const [breath, setBreath] = useState(0);
  const [round, setRound] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [hearing, setHearing] = useState(false);
  const density = useSharedValue(0);
  const clear = useSharedValue(0);
  const shade = useSharedValue(0);
  const phaseRef = useRef<Phase>('fill');
  const levelRef = useRef(-160);
  const micRef = useRef(false);
  const quietRef = useRef<number | null>(null);
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });

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

  // Microphone level, read continuously. Failure just means the breathing runs on the timer alone.
  useEffect(() => {
    let active = true;
    let started = false;
    (async () => {
      try {
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted || !active) return;
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        if (!active) return;
        recorder.record();
        started = true;
        micRef.current = true;
        setMicOn(true);
      } catch {
        setMicOn(false);
      }
    })();
    const id = setInterval(() => {
      try {
        if (started && recorder.isRecording) levelRef.current = recorder.getStatus().metering ?? -160;
      } catch {}
    }, TICK_MS);
    return () => {
      active = false;
      clearInterval(id);
      try {
        if (started) recorder.stop().catch(() => {});
      } catch {}
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, [recorder]);

  // The guided session: smoke fills, then rounds of breathing in and slowly out.
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));
    const go = (p: Phase) => {
      phaseRef.current = p;
      setPhase(p);
    };

    (async () => {
      clear.set(0);
      shade.set(0);
      quietRef.current = null;
      go('fill');
      density.set(0);
      density.set(withTiming(1, { duration: FILL_MS, easing: Easing.out(Easing.cubic) }));
      await wait(FILL_MS);

      let cleared = 0;
      for (let r = 0; r < MAX_ROUNDS && cleared < 0.98 && !cancelled; r++) {
        setBreath(r + 1);

        // Breathe in. The room's quiet level is measured here to judge the breath out.
        go('in');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        const quiet: number[] = [];
        for (let s = IN_S; s > 0 && !cancelled; s--) {
          setCount(s);
          for (let k = 0; k < 1000 / TICK_MS; k++) {
            quiet.push(levelRef.current);
            await wait(TICK_MS);
          }
        }
        if (quiet.length) quietRef.current = quiet.sort((a, b) => a - b)[Math.floor(quiet.length / 2)];

        // Breathe out slowly. Clears up to a quarter of the smoke, only while breathing out.
        go('out');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        const target = Math.min(1, cleared + 1 / ROUNDS);
        const step = 1 / ROUNDS / ((OUT_S * 1000) / TICK_MS);
        for (let s = OUT_S; s > 0 && !cancelled; s--) {
          setCount(s);
          for (let k = 0; k < 1000 / TICK_MS; k++) {
            const q = quietRef.current;
            const mic = micRef.current;
            const breathing = !mic || q === null || levelRef.current > q + BREATH_ABOVE_DB;
            setHearing(breathing && mic);
            // Without a detected breath the smoke still thins a little, so nobody gets stuck.
            cleared = Math.min(target, cleared + step * (breathing ? 1 : 0.25));
            clear.set(withTiming(cleared, { duration: TICK_MS }));
            await wait(TICK_MS);
          }
        }
        setHearing(false);
      }
      if (cancelled) return;

      go('clear');
      clear.set(withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
      shade.set(withTiming(1, { duration: 900 }));
      track('sos_cleared', { mic: micRef.current });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

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
            <Animated.View key={phase} entering={FadeIn.duration(600)} exiting={FadeOut.duration(300)} style={styles.cue}>
              {phase === 'fill' ? (
                <Text style={styles.cueBig}>Let’s slow this down.</Text>
              ) : (
                <>
                  <Caption style={styles.round}>
                    Breath {breath} of {ROUNDS}
                  </Caption>
                  <Text style={styles.cueBig}>{phase === 'in' ? 'Breathe in' : 'Breathe out slowly'}</Text>
                  <Text style={styles.cueCount}>{count}</Text>
                  <Text style={styles.cueSmall}>
                    {phase === 'in'
                      ? 'Through your nose. Fill your belly.'
                      : micOn
                        ? hearing
                          ? 'That’s it. Long and slow.'
                          : 'Breathe out gently onto your screen.'
                        : 'Let it all out, slower than you breathed in.'}
                  </Text>
                </>
              )}
            </Animated.View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.reveal} showsVerticalScrollIndicator={false}>
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

const GLASS = 'rgba(10,11,13,0.62)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  shade: { backgroundColor: Colors.bg },
  layer: { ...StyleSheet.absoluteFill, paddingHorizontal: 20 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  cueWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  cue: {
    alignItems: 'center',
    gap: 4,
    minWidth: 250,
    paddingHorizontal: 28,
    paddingVertical: 22,
    borderRadius: 30,
    backgroundColor: GLASS,
  },
  round: { fontFamily: Fonts.semi, color: Colors.text2 },
  cueBig: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, color: Colors.text, textAlign: 'center' },
  cueCount: { fontFamily: Fonts.display, fontSize: 76, lineHeight: 84, color: Colors.text, fontVariant: ['tabular-nums'] },
  cueSmall: { fontFamily: Fonts.semi, fontSize: 15, color: Colors.text2, textAlign: 'center' },
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
