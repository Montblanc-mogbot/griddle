import { describe, expect, it } from 'vitest';
import type { DatasetFileV1, DatasetSchema, FieldRole, PivotConfig } from './types';
import { migrateDatasetOnSchemaChange } from './schemaMigration';

function makeDataset(): DatasetFileV1 {
  return {
    version: 1,
    name: 't',
    schema: {
      version: 1,
      fields: [
        { key: 'a', label: 'A', type: 'string', roles: ['rowDim'] },
        { key: 'tons', label: 'Tons', type: 'number', roles: ['measure'] },
      ],
    },
    records: [
      {
        id: 'r1',
        createdAt: 'x',
        updatedAt: 'x',
        data: { a: 'foo', tons: 1 },
      },
    ],
  };
}

const basePivot: PivotConfig = {
  rowKeys: ['a'],
  colKeys: [],
  slicerKeys: [],
  slicers: {},
  measureKey: 'tons',
};

describe('migrateDatasetOnSchemaChange', () => {
  it('drops removed fields from record data', () => {
    const dataset = makeDataset();

    const nextSchema: DatasetSchema = {
      version: 1,
      fields: [
        {
          key: 'tons',
          label: 'Tons',
          type: 'number',
          roles: ['measure'] as FieldRole[],
        },
      ],
    };

    const { dataset: next } = migrateDatasetOnSchemaChange({
      dataset,
      nextSchema,
      pivotConfig: basePivot,
    });

    expect(next.records[0].data).toEqual({ tons: 1 });
  });

  it('renames record data key when label+type matches and key changes (best-effort)', () => {
    const dataset = makeDataset();

    const nextSchema: DatasetSchema = {
      version: 1,
      fields: [
        { key: 'plant', label: 'A', type: 'string', roles: ['rowDim'] as FieldRole[] },
        { key: 'tons', label: 'Tons', type: 'number', roles: ['measure'] as FieldRole[] },
      ],
    };

    const { dataset: next, pivotConfig: nextPivot } = migrateDatasetOnSchemaChange({
      dataset,
      nextSchema,
      pivotConfig: basePivot,
    });

    expect(next.records[0].data).toEqual({ plant: 'foo', tons: 1 });
    expect(nextPivot.rowKeys).toEqual(['plant']);
  });
});
