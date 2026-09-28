import type { Substance } from '@/constants/theme';

/**
 * The onboarding quiz is up to 11 slides: questions, plus reflection slides that
 * mirror answers back, and an open question asking why they want to stop.
 * - Nicotine: Heaviness of Smoking Index (time to first use + amount per day, 0–6),
 *   worded for vaping when needed (an adaptation for vapers).
 * - Weed: two frequency items (0–8): losing control once started (from CUDIT-R) and
 *   faking sobriety around people. Not a validated scale; the results screen says it's a screening.
 */

export type Answers = Record<string, number | number[]>;

export type ChoiceSlide = {
  kind: 'choice';
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
  options: { label: string; sub?: string; points: number }[];
};
export type MultiSlide = { kind: 'multi'; id: string; eyebrow: string; title: string; sub?: string; options: string[] };
export type SliderSlide = {
  kind: 'slider';
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  display: (v: number) => string;
  caption: (v: number) => string;
};
export type ReflectionSlide = { kind: 'reflection'; id: string; content: (a: Answers) => { eyebrow: string; title: string; body: string } };
export type TextSlide = {
  kind: 'text';
  id: string;
  eyebrow: string;
  title: string;
  sub?: string;
  placeholder: string;
  suggestions: string[];
};
export type Slide = ChoiceSlide | MultiSlide | SliderSlide | ReflectionSlide | TextSlide;

export const QUIZ_LENGTH = 11;

const FREQ = ['Never', 'Less than once a month', 'About once a month', 'Most weeks', 'Most days'];
const freq = () => FREQ.map((label, points) => ({ label, points }));

export const SOUNDS_LIKE_YOU = [
  'I use it to take the edge off stress',
  'I’ve hidden how much I use',
  'I’ve tried to cut back and couldn’t',
  'I feel off when I go too long without it',
  'I need it to fall asleep',
  'I spend more on it than I’d admit',
  'I reach for it when I’m bored',
  'It’s starting to affect people I care about',
];

/** Short second-person echoes of SOUNDS_LIKE_YOU, used in the reflection. */
const ECHO = [
  'reach for it to handle stress',
  'have hidden how much you use',
  'have tried to cut back before',
  'feel off when you go too long without it',
  'need it to fall asleep',
  'spend more than you’d admit',
  'reach for it when you’re bored',
  'can see it affecting people you care about',
];

/** Tap-to-fill starting points for the open "why" question. */
export const WHY_SUGGESTIONS = [
  'I want to sleep properly again',
  'I’m tired of burning my money',
  'I want to breathe easy again',
  'I want to feel in control again',
  'I’m done hiding it',
  'I want to be there for the people I love',
];

function nicotineWords(subs: Substance[]) {
  const cig = subs.includes('cig');
  const vape = subs.includes('vape');
  return {
    verb: cig && vape ? 'smoke or vape' : vape ? 'vape' : 'smoke',
    thing: cig && vape ? 'a cigarette or your vape' : vape ? 'your vape' : 'a cigarette',
  };
}

function thingFor(subs: Substance[]) {
  const names = subs.map((s) => (s === 'cig' ? 'smoking' : s === 'vape' ? 'vaping' : 'weed'));
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
}

export function buildQuiz(subs: Substance[]): Slide[] {
  const nicotine = subs.includes('cig') || subs.includes('vape');
  const weed = subs.includes('weed');
  const w = nicotineWords(subs);
  const habit = thingFor(subs);

  const years: ChoiceSlide = {
    kind: 'choice',
    id: 'years',
    eyebrow: 'Your story',
    title: `How long has ${habit} been part of your life?`,
    options: [
      { label: 'Less than a year', points: 0 },
      { label: '1 to 3 years', points: 1 },
      { label: '3 to 10 years', points: 2 },
      { label: 'More than 10 years', points: 3 },
    ],
  };

  const wake: ChoiceSlide = {
    kind: 'choice',
    id: 'n_wake',
    eyebrow: 'Mornings',
    title: `When you wake up, how long until you reach for ${w.thing}?`,
    sub: 'Go with a normal day, not your best one.',
    options: [
      { label: 'Within 5 minutes', sub: 'Before I’m really awake', points: 3 },
      { label: 'Within half an hour', points: 2 },
      { label: 'Within an hour', points: 1 },
      { label: 'It can wait longer than that', points: 0 },
    ],
  };

  const amount: SliderSlide = {
    kind: 'slider',
    id: 'n_amount',
    eyebrow: 'A normal day',
    title: `How many times a day do you ${w.verb}?`,
    sub: subs.includes('vape') ? 'Count each time you pick it up, not each puff.' : 'A rough number is fine.',
    min: 1,
    max: 40,
    step: 1,
    initial: 12,
    display: (v) => (v >= 40 ? '40+' : String(v)),
    caption: (v) =>
      v <= 10
        ? 'Lighter than most. That helps.'
        : v <= 20
          ? 'Right in the middle of where most people start.'
          : 'That’s a lot to carry. Your plan will step it down gradually.',
  };

  const body: ReflectionSlide = {
    kind: 'reflection',
    id: 'r_body',
    content: (a) => {
      const firstThing = typeof a.n_wake === 'number' && a.n_wake <= 1;
      return firstThing
        ? {
            eyebrow: 'What that tells us',
            title: 'That first reach isn’t you. It’s your body.',
            body: 'That morning pull is physical dependence. It’s common, and it fades faster than you’d expect.',
          }
        : {
            eyebrow: 'What that tells us',
            title: 'This is more habit than need.',
            body: 'You don’t need it first thing. That makes this a habit, and habits are beatable.',
          };
    },
  };

  const wStop: ChoiceSlide = {
    kind: 'choice',
    id: 'w_stop',
    eyebrow: 'Weed · last 6 months',
    title: 'How often did you keep going after you meant to stop?',
    options: freq(),
  };
  const wHide: ChoiceSlide = {
    kind: 'choice',
    id: 'w_hide',
    eyebrow: 'Weed · last 6 months',
    title: 'How often do you find yourself faking sobriety around friends or loved ones?',
    options: freq(),
  };

  const sounds: MultiSlide = {
    kind: 'multi',
    id: 'sounds',
    eyebrow: 'Honestly',
    title: 'Which of these sound like you?',
    sub: 'Pick as many as you like. This stays on your phone.',
    options: SOUNDS_LIKE_YOU,
  };

  const heard: ReflectionSlide = {
    kind: 'reflection',
    id: 'r_heard',
    content: (a) => {
      const picked = Array.isArray(a.sounds) ? a.sounds : [];
      if (picked.length === 0) {
        return {
          eyebrow: 'We hear you',
          title: 'Catching it early is the best time.',
          body: 'None of those fit yet. Quitting now is the easiest version of this.',
        };
      }
      const [x, y] = picked.map((i) => ECHO[i]);
      return {
        eyebrow: 'We hear you',
        title: picked.length >= 3 ? 'That’s a lot to be carrying.' : 'You’re not the only one.',
        body: y
          ? `You said you ${x} and ${y}. That’s one of the most common patterns. It’s been doing a job for you. Your plan hands that job to something better.`
          : `You said you ${x}. It’s been doing a job for you. Your plan hands that job to something better.`,
      };
    },
  };

  const after: ChoiceSlide = {
    kind: 'choice',
    id: 'after',
    eyebrow: 'Right after',
    title: 'How do you usually feel just after you use?',
    options: [
      { label: 'Relief, but it fades fast', points: 0 },
      { label: 'Fine, nothing special', points: 0 },
      { label: 'Annoyed at myself', points: 0 },
      { label: 'Honestly, a bit worse', points: 0 },
    ],
  };

  const tries: ChoiceSlide = {
    kind: 'choice',
    id: 'tries',
    eyebrow: 'Before now',
    title: 'How many times have you seriously tried to quit?',
    options: [
      { label: 'This is my first real try', points: 0 },
      { label: 'Once or twice', points: 1 },
      { label: 'A few times', points: 2 },
      { label: 'I’ve lost count', points: 3 },
    ],
  };

  const triesReflect: ReflectionSlide = {
    kind: 'reflection',
    id: 'r_tries',
    content: (a) =>
      a.tries === 0
        ? {
            eyebrow: 'Good news',
            title: 'Going in with a plan changes everything.',
            body: 'Most people wing it. You’ll have a plan for your hardest moments before they happen.',
          }
        : {
            eyebrow: 'Good news',
            title: 'Those tries weren’t failures.',
            body: 'Most people who quit needed more than one try. This time you’ll have a plan for where it gets hard.',
          },
  };

  const why: TextSlide = {
    kind: 'text',
    id: 'why',
    eyebrow: 'Your why',
    title: 'Why do you want to stop?',
    sub: 'In your own words. We’ll show you this every morning when you make your pledge.',
    placeholder: 'I want to stop because…',
    suggestions: WHY_SUGGESTIONS,
  };

  const ready: SliderSlide = {
    kind: 'slider',
    id: 'ready',
    eyebrow: 'Last one',
    title: 'How ready do you feel, honestly?',
    min: 1,
    max: 10,
    step: 1,
    initial: 6,
    display: (v) => `${v}/10`,
    caption: (v) =>
      v <= 4
        ? 'That’s okay. You don’t have to feel ready to start. You just have to start.'
        : v <= 7
          ? 'Somewhere in the middle is where most people begin.'
          : 'Good. Let’s put that to work.',
  };

  const core: Slide[] = [];
  if (nicotine) core.push(wake, amount);
  if (weed) core.push(wStop, wHide);
  const tail: Slide[] = [sounds, heard, tries, triesReflect, why, ready];

  // Optional slides fill the quiz up to exactly QUIZ_LENGTH, in this priority order.
  const optional: Slide[] = [years, ...(nicotine ? [body] : []), after];
  let room = QUIZ_LENGTH - core.length - tail.length;
  const extra = optional.filter(() => room-- > 0);

  const slides: Slide[] = [];
  if (extra.includes(years)) slides.push(years);
  slides.push(...core.filter((x) => x.id.startsWith('n_')));
  if (extra.includes(body)) slides.push(body);
  slides.push(...core.filter((x) => x.id.startsWith('w_')));
  slides.push(sounds, heard);
  if (extra.includes(after)) slides.push(after);
  slides.push(tries, triesReflect, why, ready);
  return slides;
}

/* ---------- Scoring ---------- */

export type ScoreResult = {
  key: 'nicotine' | 'weed';
  label: string;
  level: 'Low' | 'Moderate' | 'High';
  segment: 0 | 1 | 2;
  meaning: string;
  notAlone: string;
};

function num(a: Answers, id: string) {
  const v = a[id];
  return typeof v === 'number' ? v : 0;
}

export function scoreAnswers(subs: Substance[], a: Answers): ScoreResult[] {
  const out: ScoreResult[] = [];
  if (subs.includes('cig') || subs.includes('vape')) {
    const wakePts = [3, 2, 1, 0][num(a, 'n_wake')] ?? 0;
    const n = typeof a.n_amount === 'number' ? a.n_amount : 12;
    const amountPts = n <= 10 ? 0 : n <= 20 ? 1 : n <= 30 ? 2 : 3;
    const hsi = wakePts + amountPts;
    const segment = hsi <= 1 ? 0 : hsi <= 4 ? 1 : 2;
    out.push({
      key: 'nicotine',
      label: 'Nicotine dependence',
      level: (['Low', 'Moderate', 'High'] as const)[segment],
      segment,
      meaning: [
        'Your body isn’t hooked hard. The fight is mostly habit and routine, which is exactly what your plan targets.',
        'The first 3 days are the toughest. Your plan puts the most support there.',
        'Your body is heavily dependent. You need more than willpower, and you’ll get it.',
      ][segment],
      notAlone: 'About 7 in 10 adults who smoke say they want to quit.',
    });
  }
  if (subs.includes('weed')) {
    const score = num(a, 'w_stop') + num(a, 'w_hide');
    const segment = score <= 1 ? 0 : score <= 4 ? 1 : 2;
    out.push({
      key: 'weed',
      label: 'Weed use',
      level: (['Low', 'Moderate', 'High'] as const)[segment],
      segment,
      meaning: [
        'Your answers don’t show a problem pattern yet. Stopping now is the easiest it will ever be.',
        'Weed is starting to cost more than it gives. Sleep may be rough for a week or two.',
        'This is a strong pattern of problem use. Most withdrawal fades within a few weeks.',
      ][segment],
      notAlone: 'About 3 in 10 people who use cannabis have some level of cannabis use disorder.',
    });
  }
  return out;
}
