import type { State } from '@/lib/store';

/**
 * Short, strong lines shown after the smoke clears in SOS. Written for Xhale (not attributed
 * quotes), grouped by what the user told us in onboarding so the first ones they see fit them.
 * Indexes in `sounds` match SOUNDS_LIKE_YOU in quiz.ts.
 */
const BY_SOUND: Record<number, string[]> = {
  0: [
    'It never took the stress away. It just made you wait for the next one.',
    'The calm you’re looking for isn’t in it. It’s on the other side of this breath.',
  ],
  1: ['You don’t have to hide anything from the person you’re becoming.', 'Nothing to hide is its own kind of freedom.'],
  2: [
    'Every time you tried, you learned where it gets hard. This time you’re ready for it.',
    'You don’t have to get it right every time. Just this time.',
  ],
  3: ['That restless feeling is your body healing, not a reason to give in.', 'Feeling off is temporary. Being free isn’t.'],
  4: ['Tonight’s sleep is being decided right now.', 'Real rest is waiting on the other side of this week.'],
  5: ['Every craving you ride out is money that stays yours.', 'You’re not giving something up. You’re getting everything back.'],
  6: ['Boredom passes. So will this.', 'You’re not bored of life. You’re bored of this habit.'],
  7: [
    'Someone who loves you is counting on the you that says no right now.',
    'The people you love get the best of you when this doesn’t get the rest of you.',
  ],
};

const MANY_TRIES = ['This isn’t your first try. That’s exactly why it can be your last.'];

const WEED = ['Clear head, clear choices. You’re choosing clear.', 'You’re remembering what it feels like to be fully here.'];

const NICOTINE = [
  'Nicotine promises relief it can’t deliver. You’ve felt that every time.',
  'The craving is the nicotine leaving. Let it go.',
];

const ANYONE = [
  'The craving is loud because it’s losing.',
  'You’ve survived every craving you’ve ever had. You’ll survive this one.',
  'In five minutes this will be gone. What you choose now stays.',
  'Strong isn’t never wanting it. Strong is waiting it out.',
  'Discomfort now. Freedom for good.',
  'You are not your cravings. You’re the one who decides.',
];

/** The lines that fit this person, most personal first. */
export function quotesFor(state: State): string[] {
  const out: string[] = [];
  const sounds = Array.isArray(state.answers.sounds) ? (state.answers.sounds as number[]) : [];
  sounds.forEach((i) => out.push(...(BY_SOUND[i] ?? [])));
  if (typeof state.answers.tries === 'number' && state.answers.tries >= 2) out.push(...MANY_TRIES);
  if (state.substances.includes('weed')) out.push(...WEED);
  if (state.substances.includes('cig') || state.substances.includes('vape')) out.push(...NICOTINE);
  out.push(...ANYONE);
  return [...new Set(out)];
}

/** One line, rotating with `n` (each SOS round), starting from a different place each day. */
export function pickQuote(state: State, n: number, day = new Date().getDate()) {
  const list = quotesFor(state);
  const personal = Math.max(1, list.length - ANYONE.length);
  // First round of the day: always a personal one. Later rounds walk through the rest.
  const i = n === 0 ? day % personal : (day + n) % list.length;
  return list[i];
}
