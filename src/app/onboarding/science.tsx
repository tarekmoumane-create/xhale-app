import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Caption, Enter, Screen, StepHeader, Title } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';

const SKILLS = [
  {
    title: 'Ride the wave',
    body: 'A craving peaks and fades in minutes. Let it pass.',
  },
  {
    title: 'Get ahead of your triggers',
    body: 'Every trigger gets a go-to move for when it hits.',
  },
  {
    title: 'Slip without spiralling',
    body: 'A slip isn’t a relapse. The next hour is what counts.',
  },
];

export default function Science() {
  return (
    <Screen
      header={<StepHeader progress={0.66} />}
      footer={<Button title="Build my plan" onPress={() => router.push('/onboarding/habits')} />}>
      <Enter i={0} style={{ gap: 10 }}>
        <Title>It was never a willpower problem.</Title>
        <Body>Three skills, one day at a time.</Body>
      </Enter>
      <View style={{ gap: 0 }}>
        {SKILLS.map((s, i) => (
          <Enter key={s.title} i={i + 1} style={styles.row}>
            <View style={styles.rail}>
              <Text style={styles.num}>{i + 1}</Text>
              {i < SKILLS.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.text}>
              <Text style={styles.title}>{s.title}</Text>
              <Body>{s.body}</Body>
            </View>
          </Enter>
        ))}
      </View>
      <Enter i={5}>
        <Caption>Built on ACT and CBT, the best-studied approaches to quitting.</Caption>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16 },
  rail: { width: 40, alignItems: 'center' },
  num: {
    width: 40,
    height: 40,
    borderRadius: 20,
    textAlign: 'center',
    lineHeight: 40,
    fontFamily: Fonts.display,
    fontSize: 18,
    color: Colors.accent,
    backgroundColor: Colors.accentSoft,
    overflow: 'hidden',
  },
  line: { width: 1, flex: 1, backgroundColor: Colors.borderStrong, marginVertical: 6 },
  text: { flex: 1, gap: 6, paddingBottom: 26 },
  title: { fontFamily: Fonts.displaySemi, fontSize: 20, color: Colors.text, lineHeight: 25, paddingTop: 6 },
});
