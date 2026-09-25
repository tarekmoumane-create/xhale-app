import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Chip, Enter, LinkButton, Screen, StepHeader, Title, ui } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { requestNotifications } from '@/lib/notifications';
import { finishOnboarding } from '@/lib/finish';
import { money, yearlyCost } from '@/lib/plan';
import { setState, useStore } from '@/lib/store';

const WINDOWS = [
  { label: 'Mornings', hour: 9 },
  { label: 'Afternoons', hour: 15 },
  { label: 'Evenings', hour: 19 },
  { label: 'Late at night', hour: 23 },
];

function fmtHour(h: number) {
  const hh = (h + 23) % 24;
  const d = new Date();
  d.setHours(hh, 45, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function Notify() {
  const hour = useStore((s) => s.notifHour);
  const weekly = useStore((s) => yearlyCost(s.habits, s.substances).total / 52);
  const [busy, setBusy] = useState(false);
  const next = finishOnboarding;

  const enable = async () => {
    setBusy(true);
    try {
      await requestNotifications();
    } finally {
      setBusy(false);
      next();
    }
  };

  return (
    <Screen
      header={<StepHeader progress={0.94} />}
      footer={
        <>
          <Button title="Turn on check-ins" loading={busy} onPress={enable} />
          <LinkButton title="Not now" onPress={next} />
        </>
      }>
      <Enter i={0} style={{ gap: 10 }}>
        <Title>When do cravings hit you hardest?</Title>
        <Body>We’ll check in before then with what you’ve saved and how your lungs are healing.</Body>
      </Enter>
      <Enter i={1}>
        <View style={ui.wrapRow}>
          {WINDOWS.map((w) => (
            <Chip key={w.label} label={w.label} selected={hour === w.hour} onPress={() => setState({ notifHour: w.hour })} />
          ))}
        </View>
      </Enter>
      <Enter i={2}>
        <View style={styles.notif}>
          <View style={styles.appIcon}>
            <View style={styles.appDot} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={styles.notifTop}>
              <Text style={styles.appName}>EXHALE</Text>
              <Text style={styles.time}>{fmtHour(hour)}</Text>
            </View>
            <Text style={styles.notifTitle}>You’ve saved {money(weekly)}</Text>
            <Text style={styles.notifBody}>
              And your lungs are on day 7 of healing.
            </Text>
          </View>
        </View>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  notif: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 22,
    backgroundColor: 'rgba(40,43,48,0.92)',
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
  },
  appIcon: { width: 38, height: 38, borderRadius: 9, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  appDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: Colors.accent },
  notifTop: { flexDirection: 'row', justifyContent: 'space-between' },
  appName: { fontFamily: Fonts.semi, fontSize: 12, letterSpacing: 0.4, color: Colors.text2 },
  time: { fontFamily: Fonts.body, fontSize: 12, color: Colors.text3 },
  notifTitle: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
  notifBody: { fontFamily: Fonts.body, fontSize: 14, lineHeight: 19, color: Colors.text2 },
});
