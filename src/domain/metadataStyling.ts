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

const DEFAULT_PALETTE = [
  { some: '#eef2ff', all: '#e0e7ff', text: '#111' }, // indigo
  { some: '#ecfeff', all: '#cffafe', text: '#111' }, // cyan
  { some: '#f0fdf4', all: '#dcfce7', text: '#111' }, // green
  { some: '#fff7ed', all: '#ffedd5', text: '#111' }, // orange
  { some: '#fdf2f8', all: '#fce7f3', text: '#111' }, // pink
];

export function ensureDefaultFlagRules(schema: DatasetSchema): DatasetSchema {
  const flags = schema.fields.filter((f) => f.roles.includes('flag'));

  const nextFields = schema.fields.map((f) => {
    if (!f.roles.includes('flag')) return f;
    const idx = Math.max(0, flags.findIndex((ff) => ff.key === f.key));
    const pal = DEFAULT_PALETTE[idx % DEFAULT_PALETTE.length];

    const existing = f.flag?.styleRules;
    if (existing && (existing.some?.bg || existing.all?.bg || existing.none?.bg)) return f;

    return {
      ...f,
      flag: {
        ...f.flag,
        styleRules: {
          none: { bg: undefined, text: undefined },
          some: { bg: pal.some, text: pal.text },
          all: { bg: pal.all, text: pal.text },
        },
      },
    };
  });

  return { ...schema, fields: nextFields };
}

export function pickCellStyle(schema: DatasetSchema, cell: PivotCell): { bg?: string; text?: string } {
  const n = cell.recordIds.length;
  if (n === 0) return {};

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

    const rule = cov === 'all' ? rules.all : cov === 'some' ? rules.some : rules.none;
    if (rule?.bg || rule?.text) return { bg: rule.bg, text: rule.text };
  }

  return {};
}
