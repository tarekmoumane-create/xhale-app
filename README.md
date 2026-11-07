# Xhale

An iOS-first Expo app that helps people quit cigarettes, vaping and weed in any combination. The product spec is in `../PRODUCT.md`.

## Run it

```bash
npm install
cp .env.example .env        # optional for now: purchases are simulated without keys
npx expo run:ios            # development build: camera, mic and purchases need native code
```

Expo Go can open most screens, but use a development build to test the SOS camera, the microphone "blow" detection and real purchases.

To start over from onboarding in development, delete the app from the simulator. State lives in on-device SQLite.

### Website and Coach server (Vercel)

`web/` is one Vercel project: the home page, privacy policy and terms (`web/public/`) and the Coach API (`web/api/coach.js`).

```bash
cd web
npm install
npx vercel dev          # local: http://localhost:3000/api/coach
npx vercel --prod       # deploy
```

Vercel env vars: `ANTHROPIC_API_KEY` (required), `REVENUECAT_SECRET_KEY` (turns on the subscription check), `KV_REST_API_URL` + `KV_REST_API_TOKEN` (Upstash Redis for shared rate limits), `COACH_DAILY_LIMIT` (default 60).

The app calls `${EXPO_PUBLIC_COACH_URL}/coach`, so set it to `https://<your-domain>/api`. The Anthropic key stays on the server and is never shipped in the app.

## Layout

```
src/app/
  _layout.tsx          Root stack. Onboarding until onboarded + subscribed, then the app.
  onboarding/          pick → quiz → score → symptoms → science → habits → plan → paywall (→ offer) → pledge
  (tabs)/              Today · Plan · Coach · Recovery (native tabs)
  sos.tsx              Craving SOS: front camera, fog you blow away (mic level), 5-minute craving wave
  slip.tsx             No-shame slip logging. Streak restarts, total clean days are kept.
src/lib/
  store.ts             App state persisted to expo-sqlite kv-store
  quiz.ts              Fagerström (nicotine) and CUDIT-R (weed) questions and scoring
  plan.ts              Costs, taper limits, streaks, clean days, milestones
  purchases.ts         RevenueCat wrapper (simulated without keys)
  notifications.ts     Clears notifications queued by older versions; Xhale sends none
  coach.ts             Coach client plus client-side crisis detection
web/api/coach.js       Coach API (Claude) on Vercel: crisis guardrails, rate limits, subscription check
web/public/            Home page, privacy policy, terms
```

## Store setup (RevenueCat + App Store Connect)

| Product | Price | RevenueCat |
|---|---|---|
| Weekly | $4.99/week | `default` offering, `$rc_weekly` |
| Yearly | $49/year | `default` offering, `$rc_annual` |
| Yearly (exit offer) | $19.99 first-year intro price, then $49 | `exit_offer` offering, `$rc_annual` |

All three grant the `xhale_pro` entitlement. Bundle ID: `com.tarekmoumane.xhale`.

## Not built yet

Apple Watch puff detection, Screen Time "hard mode", community, referrals, the Learn section, cancellation survey. See PRODUCT.md.
