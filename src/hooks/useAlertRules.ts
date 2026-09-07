'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface AlertRule {
  id: number;
  itemId: number | null;
  itemName: string | null; // null when the rule applies to the whole watchlist
  ruleType: 'margin_pct' | 'price_below' | 'price_above' | 'momentum';
  threshold: number;
  enabled: boolean;
}

/**
 * Loads the user's alert rules and subscribes to Realtime INSERT/DELETE on
 * alert_rules (filtered to this user), so saving or removing a rule shows
 * up immediately without a page refresh, the same pattern used for the
 * watchlist in useWatchlistFlips.
 */
export function useAlertRules(uid: string | undefined) {
  const supabase = createClient();
  const [rules, setRules] = useState<AlertRule[]>([]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('alert_rules')
        .select('id, item_id, rule_type, threshold, enabled, items ( name )')
        .eq('user_id', uid)
        .order('id', { ascending: false });
      if (cancelled || !data) return;
      setRules((data as any[]).map(toAlertRule));
    }
    load();

    const channel = supabase
      .channel(`alert-rules-live-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alert_rules', filter: `user_id=eq.${uid}` },
        async (payload) => {
          // Re-fetch just this row with its item name joined in, simplest
          // way to get the join without hand-rolling a second query shape.
          const { data } = await supabase
            .from('alert_rules')
            .select('id, item_id, rule_type, threshold, enabled, items ( name )')
            .eq('id', payload.new.id)
            .maybeSingle();
          if (data) setRules((prev) => [toAlertRule(data), ...prev]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'alert_rules', filter: `user_id=eq.${uid}` },
        (payload) => {
          const id = payload.old.id as number;
          setRules((prev) => prev.filter((r) => r.id !== id));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, supabase]);

  async function removeRule(id: number) {
    await supabase.from('alert_rules').delete().eq('id', id);
    // No local state update here, the DELETE Realtime event above handles it.
  }

  return { rules, removeRule };
}

function toAlertRule(row: any): AlertRule {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.items?.name ?? null,
    ruleType: row.rule_type,
    threshold: Number(row.threshold),
    enabled: row.enabled,
  };
}
