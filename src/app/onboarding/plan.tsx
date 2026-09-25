import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Caption, Card, Enter, Eyebrow, Icon, Screen, StepHeader, ui } from '@/components/ui';
import { Colors, Fonts, SubstanceMeta } from '@/constants/theme';
import { money, TAPER_WEEKS, yearlyCost } from '@/lib/plan';
import { setState, useStore, type QuitMode } from '@/lib/store';

/** Counts up from 0 to `to` over ~1.2s. */
function useCountUp(to: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 1200);
      setV(to * (1 - Math.pow(1 - t, 3)));
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [to]);
  return v;
}

export default function PlanScreen() {
  const substances = useStore((s) => s.substances);
  const habits = useStore((s) => s.habits);
  const modes = useStore((s) => s.modes);
  const cost = yearlyCost(habits, substances);
  const shown = useCountUp(cost.total);

  return (
    <Screen
      header={<StepHeader progress={0.8} />}
      footer={<Button title="Lock in my plan" onPress={() => router.push('/onboarding/paywall')} />}>
      <Enter i={0} style={{ gap: 6 }}>
        <Eyebrow>Every year, this costs you</Eyebrow>
        <Text style={styles.big} accessibilityLabel={money(cost.total)}>
          {money(shown)}
        </Text>
        <Body>
          That’s {money(cost.total / 365)} a day, and{' '}
          <Text style={{ color: Colors.text, fontFamily: Fonts.semi }}>{money(cost.total * 5)}</Text> over the next five years.
        </Body>
      </Enter>

      <Enter i={1} style={{ gap: 10 }}>
        <View style={styles.bar}>
          {substances.map((s) => (
            <View key={s} style={{ flex: Math.max(1, cost[s]), backgroundColor: SubstanceMeta[s].color }} />
          ))}
        </View>
        <View style={styles.legend}>
          {substances.map((s) => (
            <View key={s} style={ui.row}>
              <View style={[styles.dot, { backgroundColor: SubstanceMeta[s].color }]} />
              <Caption style={{ color: Colors.text2 }}>
                {SubstanceMeta[s].short} {money(cost[s])}
              </Caption>
            </View>
          ))}
        </View>
      </Enter>

      <Enter i={2}>
        <Card style={{ gap: 4 }}>
          <Eyebrow style={{ paddingBottom: 6 }}>How you’ll quit</Eyebrow>
          {substances.map((s, i) => {
            const m = SubstanceMeta[s];
            const mode = modes[s];
            const setMode = (next: QuitMode) => {
              Haptics.selectionAsync();
              setState((st) => ({ modes: { ...st.modes, [s]: next } }));
            };
            return (
              <View key={s} style={[styles.planRow, i > 0 && styles.planRowBorder]}>
                <View style={[ui.row, { flex: 1 }]}>
                  <Icon name={m.icon} android={m.androidIcon} size={16} color={m.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{m.label}</Text>
                    <Caption>{mode === 'taper' ? `Step down weekly, free in ${TAPER_WEEKS[s]} weeks` : 'Stop today, full support'}</Caption>
                  </View>
                </View>
                <View style={styles.segment}>
                  {(['taper', 'cold'] as const).map((k) => (
                    <Pressable
                      key={k}
                      accessibilityRole="button"
                      accessibilityState={{ selected: mode === k }}
                      onPress={() => setMode(k)}
                      style={[styles.segBtn, mode === k && styles.segOn]}>
                      <Text style={[styles.segText, mode === k && { color: Colors.onLight }]}>{k === 'taper' ? 'Taper' : 'Stop now'}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </Card>
      </Enter>
      <Enter i={3}>
        <Caption>
          Not sure? Tapering suits heavy nicotine use. You can switch anytime.
        </Caption>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 72, color: Colors.text, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  bar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', gap: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  planRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.borderStrong },
  rowTitle: { fontFamily: Fonts.semi, fontSize: 15.5, color: Colors.text },
  segment: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: Colors.surfaceHigh },
  segBtn: { height: 34, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center' },
  segOn: { backgroundColor: Colors.text },
  segText: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.text2 },
});
