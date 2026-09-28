import { useSyncExternalStore } from 'react';

import type { Substance } from '@/constants/theme';
import { kv } from '@/lib/kv';
import type { Answers } from '@/lib/quiz';

export type QuitMode = 'taper' | 'cold';

export type Habits = {
  cigPerDay: number;
  packPrice: number;
  vapePuffsPerDay: number;
  vapeDaysPerUnit: number;
  vapeUnitPrice: number;
  weedSessionsPerDay: number;
  weedPerWeek: number;
  weedWhen: string[];
};

export type UseLog = { t: number; s: Substance; n: number };
export type Slip = { t: number; s: Substance; trigger: string };
export type Craving = { t: number };
export type IfThenPlan = { id: string; ifs: string; then: string; s?: Substance };
export type ChatMessage = { role: 'user' | 'assistant'; text: string };

export type State = {
  substances: Substance[];
  answers: Answers;
  symptoms: string[];
  habits: Habits;
  modes: Record<Substance, QuitMode>;
  why: string;
  signed: boolean;
  /** Days (dayKey) the user ticked their morning pledge. */
  pledges: string[];
  startedAt: number | null;
  onboarded: boolean;
  pro: boolean;
  offerSeen: boolean;
  notifHour: number;
  logs: UseLog[];
  slips: Slip[];
  cravings: Craving[];
  plans: IfThenPlan[];
  planUsed: Record<string, string>;
  coach: ChatMessage[];
  /** Anonymous ID for this install, used for Coach rate limits until RevenueCat provides one. */
  deviceId: string;
};

const KEY = 'exhale-state-v1';

export const initialState: State = {
  substances: [],
  answers: {},
  symptoms: [],
  habits: {
    cigPerDay: 10,
    packPrice: 12,
    vapePuffsPerDay: 150,
    vapeDaysPerUnit: 4,
    vapeUnitPrice: 22,
    weedSessionsPerDay: 2,
    weedPerWeek: 40,
    weedWhen: [],
  },
  modes: { cig: 'taper', vape: 'taper', weed: 'cold' },
  why: '',
  signed: false,
  pledges: [],
  startedAt: null,
  onboarded: false,
  pro: false,
  offerSeen: false,
  notifHour: 15,
  logs: [],
  slips: [],
  cravings: [],
  plans: [],
  planUsed: {},
  coach: [],
  deviceId: '',
};

function load(): State {
  try {
    const raw = kv.get(KEY);
    if (!raw) return initialState;
    const saved = JSON.parse(raw) as Partial<State>;
    return { ...initialState, ...saved, habits: { ...initialState.habits, ...saved.habits } };
  } catch {
    return initialState;
  }
}

function newId() {
  return 'dev_' + Array.from({ length: 24 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
}

let state: State = load();
if (!state.deviceId) {
  state = { ...state, deviceId: newId() };
  kv.set(KEY, JSON.stringify(state));
}
const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  kv.set(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function resetState() {
  state = initialState;
  kv.remove(KEY);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Subscribe to one slice of state. The selector must return a stable value (a field, not a new object). */
export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state));
}
