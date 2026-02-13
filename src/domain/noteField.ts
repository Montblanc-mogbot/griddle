import type { DatasetSchema } from './types';

export function findNoteFieldKey(schema: DatasetSchema): string | null {
  const candidates = ['note', 'notes', 'comment', 'comments'];
  const byKey = new Map(schema.fields.map((f) => [f.key.toLowerCase(), f.key] as const));
  for (const c of candidates) {
    const k = byKey.get(c);
    if (k) return k;
  }

  // fallback: label contains note/comment
  const found = schema.fields.find((f) => {
    const lbl = (f.label ?? '').toLowerCase();
    return lbl.includes('note') || lbl.includes('comment');
  });
  return found?.key ?? null;
}

export function recordNoteValue(record: { data: Record<string, unknown> }, noteKey: string | null): string {
  if (!noteKey) return '';
  const v = record.data[noteKey];
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s;
}
