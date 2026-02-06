import type { DatasetFileV1 } from '../domain/types';

export const sampleDataset: DatasetFileV1 = {
  version: 1,
  name: 'Bills of Lading (sample)',
  schema: {
    version: 1,
    fields: [
      {
        key: 'date',
        label: 'Date',
        type: 'date',
        roles: ['rowDim'],
      },
      {
        key: 'material',
        label: 'Material',
        type: 'string',
        roles: ['rowDim'],
        enum: ['Stone', 'Dirt'],
      },
      {
        key: 'vendor',
        label: 'Vendor',
        type: 'string',
        roles: ['colDim'],
        enum: ['Acme', 'Globex'],
      },
      {
        key: 'location',
        label: 'Location',
        type: 'string',
        roles: ['colDim'],
        enum: ['North', 'South'],
      },
      {
        key: 'tons',
        label: 'Tons',
        type: 'number',
        roles: ['measure'],
        measure: { format: 'decimal' },
      },
      {
        key: 'isCorrection',
        label: 'Correction',
        type: 'boolean',
        roles: ['flag'],
        flag: { style: { cellClass: 'cell-flagged', priority: 1 } },
      },
    ],
  },
  records: [
    {
      id: 'r1',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      data: { date: '2026-02-01', material: 'Stone', vendor: 'Acme', location: 'North', tons: 10 },
    },
    {
      id: 'r2',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      data: { date: '2026-02-01', material: 'Stone', vendor: 'Acme', location: 'North', tons: 2 },
    },
    {
      id: 'r3',
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      data: { date: '2026-02-01', material: 'Dirt', vendor: 'Globex', location: 'South', tons: 7 },
    },
    {
      id: 'r4',
      createdAt: '2026-02-02T00:00:00Z',
      updatedAt: '2026-02-02T00:00:00Z',
      data: { date: '2026-02-02', material: 'Stone', vendor: 'Globex', location: 'South', tons: 3 },
    },
  ],
};
