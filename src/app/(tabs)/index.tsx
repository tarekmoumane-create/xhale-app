import * as Haptics from 'expo-haptics';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Caption, Card, Enter, Eyebrow, Icon, Screen, Tap, Title } from '@/components/ui';
import { LungCard } from '@/components/lungs';
import { LiveTimer, Rings, type Ring } from '@/components/visuals';
import { COACH_ENABLED } from '@/constants/features';
import { Colors, Fonts, SubstanceMeta, type Substance } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { cleanDays, dailyLimit, dayIndex, dayKey, MILESTONES, money, moneySaved, streakStart, usedToday } from '@/lib/plan';
import { setState, useStore, type State } from '@/lib/store';

const DAY = 86_400_000;

const ALL_STEPS = [
  {
    title: 'Plan for your hardest hour',
    body: 'Check your if-then plans against today.',
    href: '/plan' as const,
    icon: 'arrow.triangle.branch',
  },
  {
    title: 'Practise riding a craving',
    body: 'Open SOS once while calm, so it feels familiar.',
    href: '/sos' as const,
    icon: 'waveform.path.ecg',
  },
  {
    title: 'Tell one person',
    body: 'People with someone in the loop last longer.',
    href: '/coach' as const,
    icon: 'person.2.fill',
  },
  {
    title: 'Get ahead of tonight',
    body: 'Most slips happen in the evening. Pick tonight’s plan.',
    href: '/plan' as const,
    icon: 'moon.stars.fill',
  },
  {
    title: 'See what’s healing',
    body: 'Your body has already started. Take a look.',
    href: '/recovery' as const,
    icon: 'lungs.fill',
  },
];
const STEPS = ALL_STEPS.filter((s) => COACH_ENABLED || s.href !== '/coach');

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 5 ? 'Still up?' : h < 12 ? 'Good morning.' : h < 18 ? 'Good afternoon.' : 'Good evening.';
}

function nextMilestone(s: Substance, since: number, now: number) {
  const days = (now - since) / DAY;
  const list = MILESTONES[s];
  const next = list.find((m) => m.at > days);
  const prevAt = [...list].reverse().find((m) => m.at <= days)?.at ?? 0;
  if (!next) return { frac: 1, label: 'Every milestone reached' };
  const inDays = Math.max(1, Math.ceil(next.at - days));
  return { frac: (days - prevAt) / (next.at - prevAt), label: `Next milestone in ${inDays === 1 ? '1 day' : `${inDays} days`}` };
}

type Row = { s: Substance; ring: Ring; title: string; status: string; over: boolean; tapering: boolean };

function buildRows(state: State, now: number): Row[] {
  return state.substances.map((s) => {
    const m = SubstanceMeta[s];
    const since = streakStart(state, s, now);
    if (since === null) {
      const limit = dailyLimit(state, s, now);
      const used = usedToday(state, s, now);
      const left = limit - used;
      return {
        s,
        tapering: true,
        over: left < 0,
        ring: { key: s, frac: limit > 0 ? Math.max(0, left) / limit : 0, color: m.color, track: m.track },
        title: left >= 0 ? `${left} ${left === 1 ? m.unit : m.units} left today` : `${-left} over today`,
        status: left >= 0 ? `Today’s limit is ${limit}. It drops every week.` : 'It happens. Tomorrow is a fresh ring.',
      };
    }
    const next = nextMilestone(s, since, now);
    const days = cleanDays(state, s, now);
    return {
      s,
      tapering: false,
      over: false,
      ring: { key: s, frac: next.frac, color: m.color, track: m.track },
      title: `${days} ${days === 1 ? 'day' : 'days'} free`,
      status: next.label,
    };
  });
}

const LOG_STEP: Record<Substance, number> = { cig: 1, vape: 10, weed: 1 };

export default function Today() {
  const state = useStore((s) => s);
  const now = useNow(30_000);
  const rows = buildRows(state, now);
  const starts = state.substances.map((s) => streakStart(state, s, now)).filter((x): x is number => x !== null);
  const timerSince = starts.length ? Math.min(...starts) : (state.startedAt ?? now);
  const timerLabel = starts.length ? 'Free for' : 'On your plan for';
  const step = STEPS[dayIndex(state.startedAt ?? now, now) % STEPS.length];
  const pledgedToday = state.pledges.includes(dayKey(now));
  const bestClean = Math.max(0, ...state.substances.map((s) => cleanDays(state, s, now)));

  const log = (s: Substance) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((st) => ({ logs: [...st.logs, { t: Date.now(), s, n: LOG_STEP[s] }] }));
  };

  return (
    <Screen edges={['top']} contentStyle={{ paddingBottom: 120 }}>
      <Enter i={0} style={{ gap: 4, paddingTop: 6 }}>
        <Eyebrow>{new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Eyebrow>
        <Title>{greeting(now)}</Title>
      </Enter>

      <Enter i={1}>
        <Tap
          accessibilityRole="button"
          onPress={() => router.push('/pledge-today')}
          scaleTo={0.985}
          style={[styles.pledge, pledgedToday && styles.pledgeDone]}>
          <Icon
            name={pledgedToday ? 'checkmark.seal.fill' : 'hand.raised.fill'}
            android={pledgedToday ? 'verified' : 'front_hand'}
            size={18}
            color={pledgedToday ? Colors.accent : Colors.onAccent}
          />
          <Text style={[styles.pledgeText, pledgedToday && { color: Colors.text }]}>
            {pledgedToday ? 'Pledged for today' : 'Make today’s pledge'}
          </Text>
          {!pledgedToday ? <Icon name="chevron.right" android="chevron_right" size={14} color={Colors.onAccent} /> : null}
        </Tap>
      </Enter>

      <Enter i={1} style={styles.ringWrap}>
        <Rings rings={rows.map((r) => r.ring)}>
          <LiveTimer since={timerSince} label={timerLabel} />
        </Rings>
      </Enter>

      <Enter i={2} style={styles.stats}>
        <Stat value={money(moneySaved(state, now))} label="saved" />
        <View style={styles.statDivider} />
        <Stat value={String(state.cravings.length)} label="cravings faced" />
        <View style={styles.statDivider} />
        <Stat value={String(bestClean)} label="clean days" />
      </Enter>

      <View style={{ gap: 10 }}>
        {rows.map((r, i) => {
          const m = SubstanceMeta[r.s];
          return (
            <Enter key={r.s} i={3 + i}>
              <Card style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: m.soft }]}>
                  <Icon name={m.icon} android={m.androidIcon} size={18} color={m.color} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.rowTitle, r.over && { color: Colors.danger }]}>{r.title}</Text>
                  <Caption style={{ color: Colors.text2 }}>{r.status}</Caption>
                </View>
                {r.tapering ? (
                  <Tap
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${LOG_STEP[r.s]} ${LOG_STEP[r.s] === 1 ? m.unit : m.units}`}
                    onPress={() => log(r.s)}
                    style={styles.pill}>
                    <Text style={styles.pillText}>+{LOG_STEP[r.s]}</Text>
                  </Tap>
                ) : (
                  <Tap
                    accessibilityRole="button"
                    onPress={() => router.push({ pathname: '/slip', params: { s: r.s } })}
                    style={styles.pill}>
                    <Text style={styles.pillText}>Slipped</Text>
                  </Tap>
                )}
              </Card>
            </Enter>
          );
        })}
      </View>

      <Enter i={6}>
        <LungCard state={state} now={now} />
      </Enter>

      <Enter i={7}>
        <Link href={step.href} asChild>
          <Tap style={styles.step} scaleTo={0.985}>
            <View style={styles.stepIcon}>
              <Icon name={step.icon} android="flag" size={18} color={Colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Eyebrow style={{ color: Colors.accent }}>Today’s step, 2 min</Eyebrow>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Caption style={{ color: Colors.text2 }}>{step.body}</Caption>
            </View>
            <Icon name="chevron.right" android="chevron_right" size={14} color={Colors.text3} />
          </Tap>
        </Link>
      </Enter>

      <Enter i={8}>
        <Button title="I’m having a craving" icon="wind" tone="accent" onPress={() => router.push('/sos')} />
      </Enter>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Caption>{label}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  pledge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 18,
    backgroundColor: Colors.accent,
  },
  pledgeDone: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  pledgeText: { flex: 1, fontFamily: Fonts.bold, fontSize: 16, color: Colors.onAccent },
  ringWrap: { alignItems: 'center', paddingVertical: 6 },
  stats: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: Colors.borderStrong },
  statValue: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 28, color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: Fonts.semi, fontSize: 16, color: Colors.text },
  pill: {
    height: 38,
    minWidth: 54,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.text },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: Colors.accentSoft,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(127,231,220,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontFamily: Fonts.semi, fontSize: 16, color: Colors.text },
});
