import { useMemo, useState } from 'react';
import type { DatasetFileV1, DatasetSchema, PivotConfig } from '../domain/types';
import { SchemaEditor } from './SchemaEditor';

function newEmptyDataset(name: string): DatasetFileV1 {
  const schema: DatasetSchema = {
    version: 1,
    fields: [
      { key: 'date', label: 'Date', type: 'date', roles: ['colDim'] },
      { key: 'category', label: 'Category', type: 'string', roles: ['rowDim'] },
      { key: 'amount', label: 'Amount', type: 'number', roles: ['measure'] },
    ],
  };

  return {
    version: 1,
    name,
    schema,
    records: [],
    views: [],
  };
}

function defaultPivotConfig(schema: DatasetSchema): PivotConfig {
  const rowDefaults = schema.fields.filter((f) => f.roles.includes('rowDim')).map((f) => f.key);
  const colDefaults = schema.fields.filter((f) => f.roles.includes('colDim')).map((f) => f.key);
  const measureKeys = schema.fields.filter((f) => f.roles.includes('measure')).map((f) => f.key);

  return {
    rowKeys: rowDefaults.slice(0, 2),
    colKeys: colDefaults.slice(0, 2),
    rowFilters: {},
    slicerKeys: [],
    slicers: {},
    measureKey: measureKeys[0] ?? '',
  };
}

export function NewGriddleWizard(props: {
  onCancel: () => void;
  onCreate: (dataset: DatasetFileV1, pivot: PivotConfig) => void;
}) {
  const { onCancel, onCreate } = props;

  const [name, setName] = useState('New Griddle');
  const [dataset, setDataset] = useState<DatasetFileV1>(() => newEmptyDataset('New Griddle'));

  const pivot = useMemo(() => defaultPivotConfig(dataset.schema), [dataset.schema]);

  return (
    <div style={{ display: 'grid', gap: 12, width: 980, maxWidth: '90vw' }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)' }}>Name</label>
        <input
          value={name}
          onChange={(e) => {
            const next = e.target.value;
            setName(next);
            setDataset((d) => ({ ...d, name: next }));
          }}
        />
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        Define your fields (roles drive what shows up in the pivot). You can always edit this later.
      </div>

      <SchemaEditor
        schema={dataset.schema}
        onChange={(schema) => {
          setDataset((d) => ({ ...d, schema }));
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancel}>Cancel</button>
        <button
          onClick={() => {
            onCreate(dataset, pivot);
          }}
          style={{ fontWeight: 900 }}
        >
          Create
        </button>
      </div>
    </div>
  );
}
