import type { DatasetFileV1, DatasetSchema, FieldDef, PivotConfig, RecordEntity } from './types';

export interface SchemaMigrationResult {
  dataset: DatasetFileV1;
  pivotConfig: PivotConfig;
}

function findRenamedKeys(prevFields: FieldDef[], nextFields: FieldDef[]): Array<{ from: string; to: string }> {
  // Heuristic: if a field with the same label+type exists but key changed, treat as rename.
  // This is best-effort; future improvement: add stable field IDs.
  const bySignature = new Map<string, FieldDef[]>();
  for (const f of prevFields) {
    const sig = `${f.label}::${f.type}`;
    bySignature.set(sig, [...(bySignature.get(sig) ?? []), f]);
  }

  const renames: Array<{ from: string; to: string }> = [];

  for (const nf of nextFields) {
    const sig = `${nf.label}::${nf.type}`;
    const candidates = bySignature.get(sig) ?? [];
    const exactKeyMatch = candidates.find((c) => c.key === nf.key);
    if (exactKeyMatch) continue;

    // Choose a candidate that isn't already matched by key.
    const candidate = candidates[0];
    if (!candidate) continue;

    // If multiple fields share signature, this is ambiguous. We only rename when it's unambiguous.
    if (candidates.length !== 1) continue;

    renames.push({ from: candidate.key, to: nf.key });
  }

  return renames;
}

export function migrateDatasetOnSchemaChange(args: {
  dataset: DatasetFileV1;
  nextSchema: DatasetSchema;
  pivotConfig: PivotConfig;
}): SchemaMigrationResult {
  const { dataset, nextSchema, pivotConfig } = args;

  const prevSchema = dataset.schema;
  const prevKeys = new Set(prevSchema.fields.map((f) => f.key));
  const nextKeys = new Set(nextSchema.fields.map((f) => f.key));

  const renames = findRenamedKeys(prevSchema.fields, nextSchema.fields);

  const renameMap = new Map<string, string>();
  for (const r of renames) {
    if (prevKeys.has(r.from) && nextKeys.has(r.to)) renameMap.set(r.from, r.to);
  }

  function migrateRecord(r: RecordEntity): RecordEntity {
    const nextData: Record<string, unknown> = { ...r.data };

    // Apply renames (move values) when safe.
    for (const [from, to] of renameMap.entries()) {
      if (Object.prototype.hasOwnProperty.call(nextData, from)) {
        if (!Object.prototype.hasOwnProperty.call(nextData, to)) {
          nextData[to] = nextData[from];
          delete nextData[from];
        }
      }
    }

    // Drop keys that no longer exist in schema (optional, but keeps data tidy).
    for (const k of Object.keys(nextData)) {
      if (!nextKeys.has(k)) delete nextData[k];
    }

    return { ...r, data: nextData };
  }

  const migratedDataset: DatasetFileV1 = {
    ...dataset,
    schema: nextSchema,
    records: dataset.records.map(migrateRecord),
  };

  function migrateKey(k: string): string {
    return renameMap.get(k) ?? k;
  }

  const migratedPivot: PivotConfig = {
    ...pivotConfig,
    rowKeys: pivotConfig.rowKeys.map(migrateKey).filter((k) => nextKeys.has(k)),
    colKeys: pivotConfig.colKeys.map(migrateKey).filter((k) => nextKeys.has(k)),
    slicerKeys: pivotConfig.slicerKeys.map(migrateKey).filter((k) => nextKeys.has(k)),
    slicers: Object.fromEntries(
      Object.entries(pivotConfig.slicers)
        .map(([k, v]) => [migrateKey(k), v] as const)
        .filter(([k]) => nextKeys.has(k)),
    ),
    measureKey: nextKeys.has(migrateKey(pivotConfig.measureKey))
      ? migrateKey(pivotConfig.measureKey)
      : pivotConfig.measureKey,
  };

  return { dataset: migratedDataset, pivotConfig: migratedPivot };
}
