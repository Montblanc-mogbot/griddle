import type {
  DatasetFileV1,
  DatasetSchema,
  FieldDef,
  PivotCell,
  PivotConfig,
  RecordEntity,
  SelectedCell,
  Tuple,
} from './types';

export interface CellSelectionContext {
  row: Tuple;
  col: Tuple;
  recordIds: string[];
  cell: PivotCell;
}

export function selectionContext(selected: SelectedCell): CellSelectionContext {
  return {
    row: selected.row,
    col: selected.col,
    recordIds: selected.cell.recordIds,
    cell: selected.cell,
  };
}

export function getRecordsForCell(dataset: DatasetFileV1, selected: SelectedCell): RecordEntity[] {
  const idSet = new Set(selected.cell.recordIds);
  return dataset.records.filter((r) => idSet.has(r.id));
}

export function measureFields(schema: DatasetSchema): FieldDef[] {
  return schema.fields.filter((f) => f.roles.includes('measure'));
}

export function flagFields(schema: DatasetSchema): FieldDef[] {
  return schema.fields.filter((f) => f.roles.includes('flag'));
}

export function dimensionKeysFromConfig(config: PivotConfig): string[] {
  return Array.from(new Set([...config.rowKeys, ...config.colKeys, ...config.slicerKeys]));
}

export function createRecordFromSelection(args: {
  schema: DatasetSchema;
  config: PivotConfig;
  selected: SelectedCell;
  measureValues: Record<string, number | '' | null | undefined>;
  flags: Record<string, boolean | undefined>;
}): RecordEntity {
  const { schema, config, selected, measureValues, flags } = args;

  const now = new Date().toISOString();
  const data: Record<string, unknown> = {};

  // Implied dimensions (row+col tuples)
  const dimKeys = dimensionKeysFromConfig(config);
  for (const k of dimKeys) {
    const v = selected.row[k] ?? selected.col[k];
    if (v !== undefined && v !== '') data[k] = v;
  }

  // Measures
  for (const f of measureFields(schema)) {
    const mv = measureValues[f.key];
    if (mv === '' || mv === null || mv === undefined) continue;
    data[f.key] = mv;
  }

  // Flags (default false unless checked)
  for (const f of flagFields(schema)) {
    data[f.key] = Boolean(flags[f.key]);
  }

  // Minimal id for now (no uuid lib yet)
  const id = `r_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  return {
    id,
    createdAt: now,
    updatedAt: now,
    data,
  };
}

export function updateRecordMetadata(
  record: RecordEntity,
  flagKey: string,
  value: boolean,
): RecordEntity {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    data: {
      ...record.data,
      [flagKey]: value,
    },
  };
}

export function bulkSetMetadata(
  records: RecordEntity[],
  flagKey: string,
  value: boolean,
): RecordEntity[] {
  return records.map((r) => updateRecordMetadata(r, flagKey, value));
}

export function upsertRecords(dataset: DatasetFileV1, updated: RecordEntity[]): DatasetFileV1 {
  const byId = new Map(updated.map((r) => [r.id, r] as const));
  const existingIds = new Set(dataset.records.map((r) => r.id));

  const nextRecords: RecordEntity[] = dataset.records.map((r) => byId.get(r.id) ?? r);

  for (const r of updated) {
    if (!existingIds.has(r.id)) nextRecords.push(r);
  }

  return { ...dataset, records: nextRecords };
}
