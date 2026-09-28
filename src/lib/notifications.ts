import * as Notifications from 'expo-notifications';

import { lungsSince, lungUpdate, pickFact } from '@/lib/lungs';
import { dayKey, money, moneySaved, yearlyCost } from '@/lib/plan';
import type { State } from '@/lib/store';
import { quoteWhy } from '@/lib/why';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotifications() {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return status === 'granted';
}

const DAY = 86_400_000;
const AHEAD = 21; // days scheduled in advance; iOS keeps at most 64 pending notifications

function at(base: Date, days: number, hour: number, minute: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * Schedules the next three weeks of notifications, each written for the day it lands on:
 * - Mornings: the daily pledge, quoting their own why, with that day's lung update.
 * - 15 minutes before the user's usual craving time: money saved, a specific lung fact, or their why, in rotation.
 * SOS only opens from the in-app craving button, never from a notification. Rerun whenever state changes the numbers:
 * after onboarding, a slip, and when the app comes back to the foreground.
 */
export async function scheduleNudges(state: State, now = Date.now()) {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted || !state.startedAt) return;
  // Only replace our own daily notifications, not a craving timer that's running.
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending.filter((n) => n.identifier.startsWith('nudge-')).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  const since = lungsSince(state, now);
  const vapeOnly = state.substances.length === 1 && state.substances[0] === 'vape';
  const perDay = yearlyCost(state.habits, state.substances).total / 365;
  const saved = moneySaved(state, now);
  const today = new Date(now);
  const cravingHour = (state.notifHour + 23) % 24;

  const jobs: Promise<string>[] = [];
  for (let d = 0; d < AHEAD; d++) {
    const morning = at(today, d, 8, 30);
    const craving = at(today, d, cravingHour, 45);
    const lungDay = since === null ? null : Math.max(0, Math.floor((morning.getTime() - since) / DAY));
    const savedThen = saved + perDay * ((craving.getTime() - now) / DAY);

    // Skip this morning's if they've already pledged today.
    const pledged = d === 0 && state.pledges.includes(dayKey(now));
    if (morning.getTime() > now && !pledged) {
      const u = lungDay === null ? null : lungUpdate(lungDay, vapeOnly).current;
      const why = quoteWhy(state.why);
      const lungs = u ? `Your lungs today: ${u.title.toLowerCase()}.` : '';
      jobs.push(
        Notifications.scheduleNotificationAsync({
          identifier: `nudge-morning-${d}`,
          content: {
            title: 'Make today’s pledge',
            body: [why, lungs].filter(Boolean).join(' ') || 'One tap to commit to today.',
            data: { url: '/pledge-today' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morning },
        }),
      );
    }

    if (craving.getTime() > now) {
      const kinds = ['money', 'fact', state.why ? 'why' : 'fact'] as const;
      const kind = savedThen < 1 ? 'fact' : kinds[d % kinds.length];
      const content =
        kind === 'money'
          ? {
              title: `You’ve saved ${money(savedThen)}`,
              body: lungDay === null ? `That’s ${money(perDay)} a day you’re keeping.` : `And your lungs are on day ${lungDay} of healing.`,
              data: { url: '/' },
            }
          : kind === 'why'
            ? { title: 'Remember why you’re doing this', body: quoteWhy(state.why), data: { url: '/' } }
            : {
                title: lungDay === null ? 'Your lungs, right now' : `Your lungs, day ${lungDay}`,
                body: pickFact(state.substances, lungDay ?? 0, d).text,
                data: { url: '/recovery' },
              };
      jobs.push(
        Notifications.scheduleNotificationAsync({
          identifier: `nudge-craving-${d}`,
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: craving },
        }),
      );
    }
  }
  await Promise.all(jobs);
}

/** "Wait 10 minutes" from the craving plan: a check-in when the time is up. Returns false without permission. */
export async function startDelayTimer(minutes = 10) {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted && !(await requestNotifications())) return false;
  await Notifications.cancelScheduledNotificationAsync('craving-timer').catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: 'craving-timer',
    content: {
      title: `${minutes} minutes are up`,
      body: 'How’s the craving now? If it’s still there, try another tool from your plan.',
      data: { url: '/plan' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: minutes * 60 },
  });
  return true;
}
