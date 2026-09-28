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
import { toolById, triggerLabel, type ToolId, type TriggerId } from '@/lib/tools';

// What set it off, and the tool we'll suggest for next time (saved to their craving plan).
const SLIP_TRIGGERS: { id: TriggerId; tool: ToolId; weedTool?: ToolId }[] = [
  { id: 'stress', tool: 'breathe' },
  { id: 'bed', tool: 'breathe', weedTool: 'winddown' },
  { id: 'friends', tool: 'leave' },
  { id: 'bored', tool: 'walk' },
  { id: 'drinking', tool: 'hands' },
  { id: 'meal', tool: 'teeth' },
  { id: 'coffee', tool: 'water' },
];

export default function Slip() {
  const params = useLocalSearchParams<{ s?: Substance }>();
  const state = useStore((s) => s);
  const [s, setS] = useState<Substance>(params.s && state.substances.includes(params.s) ? params.s : state.substances[0]);
  const [trigger, setTrigger] = useState<TriggerId | null>(null);
  const t = SLIP_TRIGGERS.find((x) => x.id === trigger);
  const tool = t ? toolById(state.substances.includes('weed') && t.weedTool ? t.weedTool : t.tool) : null;
  const clean = streakStart(state, s) !== null;

  const save = () => {
    setState((st) => ({
      slips: [...st.slips, { t: Date.now(), s, trigger: trigger ?? 'unknown' }],
      // Add (or update) this trigger in their craving plan.
      triggerPlans: t && tool ? [...st.triggerPlans.filter((p) => p.trigger !== t.id), { trigger: t.id, tool: tool.id }] : st.triggerPlans,
    }));
    track('slip_logged');
    scheduleNudges(getState()).catch(() => {});
    router.back();
  };

  return (
    <Screen footer={<Button title={t ? 'Add it to my plan' : 'Back on track'} onPress={save} />}>
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
          {SLIP_TRIGGERS.map((x) => (
            <Chip
              key={x.id}
              label={triggerLabel(x.id)}
              selected={trigger === x.id}
              onPress={() => setTrigger(trigger === x.id ? null : x.id)}
            />
          ))}
        </View>
      </Enter>

      {t && tool ? (
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card tint={Colors.accentSoft} style={{ gap: 4 }}>
            <Eyebrow style={{ color: Colors.accent }}>Next time: {triggerLabel(t.id).toLowerCase()}</Eyebrow>
            <Text style={styles.plan}>{tool.title}</Text>
            <Caption style={{ color: Colors.text2 }}>{tool.how}</Caption>
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
