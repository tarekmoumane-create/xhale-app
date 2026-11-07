import type { Substance } from '@/constants/theme';

/**
 * What people actually do to get through a craving. Drawn from standard quit-smoking advice
 * (the NHS "4 Ds": delay, deep breathing, drink water, do something else), urge surfing from
 * acceptance and commitment therapy, and studies showing short bursts of exercise cut cravings.
 * `action` makes a tool do something in the app instead of just being a reminder.
 */
export type ToolId =
  | 'delay'
  | 'breathe'
  | 'surf'
  | 'water'
  | 'walk'
  | 'move'
  | 'gum'
  | 'hands'
  | 'snack'
  | 'teeth'
  | 'leave'
  | 'text'
  | 'why'
  | 'cold'
  | 'nrt'
  | 'winddown';

export type Tool = {
  id: ToolId;
  title: string;
  how: string;
  icon: string;
  android: string;
  action?: 'timer' | 'sos' | 'text' | 'why';
  only?: Substance[];
};

export const TOOLS: Tool[] = [
  {
    id: 'delay',
    title: 'Wait 10 minutes',
    how: 'Start a 10-minute timer and tell yourself you’ll decide after. Most cravings pass before it ends.',
    icon: 'timer',
    android: 'timer',
    action: 'timer',
  },
  {
    id: 'breathe',
    title: 'Slow breathing',
    how: 'Breathe in for 4, out for 6, for two minutes. Long breaths out calm the urge in your body.',
    icon: 'wind',
    android: 'air',
    action: 'sos',
  },
  {
    id: 'surf',
    title: 'Ride the wave',
    how: 'Notice where you feel the craving and rate it from 1 to 10. Watch it rise, peak and fall without acting on it.',
    icon: 'waveform.path',
    android: 'waves',
    action: 'sos',
  },
  {
    id: 'water',
    title: 'Drink cold water',
    how: 'Sip a full glass slowly. It gives your hands and mouth something to do.',
    icon: 'drop.fill',
    android: 'water_drop',
  },
  {
    id: 'walk',
    title: 'Go for a walk',
    how: 'Even 5 minutes of brisk walking has been shown to take the edge off a craving.',
    icon: 'figure.walk',
    android: 'directions_walk',
  },
  {
    id: 'move',
    title: '20 squats or push-ups',
    how: 'A short, hard burst of exercise is one of the fastest ways to cut a craving.',
    icon: 'figure.strengthtraining.traditional',
    android: 'fitness_center',
  },
  {
    id: 'gum',
    title: 'Gum or a mint',
    how: 'Keep sugar-free gum or mints on you for the hand-to-mouth habit.',
    icon: 'mouth.fill',
    android: 'sentiment_satisfied',
  },
  {
    id: 'hands',
    title: 'Keep your hands busy',
    how: 'Hold something instead: a stress ball, a pen, a fidget toy.',
    icon: 'hand.raised.fill',
    android: 'back_hand',
  },
  {
    id: 'snack',
    title: 'Crunchy snack',
    how: 'Carrot sticks, apple slices or seeds. Something to chew on.',
    icon: 'carrot.fill',
    android: 'nutrition',
  },
  {
    id: 'teeth',
    title: 'Brush your teeth',
    how: 'A fresh, minty mouth makes smoking feel like the last thing you want.',
    icon: 'sparkles',
    android: 'clean_hands',
  },
  {
    id: 'leave',
    title: 'Change where you are',
    how: 'Get up and go to another room or step outside. Cravings are often tied to places.',
    icon: 'door.left.hand.open',
    android: 'door_open',
  },
  {
    id: 'text',
    title: 'Text someone',
    how: 'Tell a friend you’re having a craving. Saying it out loud takes some of its power away.',
    icon: 'message.fill',
    android: 'sms',
    action: 'text',
  },
  {
    id: 'why',
    title: 'Read your why',
    how: 'Reread why you’re doing this, in your own words.',
    icon: 'heart.fill',
    android: 'favorite',
    action: 'why',
  },
  {
    id: 'cold',
    title: 'Cold water on your face',
    how: 'Splash your face or hold something cold. It slows your heart rate and resets the moment.',
    icon: 'snowflake',
    android: 'ac_unit',
  },
  {
    id: 'nrt',
    title: 'Nicotine gum or lozenge',
    how: 'If you use nicotine replacement, a fast-acting gum or lozenge works within minutes.',
    icon: 'pills.fill',
    android: 'medication',
    only: ['cig', 'vape'],
  },
  {
    id: 'winddown',
    title: 'Wind down for sleep',
    how: 'Screens off and phone out of the bedroom. Lights low, then read or listen to something calm until you’re sleepy.',
    icon: 'moon.fill',
    android: 'bedtime',
    only: ['weed'],
  },
];

export type TriggerId =
  'wake' | 'coffee' | 'meal' | 'driving' | 'break' | 'stress' | 'bored' | 'drinking' | 'friends' | 'afterwork' | 'bed' | 'argument';

export const TRIGGERS: { id: TriggerId; label: string }[] = [
  { id: 'wake', label: 'Waking up' },
  { id: 'coffee', label: 'With coffee' },
  { id: 'meal', label: 'After meals' },
  { id: 'driving', label: 'Driving' },
  { id: 'break', label: 'Work breaks' },
  { id: 'stress', label: 'Feeling stressed' },
  { id: 'bored', label: 'Feeling bored' },
  { id: 'drinking', label: 'Drinking alcohol' },
  { id: 'friends', label: 'Friends who use' },
  { id: 'afterwork', label: 'After work' },
  { id: 'bed', label: 'Before bed' },
  { id: 'argument', label: 'After an argument' },
];

/** A trigger and the tool the user will use when it hits. */
export type TriggerPlan = { trigger: TriggerId; tool: ToolId };

export const toolById = (id: ToolId) => TOOLS.find((t) => t.id === id)!;
export const triggerLabel = (id: TriggerId) => TRIGGERS.find((t) => t.id === id)?.label ?? id;

export function toolsFor(substances: Substance[]) {
  return TOOLS.filter((t) => !t.only || t.only.some((s) => substances.includes(s)));
}

/** A sensible starting plan, based on their habits. They can change every line. */
export function starterPlan(substances: Substance[], weedWhen: string[]): TriggerPlan[] {
  const nicotine = substances.includes('cig') || substances.includes('vape');
  const weed = substances.includes('weed');
  const plan: TriggerPlan[] = [];
  if (nicotine) {
    plan.push({ trigger: 'wake', tool: 'water' }, { trigger: 'meal', tool: 'teeth' });
  }
  if (weed) {
    if (weedWhen.includes('To fall asleep') || !nicotine) plan.push({ trigger: 'bed', tool: 'winddown' });
    if (weedWhen.includes('After work')) plan.push({ trigger: 'afterwork', tool: 'walk' });
  }
  plan.push({ trigger: 'stress', tool: 'breathe' }, { trigger: 'bored', tool: 'leave' });
  return plan;
}
