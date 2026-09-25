import type { Substance } from '@/constants/theme';
import type { Habits, State } from '@/lib/store';

const DAY = 86_400_000;

export const TAPER_WEEKS: Record<Substance, number> = { cig: 4, vape: 4, weed: 3 };

export function dayKey(t: number) {
  const d = new Date(t);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function startOfDay(t: number) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole days since the plan started (day 0 = start day). */
export function dayIndex(startedAt: number, now = Date.now()) {
  return Math.max(0, Math.floor((startOfDay(now) - startOfDay(startedAt)) / DAY));
}

export function yearlyCost(h: Habits, subs: Substance[]) {
  const cig = subs.includes('cig') ? (h.cigPerDay / 20) * h.packPrice * 365 : 0;
  const vape = subs.includes('vape') ? (h.vapeUnitPrice / Math.max(1, h.vapeDaysPerUnit)) * 365 : 0;
  const weed = subs.includes('weed') ? h.weedPerWeek * 52 : 0;
  return { cig, vape, weed, total: cig + vape + weed };
}

export function baseline(h: Habits, s: Substance) {
  return s === 'cig' ? h.cigPerDay : s === 'vape' ? h.vapePuffsPerDay : h.weedSessionsPerDay;
}

/** Today's allowance for a tapering habit: steps down weekly, reaching 0 after TAPER_WEEKS. */
export function dailyLimit(state: State, s: Substance, now = Date.now()) {
  if (state.modes[s] === 'cold' || state.startedAt === null) return 0;
  const week = Math.floor(dayIndex(state.startedAt, now) / 7);
  const weeks = TAPER_WEEKS[s];
  if (week >= weeks) return 0;
  return Math.max(1, Math.round((baseline(state.habits, s) * (weeks - week)) / (weeks + 1)));
}

export function taperEnd(startedAt: number, s: Substance) {
  return startOfDay(startedAt) + TAPER_WEEKS[s] * 7 * DAY;
}

export function usedToday(state: State, s: Substance, now = Date.now()) {
  const k = dayKey(now);
  return state.logs.filter((l) => l.s === s && dayKey(l.t) === k).reduce((n, l) => n + l.n, 0);
}

/** When the current clean streak for a habit began (null while still tapering). */
export function streakStart(state: State, s: Substance, now = Date.now()): number | null {
  if (state.startedAt === null) return null;
  const cleanFrom = state.modes[s] === 'cold' ? state.startedAt : taperEnd(state.startedAt, s);
  if (cleanFrom > now) return null;
  const lastSlip = state.slips.filter((x) => x.s === s && x.t >= cleanFrom).reduce((m, x) => Math.max(m, x.t), 0);
  return Math.max(cleanFrom, lastSlip);
}

/** Total days without a slip since going clean. A slip resets the streak, not this number. */
export function cleanDays(state: State, s: Substance, now = Date.now()) {
  if (state.startedAt === null) return 0;
  const cleanFrom = state.modes[s] === 'cold' ? state.startedAt : taperEnd(state.startedAt, s);
  if (cleanFrom > now) return 0;
  const total = dayIndex(cleanFrom, now);
  const slipDays = new Set(state.slips.filter((x) => x.s === s && x.t >= cleanFrom).map((x) => dayKey(x.t)));
  return Math.max(0, total - slipDays.size);
}

export function moneySaved(state: State, now = Date.now()) {
  if (state.startedAt === null) return 0;
  const perDay = yearlyCost(state.habits, state.substances).total / 365;
  const days = (now - state.startedAt) / DAY;
  // Subtract a rough cost for what was actually used, relative to baseline.
  const usedShare = state.substances.reduce((n, s) => {
    const b = baseline(state.habits, s);
    if (!b) return n;
    const used = state.logs.filter((l) => l.s === s).reduce((m, l) => m + l.n, 0);
    const costPerUnit = yearlyCost(state.habits, [s]).total / 365 / b;
    return n + used * costPerUnit;
  }, 0);
  return Math.max(0, perDay * days - usedShare);
}

export function money(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export type Milestone = { at: number; time: string; text: string };

/** Typical timelines, in days since going clean. */
export const MILESTONES: Record<Substance, Milestone[]> = {
  cig: [
    { at: 0.014, time: '20 minutes', text: 'Heart rate and blood pressure start to drop.' },
    { at: 0.5, time: '12 hours', text: 'Carbon monoxide in your blood falls to normal.' },
    { at: 3, time: '3 days', text: 'Nicotine is out of your system. Withdrawal usually peaks here.' },
    { at: 14, time: '2 weeks to 3 months', text: 'Circulation improves and your lungs start working better.' },
    { at: 30, time: '1 to 9 months', text: 'Less coughing and shortness of breath.' },
    { at: 365, time: '1 year', text: 'Your extra risk of heart disease is about half what it was.' },
  ],
  vape: [
    { at: 1, time: '1 day', text: 'Nicotine levels in your body drop fast.' },
    { at: 3, time: '3 days', text: 'Withdrawal peaks, then starts to ease.' },
    { at: 7, time: '1 to 2 weeks', text: 'Headaches and irritability fade for most people.' },
    { at: 21, time: '2 to 4 weeks', text: 'Cravings get less frequent and less intense.' },
    { at: 45, time: '1 to 3 months', text: 'Sleep, mood and focus settle.' },
  ],
  weed: [
    { at: 1, time: 'Days 1 to 3', text: 'Irritability, low appetite and trouble sleeping start.' },
    { at: 2, time: 'Days 2 to 6', text: 'Withdrawal is usually at its worst.' },
    { at: 7, time: 'Week 1 to 2', text: 'Vivid dreams come back as REM sleep rebounds.' },
    { at: 14, time: 'Weeks 2 to 4', text: 'Most symptoms fade and sleep starts to settle.' },
    { at: 30, time: '1 month and on', text: 'Many people notice clearer memory and focus.' },
  ],
};
