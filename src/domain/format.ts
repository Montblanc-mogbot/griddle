import type { FieldDef } from './types';

export type NumberFormatMode = 'fixed' | 'auto';

/** Maximum number of decimal places that `format: 'flexible'` will ever display. */
export const FLEXIBLE_DECIMALS_CAP = 10;

/**
 * Resolve the number of decimal places to display for a field.
 * - If `field.measure.decimalPlaces` is provided, it wins.
 * - Otherwise, we fall back based on `field.measure.format`.
 * - Otherwise, use the provided fallback (default: 2).
 */
export function decimalPlacesForField(field: FieldDef | undefined, fallback = 2): number {
  const dp = field?.measure?.decimalPlaces;
  if (typeof dp === 'number' && Number.isFinite(dp)) return Math.max(0, Math.min(20, Math.trunc(dp)));

  const fmt = field?.measure?.format;
  if (fmt === 'integer') return 0;
  if (fmt === 'currency') return 2;
  if (fmt === 'decimal') return fallback;
  // `flexible` is handled in `decimalPlacesForMeasureInContext`.

  return fallback;
}

export function decimalPlacesForValues(
  values: Array<number | null | undefined>,
  cap: number = FLEXIBLE_DECIMALS_CAP,
): number {
  const maxFractionDigits = Math.max(0, Math.min(20, Math.trunc(cap)));

  // Use formatToParts so we don't depend on the locale's decimal separator.
  const nf = new Intl.NumberFormat(undefined, {
    useGrouping: false,
    notation: 'standard',
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });

  let best = 0;
  for (const v of values) {
    if (typeof v !== 'number') continue;
    if (!Number.isFinite(v)) continue;

    const parts = nf.formatToParts(v);
    const fraction = parts.find((p) => p.type === 'fraction')?.value ?? '';
    best = Math.max(best, fraction.length);
    if (best >= maxFractionDigits) return maxFractionDigits;
  }

  return best;
}

/**
 * Resolve decimal places for a measure field in a particular display context.
 *
 * Precedence:
 * 1) `field.measure.decimalPlaces` if set (explicit override)
 * 2) if `field.measure.format === 'flexible'`, compute the max decimals found in `contextValues`
 * 3) otherwise, fall back to `decimalPlacesForField`
 */
export function decimalPlacesForMeasureInContext(
  field: FieldDef | undefined,
  contextValues: Array<number | null | undefined> | undefined,
  fallback = 2,
  cap: number = FLEXIBLE_DECIMALS_CAP,
): number {
  const dp = field?.measure?.decimalPlaces;
  if (typeof dp === 'number' && Number.isFinite(dp)) return Math.max(0, Math.min(20, Math.trunc(dp)));

  if (field?.measure?.format === 'flexible') {
    const vals = contextValues ?? [];
    // If the caller doesn't provide context values, fall back to the default behavior
    // rather than arbitrarily showing 0dp.
    if (vals.length === 0) return fallback;
    return decimalPlacesForValues(vals, cap);
  }

  return decimalPlacesForField(field, fallback);
}

/**
 * Format a numeric value for display.
 *
 * `mode: 'fixed'` (default) matches prior behavior: pad/round to exactly `decimals`.
 * `mode: 'auto'` avoids rounding to a fixed number of places (no padding) while still
 * preventing scientific notation in most typical UI ranges.
 */
export function formatNumber(
  value: number,
  opts?: {
    decimals?: number;
    mode?: NumberFormatMode;
  },
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';

  const mode: NumberFormatMode = opts?.mode ?? 'fixed';

  if (mode === 'auto') {
    const maxFractionDigits = Math.max(0, Math.min(20, Math.trunc(opts?.decimals ?? 20)));
    return new Intl.NumberFormat(undefined, {
      useGrouping: false,
      notation: 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFractionDigits,
    }).format(n);
  }

  const decimals = Math.max(0, Math.min(20, Math.trunc(opts?.decimals ?? 2)));
  return n.toFixed(decimals);
}

export function formatMeasureNumber(
  value: number,
  field?: FieldDef,
  contextValues?: Array<number | null | undefined>,
): string {
  return formatNumber(value, {
    decimals: decimalPlacesForMeasureInContext(field, contextValues),
    mode: 'fixed',
  });
}

/**
 * For contexts where we explicitly want to avoid truncating/rounding for display
 * (e.g. the "Working total" in Full Records).
 */
export function formatNumberFullPrecision(value: number): string {
  return formatNumber(value, { mode: 'auto' });
}
