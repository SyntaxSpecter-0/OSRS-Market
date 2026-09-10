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
 * Loads the user's alert rules and exposes addRule/removeRule that update
 * local state immediately on success. Also subscribes to Realtime for
 * cross-tab/device sync, but (as with useWatchlistFlips) actions taken in
 * THIS tab no longer depend on that subscription actually delivering.
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
          setRules((prev) => {
            if (prev.some((r) => r.id === payload.new.id)) return prev; // already added locally
            return prev;
          });
          const { data } = await supabase
            .from('alert_rules')
            .select('id, item_id, rule_type, threshold, enabled, items ( name )')
            .eq('id', payload.new.id)
            .maybeSingle();
          if (!data) return;
          setRules((prev) => (prev.some((r) => r.id === data.id) ? prev : [toAlertRule(data), ...prev]));
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

  async function addRule(threshold: number) {
    if (!uid) return;
    const { data, error } = await supabase
      .from('alert_rules')
      .insert({ user_id: uid, item_id: null, rule_type: 'margin_pct', threshold, enabled: true })
      .select('id, item_id, rule_type, threshold, enabled, items ( name )')
      .single();
    if (error) throw error;

    setRules((prev) => [toAlertRule(data), ...prev]);
  }

  async function removeRule(id: number) {
    const { error } = await supabase.from('alert_rules').delete().eq('id', id);
    if (error) throw error;

    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  return { rules, addRule, removeRule };
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
