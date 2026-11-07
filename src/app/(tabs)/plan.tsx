import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CravingButton } from '@/components/craving-button';
import { Body, Caption, Card, Chip, Enter, Eyebrow, Icon, LinkButton, Screen, Tap, Title, ui } from '@/components/ui';
import { Colors, Fonts } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { track } from '@/lib/analytics';
import { dayKey } from '@/lib/plan';
import { setState, useStore } from '@/lib/store';
import { toolById, toolsFor, TRIGGERS, triggerLabel, type Tool, type ToolId, type TriggerId } from '@/lib/tools';

const BUCKETS = 12; // two-hour buckets
const LABELS = ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];
const DELAY_MS = 10 * 60_000;
const delayEnd = () => Date.now() + DELAY_MS;

/** Choosing a trigger, then the tool for it. `trigger` set means we're picking the tool. */
type Editing = { trigger?: TriggerId } | null;

/** The "Wait 10 minutes" countdown. It lives on this screen; Xhale never sends a notification. */
function DelayCountdown({ end }: { end: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = Math.ceil((end - now) / 1000);
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <Caption style={{ color: Colors.text2, lineHeight: 18, fontVariant: ['tabular-nums'] }}>
      {left > 0 ? `${clock} left. Decide when it’s up.` : 'Time’s up. How’s the craving now? If it’s still there, try another tool.'}
    </Caption>
  );
}

export default function PlanTab() {
  const substances = useStore((s) => s.substances);
  const triggerPlans = useStore((s) => s.triggerPlans);
  const toolsUsed = useStore((s) => s.toolsUsed);
  const cravings = useStore((s) => s.cravings);
  const [editing, setEditing] = useState<Editing>(null);
  const [timerEnd, setTimerEnd] = useState<number | null>(null);
  const now = useNow();
  const today = dayKey(now);
  const tools = toolsFor(substances);

  const counts = Array.from({ length: BUCKETS }, () => 0);
  const weekAgo = now - 7 * 86_400_000;
  cravings.filter((c) => c.t >= weekAgo).forEach((c) => counts[Math.floor(new Date(c.t).getHours() / 2)]++);
  const max = Math.max(1, ...counts);
  const peak = counts.indexOf(Math.max(...counts));
  const hasData = counts.some((c) => c > 0);

  const markUsed = (id: ToolId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setState((st) => {
      const next = { ...st.toolsUsed };
      if (next[id] === today) delete next[id];
      else next[id] = today;
      return { toolsUsed: next };
    });
  };

  const runTool = (t: Tool) => {
    track('tool_used', { tool: t.id });
    setState((st) => ({ toolsUsed: { ...st.toolsUsed, [t.id]: today } }));
    if (t.action === 'sos') router.push('/sos');
    else if (t.action === 'why') router.push('/pledge-today');
    else if (t.action === 'text')
      Linking.openURL(`sms:&body=${encodeURIComponent('Having a rough craving right now. Could you talk for 5 minutes?')}`);
    else if (t.action === 'timer') setTimerEnd(delayEnd());
  };

  const savePlan = (trigger: TriggerId, tool: ToolId) => {
    Haptics.selectionAsync();
    setState((st) => ({ triggerPlans: [...st.triggerPlans.filter((p) => p.trigger !== trigger), { trigger, tool }] }));
    setEditing(null);
  };

  const remove = (trigger: TriggerId) =>
    Alert.alert(`Remove “${triggerLabel(trigger)}” from your plan?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setState((st) => ({ triggerPlans: st.triggerPlans.filter((p) => p.trigger !== trigger) })),
      },
    ]);

  const unused = TRIGGERS.filter((t) => !triggerPlans.some((p) => p.trigger === t.id));

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top']} contentStyle={{ paddingBottom: 150 }}>
        <Enter i={0} style={{ gap: 6, paddingTop: 6 }}>
          <Title>Your plan</Title>
          <Body>What you’ll do instead when a craving hits.</Body>
        </Enter>

        {/* When it hits: trigger -> tool */}
        <Enter i={1} style={{ gap: 10 }}>
          <Eyebrow>When it hits</Eyebrow>
          {triggerPlans.map((p) => {
            const tool = toolById(p.tool);
            return (
              <Pressable
                key={p.trigger}
                accessibilityRole="button"
                accessibilityHint="Change what you’ll do. Press and hold to remove."
                onPress={() => setEditing({ trigger: p.trigger })}
                onLongPress={() => remove(p.trigger)}
                delayLongPress={400}>
                <Card style={styles.planRow}>
                  <View style={styles.planIcon}>
                    <Icon name={tool.icon} android={tool.android} size={17} color={Colors.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Caption style={{ color: Colors.accent, fontFamily: Fonts.semi }}>{triggerLabel(p.trigger)}</Caption>
                    <Text style={styles.planTool}>{tool.title}</Text>
                  </View>
                  <Icon name="chevron.right" android="chevron_right" size={13} color={Colors.text3} />
                </Card>
              </Pressable>
            );
          })}

          {editing ? (
            <Animated.View entering={FadeInDown.duration(250)}>
              <Card style={{ gap: 14 }}>
                {!editing.trigger ? (
                  <>
                    <Text style={styles.editQ}>When does it usually hit?</Text>
                    <View style={ui.wrapRow}>
                      {unused.map((t) => (
                        <Chip key={t.id} label={t.label} selected={false} onPress={() => setEditing({ trigger: t.id })} />
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.editQ}>{triggerLabel(editing.trigger)}: what will you do instead?</Text>
                    <View style={{ gap: 8 }}>
                      {tools.map((t) => (
                        <Tap
                          key={t.id}
                          accessibilityRole="button"
                          onPress={() => savePlan(editing.trigger!, t.id)}
                          style={styles.pick}
                          scaleTo={0.985}>
                          <Icon name={t.icon} android={t.android} size={16} color={Colors.accent} />
                          <Text style={styles.pickText}>{t.title}</Text>
                        </Tap>
                      ))}
                    </View>
                  </>
                )}
                <LinkButton title="Cancel" onPress={() => setEditing(null)} />
              </Card>
            </Animated.View>
          ) : unused.length ? (
            <Tap accessibilityRole="button" onPress={() => setEditing({})} style={styles.add} scaleTo={0.985}>
              <Icon name="plus" android="add" size={15} color={Colors.text2} />
              <Text style={styles.addText}>Add a moment</Text>
            </Tap>
          ) : null}
        </Enter>

        {/* Toolkit */}
        <Enter i={2} style={{ gap: 10 }}>
          <View style={styles.between}>
            <Eyebrow>Your toolkit</Eyebrow>
            <Caption>Tap one when a craving hits</Caption>
          </View>
          {tools.map((t) => {
            const used = toolsUsed[t.id] === today;
            const label = t.action === 'timer' ? 'Start' : t.action === 'text' ? 'Text' : t.action ? 'Open' : null;
            return (
              <Card key={t.id} style={styles.toolRow}>
                <View style={styles.planIcon}>
                  <Icon name={t.icon} android={t.android} size={17} color={Colors.accent} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.toolTitle}>{t.title}</Text>
                  {t.action === 'timer' && timerEnd ? (
                    <DelayCountdown end={timerEnd} />
                  ) : (
                    <Caption style={{ color: Colors.text2, lineHeight: 18 }}>{t.how}</Caption>
                  )}
                </View>
                {label ? (
                  <Tap accessibilityRole="button" onPress={() => runTool(t)} style={styles.go}>
                    <Text style={styles.goText}>{label}</Text>
                  </Tap>
                ) : (
                  <Tap
                    accessibilityRole="checkbox"
                    accessibilityLabel={`I did this: ${t.title}`}
                    accessibilityState={{ checked: used }}
                    onPress={() => markUsed(t.id)}
                    style={[styles.check, used && styles.checkOn]}>
                    <Icon name="checkmark" android="check" size={14} color={used ? Colors.onAccent : Colors.text3} weight="bold" />
                  </Tap>
                )}
              </Card>
            );
          })}
        </Enter>

        {/* When cravings hit */}
        <Enter i={3}>
          <Card>
            <View style={styles.between}>
              <Text style={styles.cardTitle}>When your cravings hit</Text>
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
                  Your hardest window is {LABELS[peak]}m to {LABELS[(peak + 1) % 12]}m. Have a tool ready for it.
                </Caption>
              </>
            ) : (
              <Caption style={{ color: Colors.text2, lineHeight: 19 }}>
                Each time you tap “I’m having a craving”, we note the time. After a few days, your pattern shows up here.
              </Caption>
            )}
          </Card>
        </Enter>
      </Screen>
      <CravingButton />
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontFamily: Fonts.semi, fontSize: 16, color: Colors.text },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 72, marginTop: 12 },
  barCol: { flex: 1, justifyContent: 'flex-end' },
  axis: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  axisLabel: { width: 60 },
  bar: { borderRadius: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  planIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTool: { fontFamily: Fonts.semi, fontSize: 17, lineHeight: 22, color: Colors.text },
  editQ: { fontFamily: Fonts.displaySemi, fontSize: 19, lineHeight: 24, color: Colors.text },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: Colors.surfaceHigh,
  },
  pickText: { fontFamily: Fonts.semi, fontSize: 15.5, color: Colors.text },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  toolTitle: { fontFamily: Fonts.semi, fontSize: 16, color: Colors.text },
  go: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goText: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.onAccent },
  check: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  add: {
    flexDirection: 'row',
    gap: 8,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: Fonts.semi, fontSize: 15, color: Colors.text2 },
});
