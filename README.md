# Ledger - OSRS Flip Tracker

Real-time-ish OSRS Grand Exchange margin tracker: watchlists, buy/sell
alerts (margin %, price thresholds, momentum), and push notifications to
browser, an installable PWA (Android/iOS), and a desktop Electron wrapper.

## Stack

- **Frontend:** Next.js (App Router) + Tailwind, deployed to Vercel
- **Backend:** Supabase. Postgres for data, Supabase Auth for magic link
  email sign-in, Edge Functions plus `pg_cron` for scheduled price polling
  and alert evaluation
- **Push delivery:** Firebase Cloud Messaging (free Spark plan)
- **Price data:** [OSRS Wiki Real-time Prices API](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices)
- **Desktop:** Electron shell (`/electron`) loading the deployed web app

## Project layout

src/app/ Next.js pages (login, dashboard)
src/components/ Watchlist search, flip table, alert rule form
src/hooks/ useAuth (Supabase), useWatchlistFlips (Postgres + Realtime)
src/lib/supabase/ Browser/server clients, item search (ILIKE)
src/lib/firebase/ Messaging-only client, push token registration
src/lib/osrs/ OSRS Wiki API client (TS, for future server-side use)
src/lib/signals/ Flip margin (GE-tax-aware) + momentum calculations
supabase/schema.sql Tables, RLS policies, and pg_cron schedules
supabase/functions/ Edge Functions (Deno): poll-prices, refresh-mapping
electron/ Desktop shell (electron-builder config)
public/manifest.json PWA manifest (installable on Android/iOS/desktop)
public/firebase-messaging-sw.js Background push service worker


The GE-tax/margin math and the OSRS Wiki API client each exist in two
places, `src/lib/` for the Next.js app and `supabase/functions/_shared/`
for the Edge Functions, since Edge Functions deploy separately and can't
share a bundler with Next.js. Mirror any tax-rate or API changes into both.

## Setup

1. Create a Supabase project. Copy `.env.example` to `.env.local` and fill
   in the Supabase URL/anon key from Project Settings -> API.
2. In the SQL editor, enable the `pg_cron` and `pg_net` extensions
   (Database -> Extensions), then run `supabase/schema.sql`, replacing
   `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` in the `cron.schedule(...)`
   calls first.
3. Enable Realtime on the `price_ticks` table (Database -> Replication) so
   the dashboard updates live.
4. Magic link email sign-in is on by default. In Authentication -> URL
   Configuration, set Site URL to your deployed app's URL, and add
   `<your-app-url>/auth/callback` (plus `http://localhost:3000/auth/callback`
   for local dev) to Redirect URLs.
5. Deploy the Edge Functions: `supabase functions deploy poll-prices` and
   `supabase functions deploy refresh-mapping`.
6. Set Edge Function secrets: `supabase secrets set OSRS_API_USER_AGENT="…" FCM_PROJECT_ID="…" FCM_CLIENT_EMAIL="…" FCM_PRIVATE_KEY="…"`
   (the FCM values come from a Firebase service account JSON: Firebase
   Console -> Project Settings -> Service Accounts -> Generate new key).
7. Create a Firebase project for push, enable Cloud Messaging, and fill in
   the `NEXT_PUBLIC_FIREBASE_*` values plus the VAPID key, both in
   `.env.local` and hand-copied into `public/firebase-messaging-sw.js`.
8. `npm install`, then `npm run dev`, or deploy to Vercel.

## Signal logic

- **Flip margin** (`src/lib/signals/flipFinder.ts` /
  `supabase/functions/_shared/geTax.ts`): net margin = instant-buy price
  minus instant-sell price minus GE tax (2%, capped at 5M gp/item, waived
  under 50gp).
- **Momentum** (`src/lib/signals/momentum.ts`): short/long moving-average
  crossover over stored price ticks, plus a volatility % over the long
  window. Not yet wired into the alert evaluator.

## Electron desktop app

cd electron
npm install
LEDGER_APP_URL=https://your-deployed-app.vercel.app npm start # dev
npm run dist # build installers


## Not yet built

- Per-item alert rules from the UI (currently only a global "any item ≥ X%
  margin" rule)
- Momentum-based alerts in `poll-prices`
- iOS PWA install onboarding
