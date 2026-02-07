import type { RecordEntity } from './types';

export function setRecordField(record: RecordEntity, key: string, value: unknown): RecordEntity {
  const nextData = { ...record.data };

  if (value === '' || value === null || value === undefined) {
    delete nextData[key];
  } else {
    nextData[key] = value;
  }

  return {
    ...record,
    updatedAt: new Date().toISOString(),
    data: nextData,
  };
}
