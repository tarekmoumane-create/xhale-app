import type { Answers } from '@/lib/quiz';
import type { ToolId, TriggerId, TriggerPlan } from '@/lib/tools';

/**
 * The personal onboarding questions (who it's for, when it hits, what the money is for)
 * and the small phrases the rest of the app builds from the answers.
 */

export const WHO_OPTIONS = ['Myself', 'My partner', 'My kids', 'My parents', 'My friends'];
const WHO_YOUR = ['yourself', 'your partner', 'your kids', 'your parents', 'your friends'];
const WHO_MY = ['myself', 'my partner', 'my kids', 'my parents', 'my friends'];

/** Their hardest moments, each with the tool their plan starts with. */
export const WHEN_OPTIONS: { trigger: TriggerId; label: string; tool: ToolId }[] = [
  { trigger: 'wake', label: 'Waking up', tool: 'water' },
  { trigger: 'coffee', label: 'With coffee', tool: 'hands' },
  { trigger: 'meal', label: 'After meals', tool: 'teeth' },
  { trigger: 'driving', label: 'Driving', tool: 'breathe' },
  { trigger: 'stress', label: 'Stressed at work', tool: 'breathe' },
  { trigger: 'drinking', label: 'Drinking', tool: 'text' },
  { trigger: 'bored', label: 'Bored', tool: 'walk' },
  { trigger: 'bed', label: 'Late at night', tool: 'delay' },
];

export const MONEY_OPTIONS = ['A trip', 'Pay off debt', 'Something for someone I love', 'Save it'];
/** Short label for the money stat, e.g. "$84 for your trip". Empty for "Save it". */
const MONEY_FOR = ['for your trip', 'toward your debt', 'for someone you love', ''];

function picked(a: Answers, id: string) {
  const v = a[id];
  return Array.isArray(v) ? v : [];
}

function join(parts: string[]) {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** "your kids and your partner", or '' if they skipped. */
export function whoYour(a: Answers) {
  return join(picked(a, 'who').map((i) => WHO_YOUR[i]).filter(Boolean));
}

/** First-person version for the pledge: "my kids and my partner". */
export function whoMy(a: Answers) {
  return join(picked(a, 'who').map((i) => WHO_MY[i]).filter(Boolean));
}

/** "for your trip", or '' when they chose "Save it" or skipped. */
export function moneyFor(a: Answers) {
  const v = a.money;
  return typeof v === 'number' ? (MONEY_FOR[v] ?? '') : '';
}

/** Their chosen hardest moments, turned into a starting plan. */
export function planFromWhen(a: Answers): TriggerPlan[] {
  return picked(a, 'when')
    .map((i) => WHEN_OPTIONS[i])
    .filter(Boolean)
    .map((o) => ({ trigger: o.trigger, tool: o.tool }));
}
