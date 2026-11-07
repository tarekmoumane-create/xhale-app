import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Body, Button, Caption, Card, Enter, Eyebrow, Icon, ProgressBar, Screen, Small, StepHeader, Title } from '@/components/ui';
import { Colors, Fonts, SubstanceMeta } from '@/constants/theme';
import { scoreAnswers, type ScoreResult } from '@/lib/quiz';
import { useStore } from '@/lib/store';
import { quoteWhy } from '@/lib/why';

export default function Score() {
  const substances = useStore((s) => s.substances);
  const answers = useStore((s) => s.answers);
  const why = useStore((s) => s.why);
  const name = useStore((s) => s.name);
  const scores = useMemo(() => scoreAnswers(substances, answers), [substances, answers]);
  const [analyzing, setAnalyzing] = useState(true);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPct((p) => Math.min(1, p + 0.04)), 70);
    const done = setTimeout(() => setAnalyzing(false), 70 * 26 + 300);
    return () => {
      clearInterval(id);
      clearTimeout(done);
    };
  }, []);

  if (analyzing) {
    const label = pct < 0.4 ? 'Reading your answers' : pct < 0.75 ? 'Scoring dependence' : 'Building your picture';
    return (
      <Screen scroll={false} contentStyle={styles.analyzing}>
        <Text style={styles.pct}>{Math.round(pct * 100)}%</Text>
        <Small center>{label}</Small>
        <ProgressBar value={pct} style={{ width: 200 }} />
      </Screen>
    );
  }

  const heavy = scores.some((s) => s.segment >= 1);
  const nicotineHeavy = scores.some((s) => s.key === 'nicotine' && s.segment >= 1);

  return (
    <Screen
      header={<StepHeader progress={0.6} />}
      footer={<Button title="Continue" onPress={() => router.push('/onboarding/symptoms')} />}>
      <Enter i={0} style={{ gap: 10 }}>
        <Eyebrow>{name ? `${name}’s results` : 'Your results'}</Eyebrow>
        <Title>{heavy ? 'Here’s the honest picture.' : 'You’re catching this early.'}</Title>
      </Enter>

      {scores.map((s, i) => (
        <Enter key={s.key} i={i + 1}>
          <ScoreCard s={s} />
        </Enter>
      ))}

      {why ? (
        <Enter i={3}>
          <Card>
            <Eyebrow>Your why</Eyebrow>
            <Text style={styles.why}>{quoteWhy(why)}</Text>
          </Card>
        </Enter>
      ) : null}

      {nicotineHeavy ? (
        <Enter i={4}>
          <Card tint={Colors.accentSoft} style={{ flexDirection: 'row', gap: 12 }}>
            <Icon name="cross.case.fill" android="medical_services" color={Colors.accent} />
            <Small style={{ flex: 1, color: Colors.text }}>At this level, patches or gum alongside Xhale give you the best odds.</Small>
          </Card>
        </Enter>
      ) : null}

      <Enter i={5}>
        <Caption>A screening, not a diagnosis.</Caption>
      </Enter>
    </Screen>
  );
}

function ScoreCard({ s }: { s: ScoreResult }) {
  const color = s.key === 'weed' ? SubstanceMeta.weed.color : SubstanceMeta.vape.color;
  return (
    <Card style={{ gap: 14 }}>
      <View style={styles.between}>
        <Eyebrow>{s.label}</Eyebrow>
        <Text style={[styles.level, { color }]}>{s.level}</Text>
      </View>
      <View style={styles.meter}>
        {[0, 1, 2].map((k) => (
          <Segment key={k} on={k <= s.segment} color={color} delay={250 + k * 180} />
        ))}
      </View>
      <View style={styles.between}>
        <Caption>Low</Caption>
        <Caption>Moderate</Caption>
        <Caption>High</Caption>
      </View>
      <Body style={{ color: Colors.text }}>{s.meaning}</Body>
      <View style={styles.notAlone}>
        <Icon name="person.2.fill" android="group" size={14} color={Colors.text3} />
        <Caption style={{ flex: 1 }}>{s.notAlone}</Caption>
      </View>
    </Card>
  );
}

function Segment({ on, color, delay }: { on: boolean; color: string; delay: number }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withTiming(on ? 1 : 0, { duration: 380 })));
  }, [on, delay, v]);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }] }));
  return (
    <View style={styles.segment}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  analyzing: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  pct: { fontFamily: Fonts.display, fontSize: 64, lineHeight: 72, color: Colors.text, fontVariant: ['tabular-nums'] },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  level: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 28 },
  meter: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 10, borderRadius: 5, backgroundColor: Colors.surfaceHigh, overflow: 'hidden' },
  segmentFill: { flex: 1, transformOrigin: 'left' },
  why: { fontFamily: Fonts.italic, fontSize: 21, lineHeight: 28, color: Colors.text },
  notAlone: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 4 },
});
