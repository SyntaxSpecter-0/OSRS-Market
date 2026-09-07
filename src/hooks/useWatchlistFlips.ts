'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { geTax } from '@/lib/signals/flipFinder';

export interface WatchedFlip {
  itemId: number;
  name: string;
  buyLimit: number;
  buyPrice: number | null;
  sellPrice: number | null;
  netMargin: number | null;
  marginPct: number | null;
  lastUpdated: Date | null;
}

/**
 * Loads the user's watchlist, joins in each item's most recent price tick,
 * and subscribes to Supabase Realtime on two tables:
 *   - price_ticks: so numbers update live as the poller writes new ticks
 *   - watchlist_items (filtered to this user): so adding/removing an item
 *     from another tab, device, or component shows up immediately, with
 *     no page refresh needed
 * Realtime must be enabled on BOTH tables in the Supabase dashboard
 * (Database -> Replication) for this to work.
 */
export function useWatchlistFlips(uid: string | undefined) {
  const supabase = createClient();
  const [flips, setFlips] = useState<Record<number, WatchedFlip>>({});

  const loadLatestTick = useCallback(
    async (itemId: number) => {
      const { data } = await supabase
        .from('price_ticks')
        .select('high, low, fetched_at')
        .eq('item_id', itemId)
        .order('fetched_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    [supabase]
  );

  const loadItemMeta = useCallback(
    async (itemId: number) => {
      const { data } = await supabase
        .from('items')
        .select('name, buy_limit')
        .eq('id', itemId)
        .maybeSingle();
      return data;
    },
    [supabase]
  );

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    async function load() {
      const { data: watchlist } = await supabase
        .from('watchlist_items')
        .select('item_id, items ( name, buy_limit )')
        .eq('user_id', uid);

      if (cancelled || !watchlist) return;

      const initial: Record<number, WatchedFlip> = {};
      for (const row of watchlist as any[]) {
        const itemId = row.item_id;
        const tick = await loadLatestTick(itemId);
        initial[itemId] = buildFlip(itemId, row.items?.name ?? '…', row.items?.buy_limit ?? 0, tick);
      }
      if (!cancelled) setFlips(initial);
    }
    load();

    const priceChannel = supabase
      .channel('price-ticks-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'price_ticks' },
        (payload) => {
          const itemId = payload.new.item_id as number;
          const tick = {
            high: payload.new.high,
            low: payload.new.low,
            fetched_at: payload.new.fetched_at,
          };
          setFlips((prev) => {
            if (!(itemId in prev)) return prev; // not on this user's watchlist
            return { ...prev, [itemId]: buildFlip(itemId, prev[itemId].name, prev[itemId].buyLimit, tick) };
          });
        }
      )
      .subscribe();

    // Reacts to this user's own watchlist changing, from this tab, another
    // tab, or another device, so a newly-added item appears without a
    // manual page refresh.
    const watchlistChannel = supabase
      .channel(`watchlist-live-${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'watchlist_items', filter: `user_id=eq.${uid}` },
        async (payload) => {
          const itemId = payload.new.item_id as number;
          const [meta, tick] = await Promise.all([loadItemMeta(itemId), loadLatestTick(itemId)]);
          setFlips((prev) => ({
            ...prev,
            [itemId]: buildFlip(itemId, meta?.name ?? '…', meta?.buy_limit ?? 0, tick),
          }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'watchlist_items', filter: `user_id=eq.${uid}` },
        (payload) => {
          const itemId = payload.old.item_id as number;
          setFlips((prev) => {
            const next = { ...prev };
            delete next[itemId];
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(priceChannel);
      supabase.removeChannel(watchlistChannel);
    };
  }, [uid, supabase, loadLatestTick, loadItemMeta]);

  async function removeFromWatchlist(itemId: number) {
    if (!uid) return;
    await supabase.from('watchlist_items').delete().eq('user_id', uid).eq('item_id', itemId);
    // No local state update needed here, the DELETE Realtime event above
    // will remove it from state once Supabase confirms the delete.
  }

  return { flips: Object.values(flips), removeFromWatchlist };
}

function buildFlip(
  itemId: number,
  name: string,
  buyLimit: number,
  tick: { high: number | null; low: number | null; fetched_at: string } | null | undefined
): WatchedFlip {
  if (!tick || tick.high == null || tick.low == null) {
    return {
      itemId,
      name,
      buyLimit,
      buyPrice: null,
      sellPrice: null,
      netMargin: null,
      marginPct: null,
      lastUpdated: null,
    };
  }
  const tax = geTax(tick.high, itemId);
  const margin = tick.high - tick.low - tax;
  return {
    itemId,
    name,
    buyLimit,
    buyPrice: tick.low,
    sellPrice: tick.high,
    netMargin: margin,
    marginPct: tick.low > 0 ? (margin / tick.low) * 100 : null,
    lastUpdated: new Date(tick.fetched_at),
  };
}
