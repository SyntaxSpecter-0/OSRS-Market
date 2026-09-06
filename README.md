# Ledger — OSRS Flip Tracker

Real-time-ish OSRS Grand Exchange margin tracker: watchlists, buy/sell
alerts (margin %, price thresholds, momentum), and push notifications to
browser, an installable PWA (Android/iOS), and a desktop Electron wrapper.

## Stack

- **Frontend:** Next.js (App Router) + Tailwind, deployed to Vercel
- **Backend:** Supabase — Postgres (data), Supabase Auth (magic link email sign-in),
  Edge Functions + `pg_cron` (scheduled price polling + alert evaluation)
- **Push delivery only:** Firebase Cloud Messaging (free Spark plan — no
  Blaze/billing needed, since scheduling lives in Supabase, not Firebase)
- **Price data:** [OSRS Wiki Real-time Prices API](https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices)
- **Desktop:** Electron shell (`/electron`) loading the deployed web app

## Why this shape (a short history)

1. Started on Supabase.
2. Hit Supabase's free-tier cap of 2 active projects *per organization*.
3. Moved everything to Firebase (Firestore + Auth + Functions + FCM) to
   dodge the limit — but that traded a NoSQL data model for genuinely
   relational data (price history, watchlists, alert rules), and Firebase's
   *scheduled* Cloud Functions require the paid Blaze plan even to run at
   all (the free allowance is generous, but a card is required).
4. Also considered Vercel Cron instead of Firebase's scheduler — but
   Vercel's free Hobby plan caps cron jobs at **once per day**, which is
   useless for a per-minute price poller.
5. Landed here: a **new free Supabase organization** (the 2-project cap is
   per-org, not per-account) restores Supabase's real Postgres + native
   `pg_cron` (free, no paid plan needed to run on a schedule) + built-in
   Auth. Firebase is kept, but trimmed to *only* Cloud Messaging, which is
   free on the Spark plan and is the one piece that can't be made "local"
   anyway — actual push delivery to a phone or browser always routes
   through a platform push service (FCM/APNs), regardless of your database.

## Project layout

```
src/app/                  Next.js pages (login, dashboard)
src/components/           Watchlist search, flip table, alert rule form
src/hooks/                useAuth (Supabase), useWatchlistFlips (Postgres + Realtime)
src/lib/supabase/         Browser/server clients, item search (ILIKE)
src/lib/firebase/         Messaging-only client, push token registration
src/lib/osrs/             OSRS Wiki API client (TS, for future server-side use)
src/lib/signals/          Flip margin (GE-tax-aware) + momentum calculations
supabase/schema.sql       Tables, RLS policies, and pg_cron schedules
supabase/functions/       Edge Functions (Deno): poll-prices, refresh-mapping
electron/                 Desktop shell (electron-builder config)
public/manifest.json      PWA manifest (installable on Android/iOS/desktop)
public/firebase-messaging-sw.js  Background push service worker
```

Note: the GE-tax/margin math and the OSRS Wiki API client each exist in two
places — `src/lib/` (TypeScript, for the Next.js app) and
`supabase/functions/_shared/` (Deno, for Edge Functions) — because Edge
Functions deploy separately and can't share a bundler with Next.js. Mirror
any tax-rate or API changes into both.

## Setup

1. **Create a Supabase project** (a fresh org if your existing one is at
   its 2-project cap — Organization settings -> New organization).
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL/anon key
   from Project Settings -> API.
3. In the SQL editor, enable the `pg_cron` and `pg_net` extensions
   (Database -> Extensions), then run `supabase/schema.sql` — replace
   `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` in the `cron.schedule(...)`
   calls first.
4. Enable Realtime on the `price_ticks` table (Database -> Replication) so
   the dashboard updates live.
5. Email (magic link) sign-in is enabled by default — no OAuth app to
   register. You do need to whitelist your callback URL, though: in
   Authentication -> URL Configuration, set Site URL to your deployed
   app's URL, and add `<your-app-url>/auth/callback` (and
   `http://localhost:3000/auth/callback` for local dev) to Redirect URLs.
   Supabase rejects magic-link redirects to anything not on this list.
6. Deploy the Edge Functions: `supabase functions deploy poll-prices` and
   `supabase functions deploy refresh-mapping`.
7. Set Edge Function secrets: `supabase secrets set OSRS_API_USER_AGENT="…" FCM_PROJECT_ID="…" FCM_CLIENT_EMAIL="…" FCM_PRIVATE_KEY="…"`
   (the FCM values come from a Firebase service account JSON — Firebase
   Console -> Project Settings -> Service Accounts -> Generate new key).
8. Create a Firebase project for push only, enable Cloud Messaging, and
   fill in the `NEXT_PUBLIC_FIREBASE_*` values plus the VAPID key.
9. Also hand-fill the same public Firebase values into
   `public/firebase-messaging-sw.js` (service workers can't read Next.js
   env vars).
10. `npm install`, then `npm run dev` — or deploy to Vercel.

## Signal logic

- **Flip margin** (`src/lib/signals/flipFinder.ts` /
  `supabase/functions/_shared/geTax.ts`): net margin = instant-buy price −
  instant-sell price − GE tax (2%, capped at 5M gp/item, waived under 50gp,
  as of the 29 May 2025 update).
- **Momentum** (`src/lib/signals/momentum.ts`): short/long moving-average
  crossover over stored price ticks, plus a volatility % over the long
  window. Not yet wired into the alert evaluator (see below).

## Electron desktop app

```
cd electron
npm install
LEDGER_APP_URL=https://your-deployed-app.vercel.app npm start   # dev
npm run dist                                                     # build installers
```

## Not yet built (natural next steps)

- Per-item alert rules from the UI (currently only a global "any item ≥ X%
  margin" rule can be created from the dashboard)
- Momentum-based alerts wired into `poll-prices` (the `momentum` rule type
  is modeled in the schema but needs multi-tick history, not evaluated yet)
- iOS PWA install instructions/onboarding (Add to Home Screen flow differs
  from Android and isn't prompted automatically by Safari)
