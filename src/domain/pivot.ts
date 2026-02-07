import type { DatasetSchema, PivotConfig, PivotResult, RecordEntity, Tuple } from './types';

function asKeyPart(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // date is stored as YYYY-MM-DD string per v1; but tolerate Date.
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function tupleKey(keys: string[], tuple: Tuple): string {
  return keys.map((k) => `${k}=${tuple[k] ?? ''}`).join('|');
}

function buildTuple(keys: string[], record: RecordEntity): Tuple {
  const t: Tuple = {};
  for (const k of keys) t[k] = asKeyPart(record.data[k]);
  return t;
}

function recordMatchesSlicers(record: RecordEntity, config: PivotConfig): boolean {
  for (const k of config.slicerKeys) {
    const desired = config.slicers[k];
    if (desired === undefined || desired === null || desired === '') continue;

    const actual = asKeyPart(record.data[k]);

    if (Array.isArray(desired)) {
      // Multi-select slicer: record passes if actual is included.
      const set = new Set(desired.map(asKeyPart));
      if (!set.has(actual)) return false;
    } else {
      // Single value slicer.
      if (actual !== asKeyPart(desired)) return false;
    }
  }
  return true;
}

function recordMatchesRowFilters(record: RecordEntity, config: PivotConfig): boolean {
  const rf = config.rowFilters;
  if (!rf) return true;

  for (const [k, allowed] of Object.entries(rf)) {
    if (!allowed || allowed.length === 0) continue;
    const actual = asKeyPart(record.data[k]);
    const set = new Set(allowed.map(asKeyPart));
    if (!set.has(actual)) return false;
  }

  return true;
}

function measureValue(record: RecordEntity, measureKey: string): number | null {
  const v = record.data[measureKey];
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Compute a pivot view over flat records.
 * v1 rules:
 * - tuples are distinct combos of rowKeys/colKeys
 * - only SUM aggregation for measureKey
 * - ignores missing/non-numeric measure values
 */
export function computePivot(
  records: RecordEntity[],
  schema: DatasetSchema,
  config: PivotConfig,
): PivotResult {
  const rowMap = new Map<string, Tuple>();
  const colMap = new Map<string, Tuple>();

  const flagKeys = schema.fields.filter((f) => f.roles.includes('flag')).map((f) => f.key);

  const filtered = records.filter((r) => recordMatchesSlicers(r, config) && recordMatchesRowFilters(r, config));

  for (const r of filtered) {
    const rt = buildTuple(config.rowKeys, r);
    const ct = buildTuple(config.colKeys, r);
    rowMap.set(tupleKey(config.rowKeys, rt), rt);
    colMap.set(tupleKey(config.colKeys, ct), ct);
  }

  const rowTuples = Array.from(rowMap.values()).sort((a, b) => {
    for (const k of config.rowKeys) {
      const av = a[k] ?? '';
      const bv = b[k] ?? '';
      const cmp = av.localeCompare(bv);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  const colTuples = Array.from(colMap.values()).sort((a, b) => {
    for (const k of config.colKeys) {
      const av = a[k] ?? '';
      const bv = b[k] ?? '';
      const cmp = av.localeCompare(bv);
      if (cmp !== 0) return cmp;
    }
    return 0;
  });

  const rowIndex = new Map<string, number>();
  rowTuples.forEach((t, i) => rowIndex.set(tupleKey(config.rowKeys, t), i));
  const colIndex = new Map<string, number>();
  colTuples.forEach((t, i) => colIndex.set(tupleKey(config.colKeys, t), i));

  const cells: PivotResult['cells'] = {};

  for (const r of filtered) {
    const rt = buildTuple(config.rowKeys, r);
    const ct = buildTuple(config.colKeys, r);
    const ri = rowIndex.get(tupleKey(config.rowKeys, rt));
    const ci = colIndex.get(tupleKey(config.colKeys, ct));
    if (ri === undefined || ci === undefined) continue;

    const key = `${ri}:${ci}`;
    const m = measureValue(r, config.measureKey);

    if (!cells[key]) {
      cells[key] = {
        value: null,
        recordIds: [],
        flagSummary: Object.fromEntries(flagKeys.map((fk) => [fk, 0])),
      };
    }

    cells[key].recordIds.push(r.id);

    // Flag summaries (count of true per flag)
    if (cells[key].flagSummary) {
      for (const fk of flagKeys) {
        if (r.data[fk] === true) cells[key].flagSummary[fk] = (cells[key].flagSummary[fk] ?? 0) + 1;
      }
    }

    if (m !== null) cells[key].value = (cells[key].value ?? 0) + m;
  }

  return { rowTuples, colTuples, cells };
}
