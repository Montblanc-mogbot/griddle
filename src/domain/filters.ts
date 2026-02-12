import type { DatasetSchema, DimensionFilter, FilterSet, RecordEntity } from './types';

function asKeyPart(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // dates are stored as YYYY-MM-DD strings in v1; tolerate Date.
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

export function dimensionLabel(schema: DatasetSchema, key: string): string {
  return schema.fields.find((f) => f.key === key)?.label ?? key;
}

export function filterSetActiveCount(fs: FilterSet | undefined | null): number {
  if (!fs) return 0;
  return fs.filters.filter((f) => f.values.length > 0).length;
}

export function recordMatchesFilter(record: RecordEntity, filter: DimensionFilter): boolean {
  if (!filter.values.length) return true;
  const actual = asKeyPart(record.data[filter.dimensionKey]);
  const set = new Set(filter.values.map(asKeyPart));
  const included = set.has(actual);
  return filter.mode === 'exclude' ? !included : included;
}

export function recordMatchesFilterSet(record: RecordEntity, fs: FilterSet | undefined | null): boolean {
  if (!fs) return true;
  for (const f of fs.filters) {
    if (!recordMatchesFilter(record, f)) return false;
  }
  return true;
}

export function applyFilterSet(records: RecordEntity[], fs: FilterSet | undefined | null): RecordEntity[] {
  if (!fs) return records;
  if (fs.filters.every((f) => f.values.length === 0)) return records;
  return records.filter((r) => recordMatchesFilterSet(r, fs));
}

export function getFilter(fs: FilterSet, dimensionKey: string): DimensionFilter {
  return (
    fs.filters.find((f) => f.dimensionKey === dimensionKey) ?? {
      dimensionKey,
      mode: 'include',
      values: [],
    }
  );
}

export function upsertFilter(fs: FilterSet, next: DimensionFilter): FilterSet {
  const filters = fs.filters.filter((f) => f.dimensionKey !== next.dimensionKey);
  return { ...fs, filters: [...filters, next] };
}

export function removeFilter(fs: FilterSet, dimensionKey: string): FilterSet {
  return { ...fs, filters: fs.filters.filter((f) => f.dimensionKey !== dimensionKey) };
}

export function dimensionKeysEligibleForFiltering(schema: DatasetSchema): string[] {
  // Any non-measure field is fair game. (Filtering on measure values can come later.)
  return schema.fields.filter((f) => !f.roles.includes('measure')).map((f) => f.key);
}

export function uniqueDimensionValues(records: RecordEntity[], dimensionKey: string): string[] {
  const set = new Set<string>();
  for (const r of records) set.add(asKeyPart(r.data[dimensionKey]));
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
