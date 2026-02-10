import type { DatasetSchema, PivotCell } from './types';

export type Coverage = 'none' | 'some' | 'all';

export interface CoverageByFlag {
  [flagKey: string]: Coverage;
}

export function computeCoverage(schema: DatasetSchema, cell: PivotCell): CoverageByFlag {
  const n = cell.recordIds.length;
  const flagKeys = schema.fields.filter((f) => f.roles.includes('flag')).map((f) => f.key);

  const out: CoverageByFlag = {};
  for (const fk of flagKeys) {
    const t = cell.flagSummary?.[fk] ?? 0;
    if (n === 0 || t === 0) out[fk] = 'none';
    else if (t === n) out[fk] = 'all';
    else out[fk] = 'some';
  }
  return out;
}

// Default palettes for quick setup
const DEFAULT_PALETTES = {
  bg: [
    { some: '#eef2ff', all: '#e0e7ff' }, // indigo
    { some: '#ecfeff', all: '#cffafe' }, // cyan
    { some: '#f0fdf4', all: '#dcfce7' }, // green
    { some: '#fff7ed', all: '#ffedd5' }, // orange
    { some: '#fdf2f8', all: '#fce7f3' }, // pink
  ],
  text: [
    { some: '#1e40af', all: '#1e3a8a' }, // indigo
    { some: '#0e7490', all: '#155e75' }, // cyan
    { some: '#166534', all: '#14532d' }, // green
    { some: '#9a3412', all: '#7c2d12' }, // orange
    { some: '#9d174d', all: '#831843' }, // pink
  ],
};

export function ensureDefaultFlagRules(schema: DatasetSchema): DatasetSchema {
  const flags = schema.fields.filter((f) => f.roles.includes('flag'));

  const nextFields = schema.fields.map((f) => {
    if (!f.roles.includes('flag')) return f;
    const idx = Math.max(0, flags.findIndex((ff) => ff.key === f.key));
    const bgPal = DEFAULT_PALETTES.bg[idx % DEFAULT_PALETTES.bg.length];
    const textPal = DEFAULT_PALETTES.text[idx % DEFAULT_PALETTES.text.length];

    const existing = f.flag?.styleRules;
    
    // If already configured, don't overwrite
    if (existing?.bg?.enabled || existing?.text?.enabled) return f;

    return {
      ...f,
      flag: {
        ...f.flag,
        styleRules: {
          bg: {
            enabled: true,
            some: bgPal.some,
            all: bgPal.all,
          },
          text: {
            enabled: false, // Disabled by default - user can enable
            some: textPal.some,
            all: textPal.all,
          },
        },
      },
    };
  });

  return { ...schema, fields: nextFields };
}

export function pickCellStyle(
  schema: DatasetSchema,
  cell: PivotCell,
): { bg?: string; text?: string } {
  const n = cell.recordIds.length;
  if (n === 0) return {};

  const result: { bg?: string; text?: string } = {};

  // Get flags sorted by priority
  const flagFields = schema.fields
    .filter((f) => f.roles.includes('flag'))
    .slice()
    .sort((a, b) => (b.flag?.style?.priority ?? 0) - (a.flag?.style?.priority ?? 0));

  for (const f of flagFields) {
    const rules = f.flag?.styleRules;
    if (!rules) continue;

    const t = cell.flagSummary?.[f.key] ?? 0;
    let cov: 'none' | 'some' | 'all' = 'none';
    if (t === 0) cov = 'none';
    else if (t === n) cov = 'all';
    else cov = 'some';

    if (cov === 'none') continue;

    const ruleValue = cov === 'all' ? 'all' : 'some';

    // Background: only if enabled and not already set by higher priority flag
    if (rules.bg?.enabled && !result.bg) {
      const color = rules.bg[ruleValue];
      if (color) result.bg = color;
    }

    // Text: only if enabled and not already set by higher priority flag
    if (rules.text?.enabled && !result.text) {
      const color = rules.text[ruleValue];
      if (color) result.text = color;
    }

    // Stop early if both are set
    if (result.bg && result.text) break;
  }

  return result;
}
