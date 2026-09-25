import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button, Caption, Card, Enter, Eyebrow, Icon, LinkButton, Screen, Tap, Title } from '@/components/ui';
import { Colors, Fonts, SubstanceMeta } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { dayKey } from '@/lib/plan';
import { setState, useStore } from '@/lib/store';

const BUCKETS = 12; // two-hour buckets
const LABELS = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];

export default function PlanTab() {
  const plans = useStore((s) => s.plans);
  const planUsed = useStore((s) => s.planUsed);
  const cravings = useStore((s) => s.cravings);
  const [adding, setAdding] = useState(false);
  const [ifs, setIfs] = useState('');
  const [then, setThen] = useState('');
  const now = useNow();
  const today = dayKey(now);

  const counts = Array.from({ length: BUCKETS }, () => 0);
  const weekAgo = now - 7 * 86_400_000;
  cravings.filter((c) => c.t >= weekAgo).forEach((c) => counts[Math.floor(new Date(c.t).getHours() / 2)]++);
  const max = Math.max(1, ...counts);
  const peak = counts.indexOf(Math.max(...counts));
  const hasData = counts.some((c) => c > 0);

  const toggleUsed = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((st) => {
      const next = { ...st.planUsed };
      if (next[id] === today) delete next[id];
      else next[id] = today;
      return { planUsed: next };
    });
  };

  const remove = (id: string) =>
    Alert.alert('Remove this plan?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setState((st) => ({ plans: st.plans.filter((p) => p.id !== id) })) },
    ]);

  const save = () => {
    const i = ifs.trim().replace(/^if\s+/i, '');
    const t = then.trim().replace(/^then\s+/i, '');
    if (!i || !t) return;
    setState((st) => ({ plans: [...st.plans, { id: String(Date.now()), ifs: i, then: t }] }));
    setIfs('');
    setThen('');
    setAdding(false);
  };

  const usedCount = plans.filter((p) => planUsed[p.id] === today).length;

  return (
    <Screen edges={['top']} contentStyle={{ paddingBottom: 120 }}>
      <Enter i={0} style={{ gap: 4, paddingTop: 6 }}>
        <Eyebrow>If this, then that</Eyebrow>
        <Title>Your plan</Title>
      </Enter>

      <Enter i={1}>
        <Card>
          <View style={styles.between}>
            <Text style={styles.cardTitle}>When cravings hit</Text>
            <Caption>Last 7 days</Caption>
          </View>
          {hasData ? (
            <>
              <View style={styles.bars}>
                {counts.map((c, i) => (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(4, Math.round((72 * c) / max)),
                          backgroundColor: i === peak ? Colors.accent : Colors.surfaceHigh,
                        },
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.axis}>
                {LABELS.map((l, i) => (
                  <View key={l} style={styles.barCol}>
                    {i % 3 === 0 ? <Caption style={styles.axisLabel}>{l}</Caption> : null}
                  </View>
                ))}
              </View>
              <Caption style={{ color: Colors.text2 }}>
                Your hardest window is {LABELS[peak]}m to {LABELS[(peak + 1) % 12]}m. Make sure one of your plans covers it.
              </Caption>
            </>
          ) : (
            <Caption style={{ color: Colors.text2, lineHeight: 19 }}>
              Each time you open SOS, we log the time. After a few days, your craving pattern shows up here.
            </Caption>
          )}
        </Card>
      </Enter>

      <Enter i={2} style={styles.between}>
        <Eyebrow>Your plans</Eyebrow>
        {plans.length ? <Caption>{usedCount} used today</Caption> : null}
      </Enter>

      <View style={{ gap: 10 }}>
        {plans.map((p, i) => {
          const used = planUsed[p.id] === today;
          const color = p.s ? SubstanceMeta[p.s].color : Colors.accent;
          return (
            <Enter key={p.id} i={3 + i}>
              <Pressable onLongPress={() => remove(p.id)} delayLongPress={400}>
                <Card style={styles.planRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.planIf, { color }]}>If {p.ifs}</Text>
                    <Text style={styles.planThen}>{p.then}</Text>
                  </View>
                  <Tap
                    accessibilityRole="checkbox"
                    accessibilityLabel="Used this today"
                    accessibilityState={{ checked: used }}
                    onPress={() => toggleUsed(p.id)}
                    style={[styles.check, used && { backgroundColor: Colors.accent, borderColor: Colors.accent }]}>
                    <Icon name="checkmark" android="check" size={15} color={used ? Colors.onAccent : Colors.text3} weight="bold" />
                  </Tap>
                </Card>
              </Pressable>
            </Enter>
          );
        })}
      </View>

      {adding ? (
        <Card style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Eyebrow>If</Eyebrow>
            <TextInput
              value={ifs}
              onChangeText={setIfs}
              placeholder="I get home from work"
              placeholderTextColor={Colors.text3}
              style={styles.input}
              autoFocus
            />
          </View>
          <View style={{ gap: 6 }}>
            <Eyebrow>Then I’ll</Eyebrow>
            <TextInput
              value={then}
              onChangeText={setThen}
              placeholder="go for a 10-minute walk"
              placeholderTextColor={Colors.text3}
              style={styles.input}
            />
          </View>
          <Button title="Save plan" disabled={!ifs.trim() || !then.trim()} onPress={save} />
          <LinkButton title="Cancel" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Tap accessibilityRole="button" onPress={() => setAdding(true)} style={styles.add} scaleTo={0.985}>
          <Icon name="plus" android="add" size={15} color={Colors.text2} />
          <Text style={styles.addText}>New plan</Text>
        </Tap>
      )}
      {plans.length ? <Caption center>Tick a plan when you use it. Press and hold to remove it.</Caption> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: Fonts.semi, fontSize: 16, color: Colors.text },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 72 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  axis: { flexDirection: 'row', gap: 5 },
  axisLabel: { width: 60 },
  bar: { borderRadius: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planIf: { fontFamily: Fonts.bold, fontSize: 13.5 },
  planThen: { fontFamily: Fonts.semi, fontSize: 17, lineHeight: 23, color: Colors.text },
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontFamily: Fonts.semi,
    fontSize: 18,
    color: Colors.text,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderStrong,
  },
  add: {
    flexDirection: 'row',
    gap: 8,
    height: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: Fonts.semi, fontSize: 15, color: Colors.text2 },
});
