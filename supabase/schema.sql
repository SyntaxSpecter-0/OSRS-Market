-- OSRS Flip Tracker — Supabase schema
-- Run this in the Supabase SQL editor (or `supabase db push`) once per project.

-- ===== Item metadata (from the Wiki /mapping endpoint; refreshed daily) =====
create table if not exists items (
  id integer primary key,               -- OSRS item id
  name text not null,
  members boolean not null default false,
  buy_limit integer,                    -- GE buy limit per 4 hours
  lowalch integer,
  highalch integer,
  icon text,
  updated_at timestamptz not null default now()
);
create index if not exists items_name_idx on items (name);

-- ===== Raw price ticks (append-only, from the poller Edge Function) =====
create table if not exists price_ticks (
  id bigint generated always as identity primary key,
  item_id integer not null references items(id),
  high integer,        -- instant-buy price
  high_time timestamptz,
  low integer,         -- instant-sell price
  low_time timestamptz,
  fetched_at timestamptz not null default now()
);
create index if not exists price_ticks_item_time_idx on price_ticks (item_id, fetched_at desc);

-- ===== User watchlists =====
create table if not exists watchlist_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id integer not null references items(id),
  created_at timestamptz not null default now(),
  unique (user_id, item_id)
);

-- ===== Alert rules a user configures per item (or globally) =====
create table if not exists alert_rules (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id integer references items(id), -- null = applies to any item on their watchlist
  rule_type text not null check (rule_type in ('margin_pct', 'price_below', 'price_above', 'momentum')),
  threshold numeric,                    -- meaning depends on rule_type
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== Notification delivery tokens (FCM — push delivery only) =====
create table if not exists push_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  fcm_token text not null unique,
  platform text not null check (platform in ('web', 'electron', 'pwa_ios', 'pwa_android')),
  created_at timestamptz not null default now()
);

-- ===== Log of alerts actually fired, so we don't spam the same signal =====
create table if not exists alert_events (
  id bigint generated always as identity primary key,
  alert_rule_id bigint not null references alert_rules(id) on delete cascade,
  item_id integer not null references items(id),
  fired_at timestamptz not null default now(),
  detail jsonb
);

-- ===== Row Level Security =====
alter table watchlist_items enable row level security;
alter table alert_rules enable row level security;
alter table push_tokens enable row level security;
alter table items enable row level security;
alter table price_ticks enable row level security;

create policy "users manage their own watchlist" on watchlist_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own alert rules" on alert_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage their own push tokens" on push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- items and price_ticks: readable by any signed-in user, written only by
-- the poller Edge Function using the service-role key (which bypasses RLS).
create policy "signed-in users can read items" on items
  for select using (auth.role() = 'authenticated');

create policy "signed-in users can read price ticks" on price_ticks
  for select using (auth.role() = 'authenticated');

-- ===== Scheduling: pg_cron calls the poll-prices Edge Function =====
-- Requires the pg_cron and pg_net extensions, enabled once per project via
-- Database -> Extensions in the Supabase dashboard (both are free, no
-- Blaze-style paid plan needed — this is the thing Firebase couldn't do
-- for free).
--
-- Replace <PROJECT_REF> and <SERVICE_ROLE_KEY> below, or better, store the
-- key in Vault and reference it — see Supabase's pg_cron + pg_net docs.
select cron.schedule(
  'poll-osrs-prices-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/poll-prices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <secret key>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- A second, once-daily job refreshes item metadata.
select cron.schedule(
  'refresh-osrs-item-mapping-daily',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/refresh-mapping',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <secret key>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- A third job prunes price ticks older than 48h, once a day.
select cron.schedule(
  'prune-old-price-ticks-daily',
  '15 3 * * *',
  $$
  delete from price_ticks where fetched_at < now() - interval '48 hours';
  $$
);
