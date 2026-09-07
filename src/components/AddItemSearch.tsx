'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { searchItemsByName, type ItemSearchResult } from '@/lib/supabase/itemSearch';

export function AddItemSearch({ uid }: { uid: string }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function handleChange(value: string) {
    setQuery(value);
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
    setQuery('');
    setResults([]);
  }

  return (
    <div className="relative w-full max-w-sm">
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Add an item to your watchlist…"
        className="osrs-panel w-full px-3 py-2 text-ledger-parchment placeholder:text-ledger-muted focus:outline-none focus:ring-1 focus:ring-ledger-bronze"
      />
      {(results.length > 0 || searching) && (
        <ul className="osrs-panel absolute z-10 mt-1 w-full">
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
