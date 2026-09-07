'use client';

import type { WatchedFlip } from '@/hooks/useWatchlistFlips';

function gp(n: number | null) {
  if (n == null) return '—';
  return n.toLocaleString() + ' gp';
}

export function FlipTable({
  flips,
  onRemove,
}: {
  flips: WatchedFlip[];
  onRemove: (itemId: number) => void;
}) {
  const sorted = [...flips].sort((a, b) => (b.marginPct ?? -Infinity) - (a.marginPct ?? -Infinity));

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b-2 border-ledger-line text-left">
          <th className="py-2 pr-4 font-display text-base font-normal text-ledger-bronze">Item</th>
          <th className="py-2 pr-4 font-display text-base font-normal text-ledger-bronze">Buy</th>
          <th className="py-2 pr-4 font-display text-base font-normal text-ledger-bronze">Sell</th>
          <th className="py-2 pr-4 font-display text-base font-normal text-ledger-bronze">Net margin</th>
          <th className="py-2 pr-4 font-display text-base font-normal text-ledger-bronze">Margin %</th>
          <th className="py-2 pr-4 font-display text-base font-normal text-ledger-bronze">4h limit profit</th>
          <th className="py-2 font-normal"></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((f) => (
          <tr key={f.itemId} className="border-b border-ledger-line/50">
            <td className="py-2 pr-4 text-ledger-parchment">{f.name}</td>
            <td className="py-2 pr-4 text-buy">{gp(f.buyPrice)}</td>
            <td className="py-2 pr-4 text-sell">{gp(f.sellPrice)}</td>
            <td className="py-2 pr-4 text-gp">{gp(f.netMargin)}</td>
            <td className="py-2 pr-4 text-ledger-parchment">
              {f.marginPct != null ? `${f.marginPct.toFixed(2)}%` : '—'}
            </td>
            <td className="py-2 pr-4 text-gp">
              {f.netMargin != null ? gp(f.netMargin * f.buyLimit) : '—'}
            </td>
            <td className="py-2">
              <button
                onClick={() => onRemove(f.itemId)}
                className="text-ledger-muted hover:text-sell"
                aria-label={`Remove ${f.name} from watchlist`}
              >
                ✕
              </button>
            </td>
          </tr>
        ))}
        {sorted.length === 0 && (
          <tr>
            <td colSpan={7} className="py-8 text-center text-ledger-muted">
              Nothing on your watchlist yet. Search for an item above to start tracking it.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
