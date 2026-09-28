import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LungsFigure } from '@/components/lungs';
import { Smoke } from '@/components/smoke';
import { Button, Caption, IconButton, LinkButton, Tap } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { lungClarity, lungDays, lungsSince, lungUpdate } from '@/lib/lungs';
import { money, moneySaved, yearlyCost } from '@/lib/plan';
import { getState, setState } from '@/lib/store';
import { quoteWhy } from '@/lib/why';

// Mic metering (dB) mapped to blow strength: quieter than QUIET is ignored, LOUD is a full blow.
const QUIET_DB = -24;
const LOUD_DB = -6;
const INHALE_S = 4;

type Phase = 'inhale' | 'blow' | 'clear';

/**
 * Craving SOS: the screen fills with smoke while you breathe in, you blow it away (or wipe it),
 * and it reveals your why, how your lungs are healing and the money you've kept.
 */
export default function SOS() {
  const [phase, setPhase] = useState<Phase>('inhale');
  const [count, setCount] = useState(INHALE_S);
  const [round, setRound] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const wind = useSharedValue(0);
  const density = useSharedValue(0);
  const phaseRef = useRef<Phase>('inhale');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });

  // What the smoke reveals.
  const me = useMemo(() => {
    const s = getState();
    const since = lungsSince(s);
    const day = since === null ? null : lungDays(since);
    const vapeOnly = s.substances.length === 1 && s.substances[0] === 'vape';
    return {
      why: quoteWhy(s.why),
      day,
      lungs: day === null ? null : lungUpdate(day, vapeOnly).current,
      clarity: day === null ? 0.08 : lungClarity(day),
      saved: moneySaved(s),
      perDay: yearlyCost(s.habits, s.substances).total / 365,
    };
  }, []);

  useEffect(() => {
    setState((s) => ({ cravings: [...s.cravings, { t: Date.now() }] }));
    track('sos_opened');
  }, []);

  // Breathe in: the smoke rolls in over the whole screen while you count down. Then blow it away.
  useEffect(() => {
    density.set(0);
    density.set(withTiming(1, { duration: INHALE_S * 1000, easing: Easing.out(Easing.quad) }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let n = INHALE_S;
    const id = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setCount(n);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        clearInterval(id);
        setPhase('blow');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [round, density]);

  // Microphone: blowing on the phone clears the smoke. Any failure here just leaves wiping as the way to clear it.
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
        setMicOn(true);
      } catch {
        setMicOn(false);
      }
    })();
    return () => {
      active = false;
      try {
        if (started) recorder.stop().catch(() => {});
      } catch {}
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, [recorder]);

  useEffect(() => {
    if (!micOn) return;
    const id = setInterval(() => {
      if (phaseRef.current !== 'blow') return wind.set(0);
      let level = -160;
      try {
        if (recorder.isRecording) level = recorder.getStatus().metering ?? -160;
      } catch {}
      wind.set(Math.max(0, Math.min(1, (level - QUIET_DB) / (LOUD_DB - QUIET_DB))));
    }, 100);
    return () => clearInterval(id);
  }, [micOn, recorder, wind]);

  const again = () => {
    setPhase('inhale');
    setCount(INHALE_S);
    setRound((r) => r + 1);
  };

  const clear = phase === 'clear';

  return (
    <View style={styles.root}>
      <Smoke
        key={round}
        touch={phase === 'blow'}
        wind={wind}
        density={density}
        onCleared={() => {
          setPhase('clear');
          track('sos_cleared', { mic: micOn });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <SafeAreaView style={styles.layer} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="box-none">
          <IconButton icon="xmark" android="close" label="Close" onPress={() => router.back()} />
        </View>

        {!clear ? (
          <View pointerEvents="none" style={styles.cueWrap}>
            <Animated.View key={phase} entering={FadeIn.duration(400)} exiting={FadeOut.duration(200)} style={styles.cue}>
              {phase === 'inhale' ? (
                <>
                  <Text style={styles.cueBig}>Breathe in</Text>
                  <Text style={styles.cueCount}>{count}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.cueBig}>Now blow it all away</Text>
                  <Text style={styles.cueSmall}>{micOn ? 'Blow on your phone, or wipe it away.' : 'Wipe the smoke away.'}</Text>
                </>
              )}
            </Animated.View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.reveal} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(600).delay(200)} style={{ gap: 10 }}>
              <Caption style={styles.label}>Why you’re doing this</Caption>
              <Text style={styles.why}>{me.why || 'You’re doing this for you.'}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(700)} style={styles.card}>
              <LungsFigure clarity={me.clarity} size={84} />
              <View style={{ flex: 1, gap: 3 }}>
                <Caption style={styles.label}>{me.day === null ? 'Your lungs' : `Your lungs, day ${me.day}`}</Caption>
                <Text style={styles.cardTitle}>{me.lungs ? me.lungs.title : 'Healing starts when your plan hits zero'}</Text>
                <Text style={styles.cardBody}>{me.lungs ? me.lungs.body : 'Every one you cut before then already helps.'}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(1200)} style={styles.card}>
              <View style={{ flex: 1, gap: 2 }}>
                <Caption style={styles.label}>{me.saved >= 1 ? 'Money you’ve kept' : 'Every day you skip it'}</Caption>
                <Text style={styles.money}>{money(me.saved >= 1 ? me.saved : me.perDay)}</Text>
                <Text style={styles.cardBody}>{me.saved >= 1 ? 'Not spent on it since you started.' : 'stays in your pocket.'}</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(500).delay(1700)} style={{ gap: 10, paddingTop: 8 }}>
              <Button title="I’m okay now" tone="accent" onPress={() => router.back()} />
              <View style={styles.row}>
                <Tap accessibilityRole="button" onPress={again} style={styles.secondary}>
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

const GLASS = 'rgba(10,11,13,0.72)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  layer: { ...StyleSheet.absoluteFill, paddingHorizontal: 20 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  cueWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  cue: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 28,
    backgroundColor: GLASS,
  },
  cueBig: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: Colors.text, textAlign: 'center' },
  cueCount: { fontFamily: Fonts.display, fontSize: 88, lineHeight: 96, color: Colors.text, fontVariant: ['tabular-nums'] },
  cueSmall: { fontFamily: Fonts.semi, fontSize: 15.5, color: Colors.text2, textAlign: 'center' },
  reveal: { flexGrow: 1, justifyContent: 'center', gap: 14, paddingVertical: 24 },
  label: { fontFamily: Fonts.semi, color: Colors.accent },
  why: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: Colors.text },
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
