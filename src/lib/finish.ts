import { router } from 'expo-router';

import { track } from '@/lib/analytics';
import { scheduleNudges } from '@/lib/notifications';
import { getState, setState } from '@/lib/store';
import { starterPlan } from '@/lib/tools';

/**
 * Called after a successful purchase. New users still have their check-in times to set;
 * someone renewing a lapsed subscription goes straight back into the app.
 */
export function unlock() {
  if (getState().onboarded) return finishOnboarding();
  setState({ pro: true });
  router.replace('/onboarding/notify');
}

/** Called at the end of onboarding: open the app and start the clock. */
export function finishOnboarding() {
  setState((s) => ({
    pro: true,
    onboarded: true,
    startedAt: s.startedAt ?? Date.now(),
    triggerPlans: s.triggerPlans.length ? s.triggerPlans : starterPlan(s.substances, s.habits.weedWhen),
  }));
  track('onboarding_completed', { habits: getState().substances.join(',') });
  scheduleNudges(getState()).catch(() => {});
  router.replace('/');
}
