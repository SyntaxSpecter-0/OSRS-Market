export interface PricePoint {
  timestamp: number; // unix seconds
  price: number; // typically the midpoint of high/low, or avgHighPrice
}

function sma(points: PricePoint[], window: number, endIndex: number): number | null {
  if (endIndex - window + 1 < 0) return null;
  let sum = 0;
  for (let i = endIndex - window + 1; i <= endIndex; i++) sum += points[i].price;
  return sum / window;
}

export type MomentumSignal = 'bullish_crossover' | 'bearish_crossover' | 'flat';

export interface MomentumResult {
  signal: MomentumSignal;
  shortMa: number | null;
  longMa: number | null;
  prevShortMa: number | null;
  prevLongMa: number | null;
  volatilityPct: number; // stddev / mean over the window, as a %
}

/**
 * Classic moving-average crossover, applied to stored price history for one
 * item. `points` must be sorted oldest -> newest. shortWindow/longWindow are
 * counts of data points, not time — e.g. with 5m candles, short=6 (30 min),
 * long=24 (2 hours) are reasonable starting defaults for a flip-timescale
 * signal (unlike stock-market MAs which use daily candles over weeks).
 */
export function detectMomentum(
  points: PricePoint[],
  shortWindow = 6,
  longWindow = 24
): MomentumResult | null {
  if (points.length < longWindow + 1) return null;

  const lastIdx = points.length - 1;
  const shortMa = sma(points, shortWindow, lastIdx);
  const longMa = sma(points, longWindow, lastIdx);
  const prevShortMa = sma(points, shortWindow, lastIdx - 1);
  const prevLongMa = sma(points, longWindow, lastIdx - 1);

  if (shortMa == null || longMa == null || prevShortMa == null || prevLongMa == null) {
    return null;
  }

  let signal: MomentumSignal = 'flat';
  if (prevShortMa <= prevLongMa && shortMa > longMa) signal = 'bullish_crossover';
  else if (prevShortMa >= prevLongMa && shortMa < longMa) signal = 'bearish_crossover';

  const windowPoints = points.slice(lastIdx - longWindow + 1, lastIdx + 1);
  const mean = windowPoints.reduce((s, p) => s + p.price, 0) / windowPoints.length;
  const variance =
    windowPoints.reduce((s, p) => s + (p.price - mean) ** 2, 0) / windowPoints.length;
  const volatilityPct = mean > 0 ? (Math.sqrt(variance) / mean) * 100 : 0;

  return { signal, shortMa, longMa, prevShortMa, prevLongMa, volatilityPct };
}
