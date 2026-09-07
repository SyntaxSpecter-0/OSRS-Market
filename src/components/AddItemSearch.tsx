'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { searchItemsByName, type ItemSearchResult } from '@/lib/supabase/itemSearch';

export function AddItemSearch({ uid }: { uid: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  async function handleChange(value: string) {
    setQuery(value);
    setJustAdded(null);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const found = await searchItemsByName(value);
    setResults(found);
    setSearching(false);
  }

  async function addToWatchlist(item: ItemSearchResult) {
    const supabase = createClient();
    await supabase.from('watchlist_items').upsert(
      { user_id: uid, item_id: item.id },
      { onConflict: 'user_id,item_id' }
    );
    // Replace the dropdown with a brief confirmation instead of instantly
    // wiping the box, then clear for the next search shortly after.
    setResults([]);
    setJustAdded(item.name);
    setTimeout(() => {
      setQuery('');
      setJustAdded(null);
    }, 1100);
  }

  return (
    <div className="w-full">
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Add an item to your watchlist…"
        className="osrs-panel w-full px-3 py-2 text-ledger-parchment placeholder:text-ledger-muted focus:outline-none focus:ring-1 focus:ring-ledger-bronze"
      />
      {justAdded && (
        <div className="osrs-panel mt-1 px-3 py-2 text-sm text-buy">
          Added {justAdded} to your watchlist ✓
        </div>
      )}
      {!justAdded && (results.length > 0 || searching) && (
        <ul className="osrs-panel mt-1">
          {searching && <li className="px-3 py-2 text-sm text-ledger-muted">Searching…</li>}
          {results.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => addToWatchlist(item)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ledger-parchment hover:bg-ledger-line"
              >
                <span>{item.name}</span>
                <span className="text-ledger-muted">limit {item.buyLimit}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
