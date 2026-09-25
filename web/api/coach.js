// Coach API for Exhale, deployed as a Vercel function at /api/coach.
// Keeps the Anthropic API key off the phone.
//
// POST /api/coach  { messages: [{ role: 'user' | 'assistant', text }], context: {...} }
//   header x-user-id: RevenueCat app user ID (or the app's device ID before RevenueCat is set up)
//   -> { reply, crisis }
//
// Env:
//   ANTHROPIC_API_KEY          required
//   REVENUECAT_SECRET_KEY      optional. When set, only users with the `pro` entitlement get replies.
//   KV_REST_API_URL / KV_REST_API_TOKEN (Upstash Redis from the Vercel Marketplace)
//                              optional. When set, rate limits are shared across instances.
//   COACH_DAILY_LIMIT          optional, messages per user per day (default 60)
//
// Message content is never logged or stored.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
const MAX_TURNS = 30;
const MAX_CHARS = 2000;
const DAILY_LIMIT = Number(process.env.COACH_DAILY_LIMIT ?? 60);
const IP_DAILY_LIMIT = DAILY_LIMIT * 5;

const SYSTEM = `You are Coach, the in-app support companion in a quit app for cigarettes, vaping and weed. People open you when a craving is hitting, when they've slipped, or late at night when they can't sleep.

How you help:
- Keep replies short: 2 to 4 sentences, plain words, like a friend texting back. No headings, no bullet lists, no emoji.
- Use what you know about them (their habits, their "why", symptoms, day count, their if-then plans) so it feels personal, but don't recite it back.
- Cravings: remind them a craving peaks and fades within minutes, help them notice it without acting on it (urge surfing), and suggest one concrete thing to do right now, such as their own if-then plan, a short walk, cold water, or the SOS screen.
- Slips: no shame. A slip is not a relapse. Help them work out what triggered it and set one if-then plan for next time.
- Withdrawal: explain that irritability, poor sleep, vivid dreams and low mood are normal and temporary, using typical timelines, without promising exact dates.
- For heavy nicotine users, it's fine to mention that patches or gum raise the odds of quitting and that a pharmacist or doctor can advise. Don't give dosing instructions and don't diagnose.
- You are not a doctor or therapist. For medical questions (chest pain, pregnancy, medication interactions, severe withdrawal), tell them to contact a doctor.

Safety comes first:
- If they mention suicide, self-harm, wanting to die, or being in danger, stop coaching about quitting. Respond with warmth, take it seriously, and encourage them to reach out now: in the US, call or text 988 (Suicide & Crisis Lifeline); elsewhere, local emergency services or a local crisis line. Ask if they are safe right now.
- If they describe a medical emergency, tell them to call emergency services.`;

const CRISIS =
  /\b(suicid\w*|kill (my ?self|me)|end (it|my life)|want to die|don'?t want to (live|be here)|self[- ]?harm|hurt(ing)? myself|cut(ting)? myself|overdos\w*)\b/i;

function contextBlock(ctx = {}) {
  const lines = [
    `Quitting: ${(ctx.substances ?? []).join(', ') || 'unknown'}`,
    ctx.modes
      ? `Approach: ${Object.entries(ctx.modes)
          .map(([s, m]) => `${s} ${m}`)
          .join(', ')}`
      : null,
    ctx.day !== undefined ? `Day ${ctx.day} of their plan` : null,
    ctx.why ? `Their why: ${ctx.why}` : null,
    ctx.symptoms?.length ? `Symptoms they named: ${ctx.symptoms.join(', ')}` : null,
    ctx.plans?.length ? `Their if-then plans: ${ctx.plans.map((p) => `if ${p.ifs}, then ${p.then}`).join('; ')}` : null,
    ctx.localTime ? `Their local time: ${ctx.localTime}` : null,
  ].filter(Boolean);
  return `About this person (from the app, not typed by them):\n${lines.join('\n')}`;
}

/* ---------- Access and rate limits ---------- */

const KV_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
const memoryCounts = new Map();

/** Counts one request against `key` for today and returns the new total. */
async function hit(key) {
  const day = new Date().toISOString().slice(0, 10);
  const k = `coach:${day}:${key}`;
  if (KV_URL && KV_TOKEN) {
    const res = await fetch(`${KV_URL}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${KV_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        ['INCR', k],
        ['EXPIRE', k, 60 * 60 * 26],
      ]),
    });
    if (res.ok) {
      const [incr] = await res.json();
      return Number(incr.result);
    }
  }
  // Best effort without Redis: per function instance only.
  const n = (memoryCounts.get(k) ?? 0) + 1;
  memoryCounts.set(k, n);
  return n;
}

const entitlementCache = new Map();

async function isPro(userId) {
  const secret = process.env.REVENUECAT_SECRET_KEY;
  if (!secret) return true; // Before RevenueCat is set up (beta), any app install can use Coach.
  const cached = entitlementCache.get(userId);
  if (cached && cached.until > Date.now()) return cached.ok;
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  const pro = data?.subscriber?.entitlements?.pro;
  const ok = !!pro && (!pro.expires_date || new Date(pro.expires_date).getTime() > Date.now());
  entitlementCache.set(userId, { ok, until: Date.now() + 10 * 60 * 1000 });
  return ok;
}

/* ---------- Reply ---------- */

async function reply(body) {
  const history = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_CHARS) }));
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length) throw Object.assign(new Error('No user message'), { status: 400 });

  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const crisis = CRISIS.test(lastUser?.text ?? '');

  const response = await client.beta.messages.create({
    model: 'claude-opus-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: contextBlock(body.context) },
    ],
    messages: history.map((m) => ({ role: m.role, content: m.text })),
  });

  if (response.stop_reason === 'refusal') {
    return { reply: "I can't help with that one, but I'm here for anything about cravings, slips or how you're feeling.", crisis };
  }
  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return { reply: text || "I'm here. Tell me what's going on.", crisis };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userId = String(req.headers['x-user-id'] ?? '').slice(0, 128);
  if (!userId) return res.status(401).json({ error: 'Missing user' });
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || 'unknown';

  try {
    if (!(await isPro(userId))) return res.status(403).json({ error: 'Subscription required' });
    const [userCount, ipCount] = await Promise.all([hit(`u:${userId}`), hit(`ip:${ip}`)]);
    if (userCount > DAILY_LIMIT || ipCount > IP_DAILY_LIMIT) {
      return res.status(429).json({ error: 'Daily Coach limit reached. It resets tomorrow.' });
    }
    return res.status(200).json(await reply(req.body));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Busy, try again in a moment' });
    if (e instanceof Anthropic.APIError) {
      console.error('Anthropic error', e.status);
      return res.status(502).json({ error: 'Coach is unavailable right now' });
    }
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error('Coach error', e?.name);
    return res.status(500).json({ error: 'Server error' });
  }
}
