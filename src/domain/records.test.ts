import { describe, expect, it } from 'vitest';
import type { DatasetFileV1, PivotConfig, SelectedCell } from './types';
import { bulkSetMetadata, createRecordFromSelection, upsertRecords } from './records';

const dataset: DatasetFileV1 = {
  version: 1,
  name: 't',
  schema: {
    version: 1,
    fields: [
      { key: 'date', label: 'Date', type: 'date', roles: ['rowDim'] },
      { key: 'vendor', label: 'Vendor', type: 'string', roles: ['colDim'] },
      { key: 'tons', label: 'Tons', type: 'number', roles: ['measure'] },
      { key: 'isCorrection', label: 'Correction', type: 'boolean', roles: ['flag'] }
    ]
  },
  records: []
};

const config: PivotConfig = {
  rowKeys: ['date'],
  colKeys: ['vendor'],
  slicerKeys: [],
  slicers: {},
  measureKey: 'tons'
};

const selected: SelectedCell = {
  rowIndex: 0,
  colIndex: 0,
  row: { date: '2026-02-01' },
  col: { vendor: 'Acme' },
  cell: { value: 12, recordIds: [] }
};

describe('records helpers', () => {
  it('createRecordFromSelection includes implied dims, measure, and defaults flags false', () => {
    const r = createRecordFromSelection({
      schema: dataset.schema,
      config,
      selected,
      measureValues: { tons: 10 },
      flags: {}
    });

    expect(r.data.date).toBe('2026-02-01');
    expect(r.data.vendor).toBe('Acme');
    expect(r.data.tons).toBe(10);
    expect(r.data.isCorrection).toBe(false);
  });

  it('bulkSetMetadata updates all records', () => {
    const a = { id: 'a', createdAt: 'x', updatedAt: 'x', data: { isCorrection: false } };
    const b = { id: 'b', createdAt: 'x', updatedAt: 'x', data: { isCorrection: false } };
    const next = bulkSetMetadata([a, b], 'isCorrection', true);
    expect(next[0].data.isCorrection).toBe(true);
    expect(next[1].data.isCorrection).toBe(true);
  });

  it('upsertRecords inserts new records and replaces by id', () => {
    const d0: DatasetFileV1 = { ...dataset, records: [{ id: 'a', createdAt: 'x', updatedAt: 'x', data: { tons: 1 } }] };
    const next = upsertRecords(d0, [
      { id: 'a', createdAt: 'x', updatedAt: 'y', data: { tons: 2 } },
      { id: 'b', createdAt: 'x', updatedAt: 'x', data: { tons: 3 } }
    ]);
    expect(next.records.find((r) => r.id === 'a')?.data.tons).toBe(2);
    expect(next.records.find((r) => r.id === 'b')?.data.tons).toBe(3);
  });
});
