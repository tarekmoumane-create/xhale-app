import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { HoldButton } from '@/components/hold-button';
import { Body, Caption, Enter, Eyebrow, Option, Screen, StepHeader, Title } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { money, yearlyCost } from '@/lib/plan';
import { useStore } from '@/lib/store';

function habitList(subs: string[]) {
  const names = subs.map((s) => (s === 'cig' ? 'smoking' : s === 'vape' ? 'vaping' : 'weed'));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * Right after the cost reveal and before the paywall: they admit the problem in plain words
 * and commit to doing what it takes. Naming it is the first step, and it primes commitment.
 */
export default function Admit() {
  const substances = useStore((s) => s.substances);
  const habits = useStore((s) => s.habits);
  const [ticked, setTicked] = useState<number[]>([]);
  const cost = yearlyCost(habits, substances).total;

  const statements = [
    `I have a problem with ${habitList(substances)}.`,
    cost > 0 ? `It’s costing me ${money(cost)} a year, and more than just money.` : 'It’s costing me more than I want to admit.',
    'I’m ready to do whatever it takes to stop.',
  ];
  const all = ticked.length === statements.length;

  return (
    <Screen
      header={<StepHeader progress={0.84} />}
      footer={
        <View style={{ gap: 10 }}>
          <HoldButton
            title={all ? 'Hold to commit' : 'Tick all three to continue'}
            disabled={!all}
            onDone={() => {
              track('committed');
              router.push('/onboarding/pledge');
            }}
          />
          <Caption center>Only you see this.</Caption>
        </View>
      }>
      <Enter i={0} style={{ gap: 10 }}>
        <Eyebrow style={{ color: Colors.accent }}>The first step</Eyebrow>
        <Title>Be honest with yourself.</Title>
        <Body>Everyone who quits for good starts by saying it plainly. Tick each one you can say out loud.</Body>
      </Enter>

      <View style={{ gap: 10 }}>
        {statements.map((s, i) => (
          <Enter key={s} i={i + 1}>
            <Option
              multi
              title={s}
              selected={ticked.includes(i)}
              onPress={() => {
                Haptics.selectionAsync();
                setTicked((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]));
              }}
            />
          </Enter>
        ))}
      </View>
    </Screen>
  );
}
