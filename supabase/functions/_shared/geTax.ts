// Shared by the poll-prices Edge Function. Kept as a standalone Deno module
// (no relative import into src/lib) since Edge Functions deploy separately
// from the Next.js app and don't share a bundler — mirror any change here
// into src/lib/signals/flipFinder.ts by hand.

const TAX_RATE = 0.02;
const TAX_CAP = 5_000_000;
const TAX_EXEMPT_IDS = new Set<number>([13190]); // Old School Bond

export function geTax(sellPrice: number, itemId: number): number {
  if (TAX_EXEMPT_IDS.has(itemId)) return 0;
  if (sellPrice < 50) return 0;
  return Math.min(Math.floor(sellPrice * TAX_RATE), TAX_CAP);
}

export function netMargin(buyPrice: number, sellPrice: number, itemId: number): number {
  return sellPrice - buyPrice - geTax(sellPrice, itemId);
}

export function marginPct(buyPrice: number, sellPrice: number, itemId: number): number {
  if (buyPrice <= 0) return 0;
  return (netMargin(buyPrice, sellPrice, itemId) / buyPrice) * 100;
}
