import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathOrb } from '@/components/breath';
import { Smoke } from '@/components/smoke';
import { Caption, Eyebrow, Icon, IconButton, LinkButton, Tap } from '@/components/ui';
import { CravingWave } from '@/components/visuals';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { lungDays, lungsSince, lungUpdate, pickFact } from '@/lib/lungs';
import { money, moneySaved } from '@/lib/plan';
import { getState, setState } from '@/lib/store';

// Mic metering (dB) mapped to blow strength: quieter than QUIET is ignored, LOUD is a full blow.
const QUIET_DB = -24;
const LOUD_DB = -6;
const INHALE_S = 4;

type Phase = 'inhale' | 'blow' | 'clear';

function phaseFor(t: number) {
  if (t >= 300) return 'You rode it out. That’s one less hold it has on you.';
  if (t >= 170) return 'It’s fading. Stay with it.';
  if (t >= 90) return 'This is the peak. It only goes down from here.';
  return 'It’s building. That’s normal. Just notice it.';
}

export default function SOS() {
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [t, setT] = useState(0);
  const [phase, setPhase] = useState<Phase>('inhale');
  const [count, setCount] = useState(INHALE_S);
  const [round, setRound] = useState(0);
  const [micOn, setMicOn] = useState(false);
  const [breathing, setBreathing] = useState(false);
  const wind = useSharedValue(0);
  const density = useSharedValue(0.25);
  const phaseRef = useRef<Phase>('inhale');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const recorder = useAudioRecorder({ ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true });

  // What the smoke reveals: where their lungs are today, a fact for this stage, and the money kept.
  const me = useMemo(() => {
    const s = getState();
    const since = lungsSince(s);
    const day = since === null ? null : lungDays(since);
    const vapeOnly = s.substances.length === 1 && s.substances[0] === 'vape';
    return {
      substances: s.substances,
      day,
      update: day === null ? null : lungUpdate(day, vapeOnly).current,
      saved: moneySaved(s),
      why: s.why,
    };
  }, []);
  const fact = pickFact(me.substances, me.day ?? 0, round);

  useEffect(() => {
    setState((s) => ({ cravings: [...s.cravings, { t: Date.now() }] }));
    track('sos_opened');
    const id = setInterval(() => setT((x) => Math.min(300, x + 1)), 1000);
    return () => clearInterval(id);
  }, []);

  // Breathe in: the smoke thickens over the whole screen while you count down. Then blow it away.
  useEffect(() => {
    density.set(0.25);
    density.set(withTiming(1, { duration: INHALE_S * 1000, easing: Easing.inOut(Easing.sin) }));
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

  // Microphone: blowing on the phone clears the smoke.
  useEffect(() => {
    let active = true;
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted || !active) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      if (active) {
        recorder.record();
        setMicOn(true);
      }
    })();
    return () => {
      active = false;
      recorder.stop().catch(() => {});
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    };
  }, [recorder]);

  useEffect(() => {
    const id = setInterval(() => {
      if (phaseRef.current !== 'blow') return wind.set(0);
      const level = recorder.isRecording ? (recorder.getStatus().metering ?? -160) : -160;
      wind.set(Math.max(0, Math.min(1, (level - QUIET_DB) / (LOUD_DB - QUIET_DB))));
    }, 100);
    return () => clearInterval(id);
  }, [recorder, wind]);

  const again = () => {
    setPhase('inhale');
    setCount(INHALE_S);
    setRound((r) => r + 1);
  };

  const mm = Math.floor(t / 60);
  const ss = String(t % 60).padStart(2, '0');
  const clear = phase === 'clear';

  return (
    <View style={styles.root}>
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="front" />
      ) : (
        <View style={styles.noCam}>
          <Icon name="person.crop.circle" android="account_circle" size={160} color={Colors.surfaceHigh} />
        </View>
      )}
      {clear ? <Animated.View entering={FadeIn.duration(600)} pointerEvents="none" style={styles.shade} /> : null}

      <Smoke
        key={round}
        touch={phase === 'blow'}
        wind={wind}
        density={density}
        count={34}
        clearAt={0.75}
        onCleared={() => {
          setPhase('clear');
          track('sos_cleared', { mic: micOn });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      <SafeAreaView style={styles.layer} pointerEvents="box-none">
        <View style={styles.top} pointerEvents="box-none">
          <Eyebrow style={{ color: Colors.text }}>Craving SOS</Eyebrow>
          <IconButton icon="xmark" android="close" label="Close" onPress={() => router.back()} />
        </View>

        {!permission?.granted && !clear ? (
          <Tap accessibilityRole="button" onPress={requestPermission} style={styles.pill}>
            <Icon name="camera.fill" android="photo_camera" size={13} color={Colors.text} />
            <Text style={styles.pillText}>Show my face. Nothing is recorded.</Text>
          </Tap>
        ) : null}

        {!clear ? (
          <View pointerEvents="none" style={styles.cue}>
            {phase === 'inhale' ? (
              <>
                <Text style={styles.cueBig}>Breathe in</Text>
                <Text style={styles.cueCount}>{count}</Text>
              </>
            ) : (
              <>
                <Text style={styles.cueBig}>Now blow it all away</Text>
                <Text style={styles.cueSmall}>{micOn ? 'Blow on your phone, or wipe it.' : 'Wipe the smoke away.'}</Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.revealed}>
            <View style={{ flex: 1 }} />

            <Animated.View entering={FadeInDown.duration(500)} style={styles.panel}>
              <Text style={styles.kicker}>{me.day === null ? 'Your lungs' : `Your lungs, day ${me.day}`}</Text>
              {me.update ? <Text style={styles.stage}>{me.update.title}</Text> : null}
              <Text style={styles.fact}>{fact.text}</Text>
              <Text style={styles.source}>Source: {fact.source}</Text>
              <View style={styles.panelFoot}>
                <Text style={styles.saved}>
                  {me.saved >= 1 ? `${money(me.saved)} saved so far` : me.why ? `You’re doing this ${me.why}.` : 'Every one you skip counts.'}
                </Text>
                <Tap accessibilityRole="button" onPress={again} style={styles.again}>
                  <Icon name="arrow.counterclockwise" android="replay" size={12} color={Colors.text} />
                  <Text style={styles.pillText}>Another</Text>
                </Tap>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(120)} style={styles.panel}>
              {breathing ? (
                <View style={styles.breathRow}>
                  <BreathOrb size={72} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.phase}>Breathe in for 4, out for 6.</Text>
                    <Caption>Follow the circle.</Caption>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  <CravingWave elapsed={t} width={width - 68} />
                  <View style={styles.clockRow}>
                    <Text style={styles.clock}>
                      {mm}:{ss}
                    </Text>
                    <Text style={styles.phase}>{phaseFor(t)}</Text>
                  </View>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(500).delay(220)} style={styles.grid}>
              <Action
                icon="wind"
                android="air"
                label={breathing ? 'Show the wave' : 'Breathe with me'}
                onPress={() => setBreathing((b) => !b)}
                primary
              />
              <Action
                icon="message.fill"
                android="sms"
                label="Text a friend"
                onPress={() =>
                  Linking.openURL(`sms:&body=${encodeURIComponent('Having a rough craving right now. Could you talk for 5 minutes?')}`)
                }
              />
              <Action icon="bubble.left.fill" android="chat" label="Talk to Coach" onPress={() => router.dismissTo('/coach')} />
              <Action icon="list.bullet" android="list" label="My plans" onPress={() => router.dismissTo('/plan')} />
            </Animated.View>

            <LinkButton title="I gave in. Log it without judgement." onPress={() => router.replace('/slip')} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function Action({
  icon,
  android,
  label,
  onPress,
  primary,
}: {
  icon: string;
  android: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Tap accessibilityRole="button" onPress={onPress} style={[styles.action, primary && styles.actionPrimary]}>
      <Icon name={icon} android={android} size={16} color={primary ? Colors.onAccent : Colors.text} />
      <Text style={[styles.actionText, primary && { color: Colors.onAccent }]}>{label}</Text>
    </Tap>
  );
}

const GLASS = 'rgba(10,11,13,0.74)';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  noCam: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,11,13,0.35)' },
  layer: { ...StyleSheet.absoluteFill, paddingHorizontal: 18 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, paddingLeft: 4 },
  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: GLASS,
  },
  pillText: { fontFamily: Fonts.semi, fontSize: 12.5, color: Colors.text },
  cue: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 60 },
  cueBig: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -0.5, color: Colors.text, textAlign: 'center' },
  cueCount: { fontFamily: Fonts.display, fontSize: 96, lineHeight: 104, color: Colors.text, fontVariant: ['tabular-nums'] },
  cueSmall: { fontFamily: Fonts.semi, fontSize: 16, color: Colors.text },
  revealed: { flex: 1, gap: 10, paddingBottom: 4 },
  panel: { backgroundColor: GLASS, borderRadius: 24, padding: 18, gap: 6, borderWidth: 1, borderColor: Colors.border },
  kicker: { fontFamily: Fonts.semi, fontSize: 14, color: Colors.accent },
  stage: { fontFamily: Fonts.displaySemi, fontSize: 15, lineHeight: 20, color: Colors.text2 },
  fact: { fontFamily: Fonts.display, fontSize: 23, lineHeight: 29, letterSpacing: -0.3, color: Colors.text },
  source: { fontFamily: Fonts.body, fontSize: 12.5, color: Colors.text3 },
  panelFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8 },
  saved: { flex: 1, fontFamily: Fonts.semi, fontSize: 14, color: Colors.text2 },
  again: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.surfaceHigh,
  },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  clock: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 38, color: Colors.text, fontVariant: ['tabular-nums'] },
  phase: { flex: 1, fontFamily: Fonts.body, fontSize: 14.5, lineHeight: 20, color: Colors.text2 },
  breathRow: { flexDirection: 'row', alignItems: 'center', gap: 16, height: 96 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    width: '48%',
    flexGrow: 1,
    height: 52,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionPrimary: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  actionText: { fontFamily: Fonts.semi, fontSize: 14.5, color: Colors.text },
});
