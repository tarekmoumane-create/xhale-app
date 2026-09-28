import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Caption, Card, Enter, Eyebrow, Icon, IconButton, Option, Screen, Title } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { dayIndex, dayKey, streakStart } from '@/lib/plan';
import { setState, useStore, type State } from '@/lib/store';
import { quoteWhy } from '@/lib/why';

function habitList(state: State) {
  const names = state.substances.map((s) => (s === 'cig' ? 'cigarettes' : s === 'vape' ? 'vaping' : 'weed'));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The morning pledge: re-read your why, tick one box. Opened from the morning notification or the Today card. */
export default function PledgeToday() {
  const state = useStore((s) => s);
  const [now] = useState(() => Date.now());
  const today = dayKey(now);
  const done = state.pledges.includes(today);
  const [ticked, setTicked] = useState(done);
  const clean = state.substances.every((s) => streakStart(state, s, now) !== null);
  const line = clean ? `Today, I stay clear of ${habitList(state)}.` : `Today, I stick to my plan for ${habitList(state)}.`;
  const day = state.startedAt ? dayIndex(state.startedAt, now) + 1 : 1;
  const why = quoteWhy(state.why);

  const pledge = () => {
    if (!done) {
      setState((s) => ({ pledges: [...s.pledges, today] }));
      track('daily_pledge');
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <Screen
      header={
        <View style={styles.top}>
          <IconButton icon="xmark" android="close" label="Close" onPress={() => router.back()} />
        </View>
      }
      footer={<Button title={done ? 'Done' : 'Make my pledge'} disabled={!ticked} onPress={pledge} />}>
      <Enter i={0} style={{ gap: 8 }}>
        <Eyebrow style={{ color: Colors.accent }}>Day {day}</Eyebrow>
        <Title>Today’s pledge</Title>
      </Enter>

      {why ? (
        <Enter i={1}>
          <Card style={{ gap: 6, padding: 20 }}>
            <Caption>Why you’re doing this</Caption>
            <Text style={styles.why}>{why}</Text>
          </Card>
        </Enter>
      ) : null}

      <Enter i={2}>
        <Option
          multi
          title={line}
          selected={ticked}
          onPress={() => {
            if (done) return;
            Haptics.selectionAsync();
            setTicked((x) => !x);
          }}
        />
      </Enter>

      {done ? (
        <Enter i={3} style={styles.doneRow}>
          <Icon name="checkmark.seal.fill" android="verified" size={16} color={Colors.accent} />
          <Caption style={{ color: Colors.text2 }}>
            You’ve pledged today. {state.pledges.length} {state.pledges.length === 1 ? 'pledge' : 'pledges'} so far.
          </Caption>
        </Enter>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 4 },
  why: { fontFamily: Fonts.displaySemi, fontSize: 24, lineHeight: 30, color: Colors.text },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
