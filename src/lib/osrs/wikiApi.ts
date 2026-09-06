/**
 * Client for the OSRS Wiki Real-time Prices API.
 * Docs: https://oldschool.runescape.wiki/w/RuneScape:Real-time_Prices
 *
 * The wiki asks every consumer to send a descriptive User-Agent identifying
 * the project and a contact method — set OSRS_API_USER_AGENT in your env
 * (e.g. "osrs-flip-tracker/1.0 (contact: you@example.com)"). There's no
 * published hard rate limit, but be a good citizen: this app polls on a
 * schedule (every 30-60s), not per-request-from-the-browser.
 */

const BASE_URL = 'https://prices.runescape.wiki/api/v2/osrs';

function userAgent() {
  return process.env.OSRS_API_USER_AGENT || 'osrs-flip-tracker/0.1 (set OSRS_API_USER_AGENT)';
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'User-Agent': userAgent() },
    // Never cache price data at the fetch layer — we want the freshest tick.
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`OSRS Wiki API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export interface ItemMapping {
  id: number;
  name: string;
  examine: string;
  members: boolean;
  lowalch: number;
  highalch: number;
  limit: number; // GE buy limit per 4 hours
  value: number;
  icon: string;
}

export interface LatestPricePoint {
  high: number | null; // instant-buy price
  highTime: number | null; // unix seconds
  low: number | null; // instant-sell price
  lowTime: number | null;
}

export interface AvgPricePoint {
  avgHighPrice: number | null;
  highPriceVolume: number;
  avgLowPrice: number | null;
  lowPriceVolume: number;
}

/** Item metadata: names, GE buy limits, alch values. Cache this — it barely changes. */
export function getMapping() {
  return fetchJson<ItemMapping[]>('/mapping');
}

/** Most recent instant buy/sell prices for every item (or one, if itemId given). */
export function getLatest(itemId?: number) {
  const qs = itemId ? `?id=${itemId}` : '';
  return fetchJson<{ data: Record<string, LatestPricePoint> }>(`/latest${qs}`);
}

/** Volume-weighted average prices over a 5-minute or 1-hour window. */
export function getAverages(timestep: '5m' | '1h', timestamp?: number) {
  const qs = timestamp ? `?timestamp=${timestamp}` : '';
  return fetchJson<{ data: Record<string, AvgPricePoint>; timestamp: number }>(
    `/${timestep}${qs}`
  );
}

/** Historical series for a single item, for charting and momentum calculations. */
export function getTimeseries(itemId: number, timestep: '5m' | '1h' | '6h' | '24h') {
  return fetchJson<{
    data: { timestamp: number; avgHighPrice: number | null; avgLowPrice: number | null; highPriceVolume: number; lowPriceVolume: number }[];
  }>(`/timeseries?id=${itemId}&timestep=${timestep}`);
}
