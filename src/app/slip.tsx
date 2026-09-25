import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Body, Button, Caption, Card, Chip, Enter, Eyebrow, Screen, Title, ui } from '@/components/ui';
import { Colors, Fonts, SubstanceMeta, type Substance } from '@/constants/theme';
import { cleanDays, money, moneySaved, streakStart } from '@/lib/plan';
import { track } from '@/lib/analytics';
import { scheduleNudges } from '@/lib/notifications';
import { getState, setState, useStore } from '@/lib/store';

const TRIGGERS = [
  { id: 'stress', label: 'Stress', ifs: 'I feel stressed', then: 'take a five-minute walk before deciding anything.' },
  {
    id: 'sleep',
    label: 'Couldn’t sleep',
    ifs: 'I’m still awake at midnight',
    then: 'do the ten-minute wind-down and leave my phone in the kitchen.',
  },
  { id: 'friends', label: 'Friends', ifs: 'friends are using', then: 'tell one of them I’m quitting and step away for a minute.' },
  { id: 'bored', label: 'Boredom', ifs: 'I’m bored at home', then: 'open SOS first and ride out the wave.' },
  { id: 'drinks', label: 'Drinking', ifs: 'I’ve had a drink', then: 'keep my hands busy and text a friend.' },
  { id: 'food', label: 'After a meal', ifs: 'I finish a meal', then: 'get up and brush my teeth straight away.' },
  { id: 'other', label: 'Something else', ifs: 'this happens again', then: 'hit SOS before I reach for it.' },
];

export default function Slip() {
  const params = useLocalSearchParams<{ s?: Substance }>();
  const state = useStore((s) => s);
  const [s, setS] = useState<Substance>(params.s && state.substances.includes(params.s) ? params.s : state.substances[0]);
  const [trigger, setTrigger] = useState<string | null>(null);
  const t = TRIGGERS.find((x) => x.id === trigger);
  const clean = streakStart(state, s) !== null;

  const save = () => {
    setState((st) => {
      const planId = `slip-${trigger}`;
      const hasPlan = st.plans.some((p) => p.id === planId);
      return {
        slips: [...st.slips, { t: Date.now(), s, trigger: trigger ?? 'unknown' }],
        plans:
          t && !hasPlan ? [...st.plans, { id: planId, ifs: t.ifs, then: t.then.charAt(0).toUpperCase() + t.then.slice(1), s }] : st.plans,
      };
    });
    track('slip_logged');
    scheduleNudges(getState()).catch(() => {});
    router.back();
  };

  return (
    <Screen footer={<Button title={t ? 'Save my new plan' : 'Back on track'} onPress={save} />}>
      <Enter i={0} style={{ gap: 10, paddingTop: 20 }}>
        <Eyebrow style={{ color: Colors.accent }}>It happens</Eyebrow>
        <Title>A slip isn’t a relapse.</Title>
        <Body>Most people who quit for good slipped along the way. The next hour matters far more than the last one.</Body>
      </Enter>

      {state.substances.length > 1 ? (
        <Enter i={1} style={ui.wrapRow}>
          {state.substances.map((x) => (
            <Chip key={x} label={SubstanceMeta[x].label} color={SubstanceMeta[x].color} selected={x === s} onPress={() => setS(x)} />
          ))}
        </Enter>
      ) : null}

      <Enter i={2} style={styles.stats}>
        <Stat value={String(cleanDays(state, s))} label="clean days kept" />
        <Stat value={money(moneySaved(getState()))} label="still saved" />
        <Stat value={String(state.cravings.length)} label="cravings faced" />
      </Enter>

      <Enter i={3} style={{ gap: 12 }}>
        <Text style={styles.q}>What set it off?</Text>
        <View style={ui.wrapRow}>
          {TRIGGERS.map((x) => (
            <Chip key={x.id} label={x.label} selected={trigger === x.id} onPress={() => setTrigger(trigger === x.id ? null : x.id)} />
          ))}
        </View>
      </Enter>

      {t ? (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card tint={Colors.accentSoft}>
            <Eyebrow style={{ color: Colors.accent }}>Next time</Eyebrow>
            <Text style={styles.plan}>
              If {t.ifs}, I’ll {t.then}
            </Text>
          </Card>
        </Animated.View>
      ) : null}

      <Caption center>
        {clean
          ? `Your ${SubstanceMeta[s].label.toLowerCase()} streak restarts. Your clean days still count.`
          : 'You’re still tapering, so nothing resets. Tomorrow is a fresh ring.'}
      </Caption>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <Card style={{ flex: 1, gap: 2, padding: 14 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Caption>{label}</Caption>
    </Card>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  statValue: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30, color: Colors.text },
  q: { fontFamily: Fonts.displaySemi, fontSize: 22, lineHeight: 27, color: Colors.text },
  plan: { fontFamily: Fonts.semi, fontSize: 19, lineHeight: 26, color: Colors.text },
});
