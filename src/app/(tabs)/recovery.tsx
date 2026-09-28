import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CravingButton } from '@/components/craving-button';
import { LungHero } from '@/components/lungs';
import { Caption, Card, Enter, Eyebrow, Icon, Screen, Title } from '@/components/ui';
import { Colors, Fonts, SubstanceMeta, type Substance } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { cleanDays, dayIndex, MILESTONES, streakStart, TAPER_WEEKS } from '@/lib/plan';
import { useStore } from '@/lib/store';

const DAY = 86_400_000;

export default function Recovery() {
  const state = useStore((s) => s);
  const [tab, setTab] = useState<Substance>(state.substances[0] ?? 'cig');
  const s = state.substances.includes(tab) ? tab : (state.substances[0] ?? 'cig');
  const m = SubstanceMeta[s];
  const now = useNow();
  const since = streakStart(state, s, now);
  const days = since === null ? -1 : (now - since) / DAY;
  const list = MILESTONES[s];
  const nextIdx = list.findIndex((x) => x.at > days);
  const week = state.startedAt ? Math.floor(dayIndex(state.startedAt, now) / 7) + 1 : 1;
  const reached = since === null ? 0 : list.filter((x) => x.at <= days).length;

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top']} contentStyle={{ paddingBottom: 150 }}>
        <Enter i={0} style={{ gap: 4, paddingTop: 6 }}>
          <Eyebrow>What your body is fixing</Eyebrow>
          <Title>Recovery</Title>
        </Enter>

        <Enter i={1}>
          <LungHero state={state} now={now} />
        </Enter>

        {state.substances.length > 1 ? (
          <Enter i={1} style={styles.tabs}>
            {state.substances.map((x) => {
              const on = x === s;
              return (
                <Pressable
                  key={x}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTab(x);
                  }}
                  style={[styles.tab, on && styles.tabOn]}>
                  <Icon
                    name={SubstanceMeta[x].icon}
                    android={SubstanceMeta[x].androidIcon}
                    size={13}
                    color={on ? SubstanceMeta[x].color : Colors.text3}
                  />
                  <Text style={[styles.tabText, on && { color: Colors.text }]}>{SubstanceMeta[x].short}</Text>
                </Pressable>
              );
            })}
          </Enter>
        ) : null}

        <Enter i={2}>
          <Card style={[styles.hero, { borderColor: m.track }]}>
            {since === null ? (
              <>
                <Eyebrow style={{ color: m.color }}>Tapering</Eyebrow>
                <Text style={styles.heroBig}>
                  Week {Math.min(week, TAPER_WEEKS[s])} <Text style={styles.heroOf}>of {TAPER_WEEKS[s]}</Text>
                </Text>
                <Caption style={{ color: Colors.text2 }}>Milestones start when your limit hits zero.</Caption>
              </>
            ) : (
              <>
                <Eyebrow style={{ color: m.color }}>{s === 'weed' ? 'Weed-free' : s === 'cig' ? 'Smoke-free' : 'Nicotine-free'}</Eyebrow>
                <Text style={styles.heroBig}>
                  {Math.floor(days)} <Text style={styles.heroOf}>{Math.floor(days) === 1 ? 'day' : 'days'}</Text>
                </Text>
                <Caption style={{ color: Colors.text2 }}>
                  {reached} of {list.length} milestones reached. {cleanDays(state, s, now)} clean days in total.
                </Caption>
              </>
            )}
          </Card>
        </Enter>

        <View>
          {list.map((x, i) => {
            const done = since !== null && x.at <= days;
            const isNext = since !== null && i === nextIdx;
            const last = i === list.length - 1;
            return (
              <Enter key={x.time} i={3 + i} style={styles.item}>
                <View style={styles.rail}>
                  <View
                    style={[styles.node, done && { backgroundColor: m.color, borderColor: m.color }, isNext && { borderColor: m.color }]}>
                    {done ? <Icon name="checkmark" android="check" size={10} color={Colors.onLight} weight="bold" /> : null}
                  </View>
                  {!last ? <View style={[styles.line, done && { backgroundColor: m.color }]} /> : null}
                </View>
                <View style={[styles.itemBody, !done && !isNext && { opacity: 0.55 }]}>
                  <View style={styles.itemTop}>
                    <Text style={[styles.time, (done || isNext) && { color: m.color }]}>{x.time}</Text>
                    {isNext ? <Text style={[styles.nextTag, { color: m.color, borderColor: m.track }]}>Next</Text> : null}
                  </View>
                  <Text style={styles.text}>{x.text}</Text>
                </View>
              </Enter>
            );
          })}
        </View>
        <Caption>Typical timelines from public health research. Everyone’s body is different.</Caption>
      </Screen>
      <CravingButton />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, height: 38, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabOn: { backgroundColor: Colors.surfaceHigh },
  tabText: { fontFamily: Fonts.semi, fontSize: 14, color: Colors.text3 },
  hero: { gap: 6, padding: 20 },
  heroBig: { fontFamily: Fonts.display, fontSize: 52, lineHeight: 58, color: Colors.text },
  heroOf: { fontFamily: Fonts.displaySemi, fontSize: 22, lineHeight: 26, color: Colors.text2 },
  item: { flexDirection: 'row', gap: 14 },
  rail: { width: 22, alignItems: 'center' },
  node: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  line: { width: 2, flex: 1, backgroundColor: Colors.surfaceHigh, marginVertical: 3 },
  itemBody: { flex: 1, gap: 4, paddingBottom: 22 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { fontFamily: Fonts.bold, fontSize: 13.5, color: Colors.text3 },
  nextTag: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  text: { fontFamily: Fonts.semi, fontSize: 17, lineHeight: 23, color: Colors.text },
});
