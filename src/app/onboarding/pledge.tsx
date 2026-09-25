import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { SignaturePad } from '@/components/signature-pad';
import { Button, Caption, Card, Enter, Eyebrow, LinkButton, Screen, StepHeader, Title } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { setState, useStore } from '@/lib/store';

function habitList(subs: string[]) {
  const names = subs.map((s) => (s === 'cig' ? 'cigarettes' : s === 'vape' ? 'vaping' : 'weed'));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default function Pledge() {
  const substances = useStore((s) => s.substances);
  const why = useStore((s) => s.why);
  const [points, setPoints] = useState(0);
  const [padKey, setPadKey] = useState(0);
  const signed = points >= 12;
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <Screen
      header={<StepHeader progress={0.9} back={false} />}
      footer={
        <Button
          title={signed ? 'I’m in' : 'Sign to continue'}
          disabled={!signed}
          onPress={() => {
            setState({ signed: true });
            router.push('/onboarding/notify');
          }}
        />
      }>
      <Enter i={0} style={{ gap: 10 }}>
        <Eyebrow style={{ color: Colors.accent }}>You’re in. One last thing.</Eyebrow>
        <Title>Make a promise to yourself.</Title>
      </Enter>

      <Enter i={1}>
        <Card style={{ gap: 14, padding: 20 }}>
          <Text style={styles.pledge}>
            From today, {today}, I’m done letting {habitList(substances)} run my days.
          </Text>
          <Text style={styles.pledge}>When a craving hits, I’ll ride it out. If I slip, I’ll get back on track the same day.</Text>
          <View style={styles.whyBox}>
            <Eyebrow>I’m doing this</Eyebrow>
            <TextInput
              value={why}
              onChangeText={(t) => setState({ why: t })}
              placeholder="to be there for the people I love"
              placeholderTextColor={Colors.text3}
              style={styles.whyInput}
              maxLength={80}
              accessibilityLabel="Why you're quitting"
            />
          </View>
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
  whyBox: { gap: 4, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderStrong },
  whyInput: { fontFamily: Fonts.italic, fontSize: 20, color: Colors.accent, paddingVertical: 6 },
  signHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 40 },
});
