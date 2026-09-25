import * as Notifications from 'expo-notifications';

import { lungsSince, lungUpdate, pickFact } from '@/lib/lungs';
import { money, moneySaved, yearlyCost } from '@/lib/plan';
import type { State } from '@/lib/store';

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
 * - Mornings: that day's lung update (or a plan nudge while tapering).
 * - 15 minutes before the user's usual craving time: money saved, a specific lung fact, or their why, in rotation.
 * SOS only opens from the in-app craving button, never from a notification. Rerun whenever state changes the numbers:
 * after onboarding, a slip, and when the app comes back to the foreground.
 */
export async function scheduleNudges(state: State, now = Date.now()) {
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted || !state.startedAt) return;
  await Notifications.cancelAllScheduledNotificationsAsync();

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

    if (morning.getTime() > now) {
      const u = lungDay === null ? null : lungUpdate(lungDay, vapeOnly).current;
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: u
            ? { title: `Your lungs, day ${lungDay}: ${u.title.toLowerCase()}`, body: u.body, data: { url: '/recovery' } }
            : { title: 'A fresh start', body: 'Today’s step takes two minutes. Do it before the day gets busy.', data: { url: '/' } },
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
              body:
                lungDay === null
                  ? `That’s ${money(perDay)} a day you’re keeping.`
                  : `And your lungs are on day ${lungDay} of healing.`,
              data: { url: '/' },
            }
          : kind === 'why'
            ? { title: 'Remember why', body: `You’re doing this ${state.why}.`, data: { url: '/' } }
            : {
                title: lungDay === null ? 'Your lungs, right now' : `Your lungs, day ${lungDay}`,
                body: pickFact(state.substances, lungDay ?? 0, d).text,
                data: { url: '/recovery' },
              };
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: craving },
        }),
      );
    }
  }
  await Promise.all(jobs);
}
