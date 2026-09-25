import { dayIndex } from '@/lib/plan';
import { appUserId } from '@/lib/purchases';
import type { ChatMessage, State } from '@/lib/store';

const COACH_URL = process.env.EXPO_PUBLIC_COACH_URL;

const CRISIS =
  /\b(suicid\w*|kill (my ?self|me)|end (it|my life)|want to die|don'?t want to (live|be here)|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself|overdos\w*)\b/i;

export function looksLikeCrisis(text: string) {
  return CRISIS.test(text);
}

/** Built-in replies used when the Coach server isn't configured or can't be reached. */
function offlineReply(text: string, state: State) {
  const t = text.toLowerCase();
  const why = state.why ? ` You told us you're doing this ${state.why}. That still matters right now.` : '';
  const plan = state.plans[0];
  if (/slip|relapse|gave in|smoked|vaped|used again/.test(t)) {
    return 'Thank you for telling me. A slip isn\u2019t a relapse, and it doesn\u2019t erase the days you\u2019ve put in. What was happening right before it? Log it on the slip screen and we\u2019ll turn it into a plan for next time.';
  }
  if (/sleep|awake|insomnia|night/.test(t)) {
    return (
      'Rough sleep is one of the most common parts of quitting, and it\u2019s temporary. Try this: phone away, lights low, and breathe in for 4 and out for 6 for ten minutes. If you\u2019re still awake after that, get up and do something dull until you\u2019re sleepy.' +
      why
    );
  }
  if (/irritab|angry|mood|snappy|anxious|anxiety/.test(t)) {
    return 'That edge you\u2019re feeling is withdrawal, not who you are. It usually peaks in the first few days and eases within a couple of weeks. Cold water, a short walk and food all help take the edge off.';
  }
  return (
    'That pull is real, and it will pass. Most cravings peak and fade within five minutes. Don\u2019t fight it, just notice it and wait it out.' +
    (plan
      ? ` Your plan for this: if ${plan.ifs}, ${plan.then.charAt(0).toLowerCase() + plan.then.slice(1)}`
      : ' Open SOS and ride the wave with me.') +
    why
  );
}

export async function askCoach(messages: ChatMessage[], state: State): Promise<string> {
  const last = messages[messages.length - 1]?.text ?? '';
  if (!COACH_URL) {
    await new Promise((r) => setTimeout(r, 900));
    return offlineReply(last, state);
  }
  let res: Response;
  try {
    res = await fetch(`${COACH_URL.replace(/\/$/, '')}/coach`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-user-id': await appUserId(state.deviceId) },
      body: JSON.stringify({
        messages,
        context: {
          substances: state.substances,
          modes: Object.fromEntries(state.substances.map((s) => [s, state.modes[s]])),
          day: state.startedAt ? dayIndex(state.startedAt) + 1 : undefined,
          why: state.why,
          symptoms: state.symptoms,
          plans: state.plans.map(({ ifs, then }) => ({ ifs, then })),
          localTime: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        },
      }),
    });
  } catch {
    return offlineReply(last, state);
  }
  if (res.status === 429)
    return 'You’ve reached today’s Coach limit. It resets tomorrow. SOS and your plans are still here if a craving hits.';
  if (!res.ok) return offlineReply(last, state);
  const data = (await res.json()) as { reply: string };
  return data.reply;
}
