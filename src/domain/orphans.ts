import type { DatasetFileV1, PivotConfig, RecordEntity } from './types';

export type OrphanKind = 'missingDimension' | 'missingMeasure';

export interface OrphanIssue {
  kind: OrphanKind;
  recordId: string;
  missingKeys: string[];
}

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

function measureIsPresent(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n);
  }
  return false;
}

function measureKeys(schema: DatasetFileV1['schema']): string[] {
  return schema.fields.filter((f) => f.roles.includes('measure')).map((f) => f.key);
}

function dimensionKeys(config: PivotConfig): string[] {
  return Array.from(new Set([...config.rowKeys, ...config.colKeys, ...config.slicerKeys]));
}

export function orphanIssuesForRecord(args: {
  record: RecordEntity;
  schema: DatasetFileV1['schema'];
  config: PivotConfig;
}): OrphanIssue[] {
  const { record, schema, config } = args;

  const dimKeys = dimensionKeys(config);
  const missingDims = dimKeys.filter((k) => isBlank(record.data[k]));

  const mKeys = measureKeys(schema);
  const hasAnyMeasure = mKeys.some((k) => measureIsPresent(record.data[k]));

  const issues: OrphanIssue[] = [];
  if (missingDims.length > 0) issues.push({ kind: 'missingDimension', recordId: record.id, missingKeys: missingDims });
  if (!hasAnyMeasure) issues.push({ kind: 'missingMeasure', recordId: record.id, missingKeys: mKeys });

  return issues;
}

export function findOrphanedRecords(args: {
  dataset: DatasetFileV1;
  config: PivotConfig;
}): { recordIds: string[]; issues: OrphanIssue[] } {
  const { dataset, config } = args;

  const issues: OrphanIssue[] = [];
  for (const r of dataset.records) {
    issues.push(...orphanIssuesForRecord({ record: r, schema: dataset.schema, config }));
  }

  const byId = new Map<string, OrphanIssue[]>();
  for (const i of issues) {
    const arr = byId.get(i.recordId) ?? [];
    arr.push(i);
    byId.set(i.recordId, arr);
  }

  return { recordIds: Array.from(byId.keys()), issues };
}
