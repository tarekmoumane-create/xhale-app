import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SignaturePad } from '@/components/signature-pad';
import { Button, Caption, Card, Enter, Eyebrow, LinkButton, Screen, StepHeader, Title } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { whoMy } from '@/lib/personal';
import { money, yearlyCost } from '@/lib/plan';
import { setState, useStore } from '@/lib/store';

function habitList(subs: string[]) {
  const names = subs.map((s) => (s === 'cig' ? 'cigarettes' : s === 'vape' ? 'vaping' : 'weed'));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default function Pledge() {
  const substances = useStore((s) => s.substances);
  const name = useStore((s) => s.name);
  const habits = useStore((s) => s.habits);
  const answers = useStore((s) => s.answers);
  const forWho = whoMy(answers);
  const cost = yearlyCost(habits, substances).total;
  const [points, setPoints] = useState(0);
  const [padKey, setPadKey] = useState(0);
  const signed = points >= 12;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <Screen
      header={<StepHeader progress={0.9} />}
      footer={
        <Button
          title={signed ? 'I’m in' : 'Sign to continue'}
          disabled={!signed}
          onPress={() => {
            track('committed');
            setState({ signed: true });
            router.push('/onboarding/paywall');
          }}
        />
      }>
      <Enter i={0} style={{ gap: 10 }}>
        <Eyebrow style={{ color: Colors.accent }}>Make it official</Eyebrow>
        <Title>{name ? `${name}, make a promise to yourself.` : 'Make a promise to yourself.'}</Title>
      </Enter>

      <Enter i={1}>
        <Card style={{ gap: 14, padding: 20 }}>
          <Text style={styles.pledge}>
            {name ? `I’m ${name}. ` : ''}From today, {today}, I’m done letting {habitList(substances)} run my days.
          </Text>
          {cost > 0 ? (
            <Text style={styles.pledge}>It’s been costing me {money(cost)} a year, and more than just money.</Text>
          ) : null}
          {forWho ? <Text style={styles.pledge}>I’m doing this for {forWho}.</Text> : null}
          <Text style={styles.pledge}>When a craving hits, I’ll ride it out. If I slip, I’ll get back on track the same day.</Text>
        </Card>
      </Enter>

      <Enter i={2} style={{ gap: 8 }}>
        <View style={styles.signHeader}>
          <Caption style={{ color: Colors.text2 }}>Sign with your finger</Caption>
          {points > 0 ? (
            <LinkButton
              title="Clear"
              onPress={() => {
                setPadKey((k) => k + 1);
                setPoints(0);
              }}
            />
          ) : null}
        </View>
        <SignaturePad key={padKey} onChange={setPoints} />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pledge: { fontFamily: Fonts.semi, fontSize: 20, lineHeight: 28, color: Colors.text },
  signHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
});
