import type { FieldDef } from './types';

export type NumberFormatMode = 'fixed' | 'auto';

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

  return fallback;
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

export function formatMeasureNumber(value: number, field?: FieldDef): string {
  return formatNumber(value, { decimals: decimalPlacesForField(field), mode: 'fixed' });
}

/**
 * For contexts where we explicitly want to avoid truncating/rounding for display
 * (e.g. the "Working total" in Full Records).
 */
export function formatNumberFullPrecision(value: number): string {
  return formatNumber(value, { mode: 'auto' });
}
