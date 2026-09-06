// supabase/functions/refresh-mapping/index.ts
// Invoked once a day by pg_cron. Refreshes item names/limits/alch values —
// this data barely changes, so a daily sync is plenty.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const WIKI_BASE = 'https://prices.runescape.wiki/api/v2/osrs';
const USER_AGENT = Deno.env.get('OSRS_API_USER_AGENT') ?? 'osrs-flip-tracker/1.0 (set OSRS_API_USER_AGENT)';

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const res = await fetch(`${WIKI_BASE}/mapping`, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Wiki API error ${res.status}`);
  const mapping = (await res.json()) as {
    id: number;
    name: string;
    members: boolean;
    limit: number;
    lowalch: number;
    highalch: number;
    icon: string;
  }[];

  const rows = mapping.map((m) => ({
    id: m.id,
    name: m.name,
    members: m.members,
    buy_limit: m.limit ?? null,
    lowalch: m.lowalch ?? null,
    highalch: m.highalch ?? null,
    icon: m.icon,
    updated_at: new Date().toISOString(),
  }));

  // Upsert in batches to stay under request size limits.
  const BATCH_SIZE = 500;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('items').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
  }

  return new Response(JSON.stringify({ itemsRefreshed: rows.length }), { status: 200 });
});
