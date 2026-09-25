import { router } from 'expo-router';

import { track } from '@/lib/analytics';
import { scheduleNudges } from '@/lib/notifications';
import { getState, setState, type IfThenPlan } from '@/lib/store';

function starterPlans(): IfThenPlan[] {
  const { substances, habits } = getState();
  const plans: IfThenPlan[] = [];
  const nicotine = substances.includes('cig') || substances.includes('vape');
  if (nicotine) {
    plans.push({ id: 'wake', ifs: 'I just woke up', then: 'Brush my teeth and drink a glass of water first.' });
    plans.push({ id: 'meal', ifs: 'I finish a meal', then: 'Get up from the table straight away and chew gum.' });
  }
  if (substances.includes('weed')) {
    if (habits.weedWhen.includes('To fall asleep') || plans.length < 2) {
      plans.push({ id: 'night', ifs: 'I can’t sleep', then: 'Do the ten-minute wind-down and leave my phone in the kitchen.', s: 'weed' });
    }
    if (habits.weedWhen.includes('After work')) {
      plans.push({
        id: 'work',
        ifs: 'I get home from work',
        then: 'Change clothes and walk for ten minutes before sitting down.',
        s: 'weed',
      });
    }
  }
  plans.push({ id: 'stress', ifs: 'I feel stressed', then: 'Open SOS and ride out the wave before deciding anything.' });
  return plans;
}

/**
 * Called after a successful purchase. New users still have the pledge and check-ins to do;
 * someone renewing a lapsed subscription goes straight back into the app.
 */
export function unlock() {
  if (getState().onboarded) return finishOnboarding();
  setState({ pro: true });
  router.replace('/onboarding/pledge');
}

/** Called at the end of onboarding: open the app and start the clock. */
export function finishOnboarding() {
  setState((s) => ({
    pro: true,
    onboarded: true,
    startedAt: s.startedAt ?? Date.now(),
    plans: s.plans.length ? s.plans : starterPlans(),
  }));
  track('onboarding_completed', { habits: getState().substances.join(',') });
  scheduleNudges(getState()).catch(() => {});
  router.replace('/');
}
