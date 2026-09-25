import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Button, Caption, Card, Enter, Eyebrow, Icon, IconButton, LinkButton, Screen, Tap, Title } from '@/components/ui';
import { Colors, Fonts, SubstanceMeta } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { unlock } from '@/lib/finish';
import { PRIVACY_URL, TERMS_URL } from '@/lib/links';
import { money, taperEnd, yearlyCost } from '@/lib/plan';
import { FALLBACK_PRICES, getPrice, purchase, restore, type PlanId } from '@/lib/purchases';
import { useStore } from '@/lib/store';

export default function Paywall() {
  const offerSeen = useStore((s) => s.offerSeen);
  const substances = useStore((s) => s.substances);
  const habits = useStore((s) => s.habits);
  const modes = useStore((s) => s.modes);
  const why = useStore((s) => s.why);
  const [plan, setPlan] = useState<Exclude<PlanId, 'exit'>>('annual');
  const [prices, setPrices] = useState(FALLBACK_PRICES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const perDay = yearlyCost(habits, substances).total / 365;
  const payoff = perDay > 0 ? Math.max(1, Math.ceil(49 / perDay)) : null;

  useEffect(() => {
    track('paywall_viewed');
    Promise.all([getPrice('annual'), getPrice('weekly')]).then(([annual, weekly]) => setPrices((p) => ({ ...p, annual, weekly })));
  }, []);

  const run = async (fn: () => Promise<boolean>, emptyMessage?: string) => {
    setBusy(true);
    setError(null);
    try {
      if (await fn()) unlock();
      else if (emptyMessage) setError(emptyMessage);
    } catch (e) {
      setError((e as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const annual = plan === 'annual';
  const fmtDate = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <Screen
      header={
        <View style={styles.top}>
          {!offerSeen ? (
            <IconButton icon="xmark" android="close" label="Close" onPress={() => router.push('/onboarding/offer')} />
          ) : (
            <View />
          )}
          <LinkButton title="Restore" onPress={() => run(restore, 'No active subscription found for this Apple ID.')} />
        </View>
      }
      footer={
        <>
          <Button
            title={annual ? 'Start my free trial' : `Continue with ${prices.weekly}/week`}
            loading={busy}
            onPress={() =>
              run(async () => {
                const ok = await purchase(plan);
                if (ok) track('subscribed', { plan });
                return ok;
              })
            }
          />
          {error ? (
            <Caption center style={{ color: Colors.danger }}>
              {error}
            </Caption>
          ) : null}
          <Caption center>
            {annual
              ? `3 days free, then ${prices.annual} a year. Cancel anytime in Settings.`
              : `${prices.weekly} a week. Cancel anytime in Settings.`}
          </Caption>
          <View style={styles.legal}>
            <LinkButton title="Terms" color={Colors.text3} onPress={() => Linking.openURL(TERMS_URL)} />
            <LinkButton title="Privacy" color={Colors.text3} onPress={() => Linking.openURL(PRIVACY_URL)} />
          </View>
        </>
      }>
      <Enter i={0} style={{ gap: 10 }}>
        <Eyebrow style={{ color: Colors.accent }}>Your plan is ready</Eyebrow>
        <Title>
          Your way out starts today.
        </Title>
        {payoff ? (
          <Caption style={{ fontSize: 14, lineHeight: 20, color: Colors.text2 }}>
            {money(perDay * 365)} a year on your habit, or {prices.annual} for Exhale. That’s less than{' '}
            {payoff === 1 ? '1 day' : `${payoff} days`} of what you spend now.
          </Caption>
        ) : null}
      </Enter>

      <Enter i={1}>
        <Card style={{ gap: 14 }}>
          {substances.map((s) => {
            const m = SubstanceMeta[s];
            return (
              <Row
                key={s}
                icon={m.icon}
                android={m.androidIcon}
                color={m.color}
                text={modes[s] === 'taper' ? `${m.label}: free by ${fmtDate(taperEnd(startedAt, s))}` : `${m.label}: done from today`}
              />
            );
          })}
          <Row icon="waveform.path.ecg" android="monitor_heart" color={Colors.accent} text="Craving SOS, any time, day or night" />
          <Row icon="bubble.left.and.bubble.right.fill" android="forum" color={Colors.accent} text="A coach who knows your plan" />
          {why ? (
            <Row icon="heart.fill" android="favorite" color={Colors.danger} text={why.charAt(0).toUpperCase() + why.slice(1)} />
          ) : null}
        </Card>
      </Enter>

      {annual ? (
        <Enter i={2}>
          <View style={styles.timeline}>
            <Step title="Today" body="Full access, free" first />
            <Step title="Day 2" body="We remind you the trial is ending" />
            <Step title="Day 3" body={`${prices.annual}/year starts. Cancel before to pay nothing.`} last />
          </View>
        </Enter>
      ) : null}

      <Enter i={3} style={{ gap: 10 }}>
        <PlanCard
          selected={annual}
          onPress={() => setPlan('annual')}
          title="Yearly"
          price={`${prices.annual}/year`}
          sub="$0.94 a week, 3 days free"
          badge="Best value"
        />
        <PlanCard selected={!annual} onPress={() => setPlan('weekly')} title="Weekly" price={`${prices.weekly}/week`} sub="No free trial" />
      </Enter>
    </Screen>
  );
}

function Row({ icon, android, color, text }: { icon: string; android: string; color: string; text: string }) {
  return (
    <View style={styles.row}>
      <Icon name={icon} android={android} size={17} color={color} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

function Step({ title, body, first, last }: { title: string; body: string; first?: boolean; last?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepRail}>
        <View style={[styles.stepDot, first && { backgroundColor: Colors.accent, borderColor: Colors.accent }]} />
        {!last ? <View style={styles.stepLine} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : 14 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Caption style={{ color: Colors.text2 }}>{body}</Caption>
      </View>
    </View>
  );
}

function PlanCard({
  selected,
  onPress,
  title,
  price,
  sub,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  sub: string;
  badge?: string;
}) {
  return (
    <Tap
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      scaleTo={0.985}
      style={[styles.plan, selected && styles.planOn]}>
      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.planTitle}>{title}</Text>
        <Caption style={{ color: Colors.text2 }}>{sub}</Caption>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <Text style={styles.planPrice}>{price}</Text>
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowText: { flex: 1, fontFamily: Fonts.semi, fontSize: 15, lineHeight: 20, color: Colors.text },
  timeline: { paddingHorizontal: 6 },
  step: { flexDirection: 'row', gap: 14 },
  stepRail: { width: 14, alignItems: 'center' },
  stepDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderStrong, marginTop: 4 },
  stepLine: { width: 2, flex: 1, backgroundColor: Colors.surfaceHigh, marginTop: 4 },
  stepTitle: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.text },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  planOn: { borderColor: Colors.accent, backgroundColor: Colors.surfaceHigh },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Colors.accent },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.accent },
  planTitle: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.text },
  planPrice: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.text },
  badge: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    color: Colors.onAccent,
    backgroundColor: Colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  legal: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: -6 },
});
