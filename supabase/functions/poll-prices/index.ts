// supabase/functions/poll-prices/index.ts
// Invoked every minute by pg_cron (see supabase/schema.sql). Deno runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { netMargin, marginPct } from '../_shared/geTax.ts';
import { sendPush } from '../_shared/fcm.ts';

const WIKI_BASE = 'https://prices.runescape.wiki/api/v2/osrs';
const USER_AGENT = Deno.env.get('OSRS_API_USER_AGENT') ?? 'osrs-flip-tracker/1.0 (set OSRS_API_USER_AGENT)';
const ALERT_COOLDOWN_MS = 15 * 60 * 1000;

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. Which items does anyone actually watch? No point storing ticks for
  //    the other ~3,900 items no one's tracking.
  const { data: watchlistRows, error: watchlistErr } = await supabase
    .from('watchlist_items')
    .select('item_id');
  if (watchlistErr) throw watchlistErr;

  const watchedItemIds = Array.from(new Set((watchlistRows ?? []).map((r) => r.item_id)));
  if (watchedItemIds.length === 0) {
    return new Response(JSON.stringify({ message: 'No watched items yet.' }), { status: 200 });
  }

  // 2. Pull latest prices from the Wiki API (single call returns everything;
  //    we filter client-side rather than hitting ?id= per item).
  const latestRes = await fetch(`${WIKI_BASE}/latest`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!latestRes.ok) throw new Error(`Wiki API error ${latestRes.status}`);
  const latest = (await latestRes.json()).data as Record<
    string,
    { high: number | null; highTime: number | null; low: number | null; lowTime: number | null }
  >;

  // 3. Insert one tick per watched item.
  const ticks = watchedItemIds
    .map((itemId) => {
      const p = latest[String(itemId)];
      if (!p) return null;
      return {
        item_id: itemId,
        high: p.high,
        high_time: p.highTime ? new Date(p.highTime * 1000).toISOString() : null,
        low: p.low,
        low_time: p.lowTime ? new Date(p.lowTime * 1000).toISOString() : null,
      };
    })
    .filter(Boolean);
  if (ticks.length > 0) {
    const { error: insertErr } = await supabase.from('price_ticks').insert(ticks as any[]);
    if (insertErr) throw insertErr;
  }

  // 4. Evaluate every enabled alert rule against the fresh prices.
  const { data: rules, error: rulesErr } = await supabase
    .from('alert_rules')
    .select('id, user_id, item_id, rule_type, threshold')
    .eq('enabled', true);
  if (rulesErr) throw rulesErr;

  const { data: itemMeta } = await supabase.from('items').select('id, name');
  const nameById = new Map((itemMeta ?? []).map((i) => [i.id, i.name as string]));

  let firedCount = 0;

  for (const rule of rules ?? []) {
    const candidateItemIds = rule.item_id ? [rule.item_id] : watchedItemIds;

    for (const itemId of candidateItemIds) {
      const p = latest[String(itemId)];
      if (!p || p.high == null || p.low == null) continue;

      let fire = false;
      let message = '';
      const name = nameById.get(itemId) ?? `Item #${itemId}`;

      if (rule.rule_type === 'margin_pct') {
        const pct = marginPct(p.low, p.high, itemId);
        if (pct >= Number(rule.threshold)) {
          fire = true;
          message = `${name}: ${pct.toFixed(1)}% margin (${netMargin(p.low, p.high, itemId).toLocaleString()} gp/ea after tax)`;
        }
      } else if (rule.rule_type === 'price_below' && p.low <= Number(rule.threshold)) {
        fire = true;
        message = `${name} buy price dropped to ${p.low.toLocaleString()} gp`;
      } else if (rule.rule_type === 'price_above' && p.high >= Number(rule.threshold)) {
        fire = true;
        message = `${name} sell price rose to ${p.high.toLocaleString()} gp`;
      }
      // 'momentum' rules need stored history beyond one tick — evaluated
      // separately (not yet implemented here; see README "not yet built").

      if (!fire) continue;

      const { data: recentFire } = await supabase
        .from('alert_events')
        .select('id')
        .eq('alert_rule_id', rule.id)
        .eq('item_id', itemId)
        .gt('fired_at', new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString())
        .limit(1);
      if (recentFire && recentFire.length > 0) continue;

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('fcm_token')
        .eq('user_id', rule.user_id);

      for (const t of tokens ?? []) {
        await sendPush(t.fcm_token, 'OSRS Flip Alert', message);
      }

      await supabase.from('alert_events').insert({
        alert_rule_id: rule.id,
        item_id: itemId,
        detail: { message },
      });
      firedCount++;
    }
  }

  return new Response(
    JSON.stringify({ ticksStored: ticks.length, alertsFired: firedCount }),
    { status: 200 }
  );
});
