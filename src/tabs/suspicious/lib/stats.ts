/**
 * Robust statistics for peer comparisons.
 *
 * Emissions values span many orders of magnitude and the peer sets contain the
 * very outliers we are hunting for, so mean/stddev would be dragged along by
 * whatever is wrong. Median and MAD stay put instead.
 */

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Median absolute deviation from `center`. Zero when over half the values tie. */
export function medianAbsoluteDeviation(
  values: number[],
  center: number,
): number {
  return median(values.map((value) => Math.abs(value - center))) ?? 0;
}

/** Scales MAD so that it estimates the standard deviation of a normal sample. */
const MAD_TO_SIGMA = 0.6745;

/**
 * Modified z-score. Null when MAD is zero, which happens for degenerate peer
 * sets (e.g. most companies reporting the same rounded value) where any
 * deviation would otherwise score as infinitely suspicious.
 */
export function robustZScore(
  value: number,
  center: number,
  mad: number,
): number | null {
  if (!Number.isFinite(mad) || mad <= 0) return null;
  return (MAD_TO_SIGMA * (value - center)) / mad;
}

/** log10 of a strictly positive value, else null. */
export function safeLog10(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.log10(value);
}

/**
 * How far apart two positive values are, expressed as a factor >= 1 regardless
 * of direction (`ratioFactor(1, 1000) === 1000`).
 */
export function ratioFactor(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a <= 0 || b <= 0) return null;
  return a > b ? a / b : b / a;
}

/**
 * The power of ten a factor sits on when it is close enough to one to look like
 * a unit mix-up (kg vs tonnes, tonnes vs kilotonnes), else null.
 *
 * `tolerance` is relative: 0.05 accepts 950-1050 as "×1000".
 */
export function powerOfTenFactor(
  factor: number,
  tolerance: number,
): number | null {
  if (!Number.isFinite(factor) || factor <= 0) return null;
  const exponent = Math.round(Math.log10(factor));
  if (exponent === 0) return null;
  const nearest = 10 ** exponent;
  if (Math.abs(factor - nearest) / nearest > tolerance) return null;
  return nearest;
}

/** Relative gap between two values, scaled by the larger magnitude. */
export function relativeDifference(a: number, b: number): number | null {
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale === 0) return 0;
  if (!Number.isFinite(scale)) return null;
  return Math.abs(a - b) / scale;
}
