import { describe, expect, it } from 'vitest';
import { computePivot } from './pivot';
import type { DatasetSchema, PivotConfig, RecordEntity } from './types';

const schema: DatasetSchema = {
  version: 1,
  fields: [],
};

const records: RecordEntity[] = [
  {
    id: 'a',
    createdAt: 't',
    updatedAt: 't',
    data: { x: 'X1', y: 'Y1', m: 2 },
  },
  {
    id: 'b',
    createdAt: 't',
    updatedAt: 't',
    data: { x: 'X1', y: 'Y1', m: 3 },
  },
  {
    id: 'c',
    createdAt: 't',
    updatedAt: 't',
    data: { x: 'X2', y: 'Y1', m: 5 },
  },
];

const cfg: PivotConfig = {
  rowKeys: ['x'],
  colKeys: ['y'],
  slicerKeys: [],
  slicers: {},
  measureKey: 'm',
};

describe('computePivot', () => {
  it('sums measure values per cell and returns contributing record ids', () => {
    const p = computePivot(records, schema, cfg, { filters: [] });

    expect(p.rowTuples).toHaveLength(2);
    expect(p.colTuples).toHaveLength(1);

    const cell = p.cells['0:0'];
    expect(cell.value).toBe(5);
    expect(cell.recordIds.sort()).toEqual(['a', 'b']);
  });

  it('applies slicers', () => {
    const cfg2: PivotConfig = { ...cfg, slicerKeys: ['x'], slicers: { x: 'X2' } };
    const p = computePivot(records, schema, cfg2, { filters: [] });
    expect(p.rowTuples).toHaveLength(1);
    expect(p.cells['0:0'].value).toBe(5);
  });

  it('applies filter set (include + exclude)', () => {
    const p1 = computePivot(records, schema, cfg, {
      filters: [{ dimensionKey: 'x', mode: 'include', values: ['X1'] }],
    });
    expect(p1.rowTuples).toHaveLength(1);
    expect(p1.cells['0:0'].value).toBe(5);

    const p2 = computePivot(records, schema, cfg, {
      filters: [{ dimensionKey: 'x', mode: 'exclude', values: ['X1'] }],
    });
    expect(p2.rowTuples).toHaveLength(1);
    expect(p2.cells['0:0'].value).toBe(5);
  });
});
