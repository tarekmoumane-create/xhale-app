import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Chip, Enter, Icon, Screen, StepHeader, Title, ui } from '@/components/ui';
import { Colors, Fonts, SubstanceMeta, type Substance } from '@/constants/theme';
import { setState, useStore, type Habits } from '@/lib/store';

type NumKey = Exclude<keyof Habits, 'weedWhen'>;

const ROWS: Record<Substance, { key: NumKey; label: string; step: number; min: number; fmt: (v: number) => string }[]> = {
  cig: [
    { key: 'cigPerDay', label: 'Cigarettes a day', step: 1, min: 1, fmt: String },
  ],
  vape: [
    { key: 'vapePuffsPerDay', label: 'Puffs a day, roughly', step: 10, min: 10, fmt: String },
    { key: 'vapeDaysPerUnit', label: 'One vape or pod lasts', step: 1, min: 1, fmt: (v) => (v === 1 ? '1 day' : `${v} days`) },
    { key: 'vapeUnitPrice', label: 'Price each', step: 1, min: 1, fmt: (v) => `$${v}` },
  ],
  weed: [
    { key: 'weedSessionsPerDay', label: 'Sessions a day', step: 1, min: 1, fmt: String },
    { key: 'weedPerWeek', label: 'Spent a week', step: 5, min: 0, fmt: (v) => `$${v}` },
  ],
};

/** Tap a pack price instead of typing one. */
const PACK_PRICES = [6, 8, 10, 12, 15, 20];

const WHEN = ['First thing', 'After work', 'To fall asleep', 'When I’m bored', 'With friends', 'When stressed'];

export default function HabitsScreen() {
  const substances = useStore((s) => s.substances);
  const habits = useStore((s) => s.habits);
  const set = (key: NumKey, v: number) => setState((st) => ({ habits: { ...st.habits, [key]: v } }));
  const toggleWhen = (w: string) =>
    setState((st) => ({
      habits: {
        ...st.habits,
        weedWhen: st.habits.weedWhen.includes(w) ? st.habits.weedWhen.filter((x) => x !== w) : [...st.habits.weedWhen, w],
      },
    }));

  return (
    <Screen
      header={<StepHeader progress={0.74} />}
      footer={<Button title="Calculate my cost" onPress={() => router.push('/onboarding/plan')} />}>
      <Enter i={0} style={{ gap: 10 }}>
        <Title>What does a normal day look like?</Title>
        <Body>Rough is fine. No need to be exact.</Body>
      </Enter>
      {substances.map((s, i) => {
        const m = SubstanceMeta[s];
        return (
          <Enter key={s} i={i + 1}>
            <Card style={{ gap: 4, paddingVertical: 14 }}>
              <View style={[ui.row, { paddingBottom: 8 }]}>
                <View style={[styles.badge, { backgroundColor: m.soft }]}>
                  <Icon name={m.icon} android={m.androidIcon} size={15} color={m.color} />
                </View>
                <Text style={styles.cardTitle}>{m.label}</Text>
              </View>
              {ROWS[s].map((r) => (
                <View key={r.key} style={styles.stepRow}>
                  <Text style={styles.stepLabel}>{r.label}</Text>
                  <Stepper
                    label={r.label}
                    value={r.fmt(habits[r.key])}
                    onMinus={() => set(r.key, Math.max(r.min, habits[r.key] - r.step))}
                    onPlus={() => set(r.key, habits[r.key] + r.step)}
                  />
                </View>
              ))}
              {s === 'cig' ? (
                <View style={{ gap: 10, paddingTop: 6 }}>
                  <Text style={styles.stepLabel}>What does a pack cost?</Text>
                  <View style={ui.wrapRow}>
                    {PACK_PRICES.map((p) => (
                      <Chip
                        key={p}
                        label={p === 20 ? '$20+' : `$${p}`}
                        color={m.color}
                        selected={habits.packPrice === p}
                        onPress={() => set('packPrice', p)}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              {s === 'weed' ? (
                <View style={{ gap: 10, paddingTop: 10 }}>
                  <Text style={styles.stepLabel}>When do you usually smoke?</Text>
                  <View style={ui.wrapRow}>
                    {WHEN.map((w) => (
                      <Chip key={w} label={w} color={m.color} selected={habits.weedWhen.includes(w)} onPress={() => toggleWhen(w)} />
                    ))}
                  </View>
                </View>
              ) : null}
            </Card>
          </Enter>
        );
      })}
    </Screen>
  );
}

function Stepper({ label, value, onMinus, onPlus }: { label: string; value: string; onMinus: () => void; onPlus: () => void }) {
  const tap = (fn: () => void) => () => {
    Haptics.selectionAsync();
    fn();
  };
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Less ${label}`}
        onPress={tap(onMinus)}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
        <Icon name="minus" android="remove" size={14} color={Colors.text} weight="bold" />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More ${label}`}
        onPress={tap(onPlus)}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}>
        <Icon name="plus" android="add" size={14} color={Colors.text} weight="bold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: Fonts.semi, fontSize: 16, color: Colors.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: 8 },
  stepLabel: { flex: 1, fontFamily: Fonts.body, fontSize: 15, color: Colors.text2 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceHigh, borderRadius: 999, padding: 3 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: Colors.borderStrong },
  stepValue: { minWidth: 58, textAlign: 'center', fontFamily: Fonts.bold, fontSize: 16, color: Colors.text, fontVariant: ['tabular-nums'] },
});
