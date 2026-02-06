import type { RecordEntity } from '../domain/types';

export type TapeFlag = { key: string; label: string };

export function getNumber(record: RecordEntity, key: string): string {
  const v = record.data[key];
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return String(v);
  return String(v);
}
