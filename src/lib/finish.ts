import { router } from 'expo-router';

import { track } from '@/lib/analytics';
import { getState, setState } from '@/lib/store';
import { planFromWhen } from '@/lib/personal';
import { starterPlan } from '@/lib/tools';

/** Marks onboarding done and starts the clock. Safe to call before navigation is ready. */
export function completeOnboarding() {
  setState((s) => ({
    pro: true,
    onboarded: true,
    startedAt: s.startedAt ?? Date.now(),
    triggerPlans: s.triggerPlans.length
      ? s.triggerPlans
      : planFromWhen(s.answers).length
        ? planFromWhen(s.answers)
        : starterPlan(s.substances, s.habits.weedWhen),
  }));
  track('onboarding_completed', { habits: getState().substances.join(',') });
}

/** Called after a successful purchase: open the app. */
export function unlock() {
  completeOnboarding();
  router.replace('/');
}
