import type { ItemMapping, LatestPricePoint } from '@/lib/osrs/wikiApi';

/**
 * Grand Exchange tax, as of 29 May 2025: 2% of the sale price, rounded down
 * per unit, capped at 5,000,000 gp per item, waived under 50gp. A handful of
 * items (bonds, some tools) are fully exempt — pass their IDs in TAX_EXEMPT_IDS
 * if you want to special-case them; unknown for now so left empty.
 */
const TAX_RATE = 0.02;
const TAX_CAP = 5_000_000;
const TAX_EXEMPT_IDS = new Set<number>([13190]); // Old School Bond

export function geTax(sellPrice: number, itemId: number): number {
  if (TAX_EXEMPT_IDS.has(itemId)) return 0;
  if (sellPrice < 50) return 0;
  return Math.min(Math.floor(sellPrice * TAX_RATE), TAX_CAP);
}

export interface FlipOpportunity {
  itemId: number;
  name: string;
  buyPrice: number; // instant-sell price (what you'd pay to insta-buy)
  sellPrice: number; // instant-buy price (what you'd get to insta-sell)
  tax: number;
  netMargin: number;
  marginPct: number; // net margin as % of buy price
  buyLimit: number; // per 4 hours
  potentialProfit4h: number; // netMargin * buyLimit
}

/**
 * Scans latest prices against item metadata and returns flips ranked by
 * net margin %, filtered to a minimum absolute margin so illiquid junk
 * items with a huge % swing on tiny prices don't dominate the list.
 */
export function findFlips(
  latest: Record<string, LatestPricePoint>,
  mapping: ItemMapping[],
  opts: { minMarginGp?: number; minMarginPct?: number } = {}
): FlipOpportunity[] {
  const { minMarginGp = 50, minMarginPct = 0.5 } = opts;
  const mapById = new Map(mapping.map((m) => [m.id, m]));
  const results: FlipOpportunity[] = [];

  for (const [idStr, price] of Object.entries(latest)) {
    const itemId = Number(idStr);
    const item = mapById.get(itemId);
    if (!item || price.high == null || price.low == null) continue;

    // Buying happens at the current "low" (instant-sell) price, selling
    // happens at the current "high" (instant-buy) price.
    const buyPrice = price.low;
    const sellPrice = price.high;
    const tax = geTax(sellPrice, itemId);
    const netMargin = sellPrice - buyPrice - tax;
    if (netMargin < minMarginGp) continue;

    const marginPct = (netMargin / buyPrice) * 100;
    if (marginPct < minMarginPct) continue;

    results.push({
      itemId,
      name: item.name,
      buyPrice,
      sellPrice,
      tax,
      netMargin,
      marginPct,
      buyLimit: item.limit,
      potentialProfit4h: netMargin * item.limit,
    });
  }

  return results.sort((a, b) => b.marginPct - a.marginPct);
}
