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
 * and subscribes to Supabase Realtime on `price_ticks` so the table
 * updates live as the poller writes new ticks every minute. Realtime must
 * be enabled on `price_ticks` in the Supabase dashboard (Database ->
 * Replication) for the live-update part to work.
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

    const channel = supabase
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

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [uid, supabase, loadLatestTick]);

  async function removeFromWatchlist(itemId: number) {
    if (!uid) return;
    await supabase.from('watchlist_items').delete().eq('user_id', uid).eq('item_id', itemId);
    setFlips((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
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
