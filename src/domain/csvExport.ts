import type { DatasetFileV1, FieldDef } from './types';

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

function asCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  return JSON.stringify(v);
}

function fieldOrder(schemaFields: FieldDef[]): string[] {
  // stable: schema order
  return schemaFields.map((f) => f.key);
}

export function exportDatasetRecordsCsv(dataset: DatasetFileV1): string {
  const keys = fieldOrder(dataset.schema.fields);

  const header = ['id', 'createdAt', 'updatedAt', ...keys];

  const rows = dataset.records.map((r) => {
    const cells = [r.id, r.createdAt, r.updatedAt, ...keys.map((k) => asCell(r.data[k]))];
    return cells.map((c) => csvEscape(c)).join(',');
  });

  return header.map(csvEscape).join(',') + '\n' + rows.join('\n') + '\n';
}
