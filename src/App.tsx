import { useMemo, useState } from 'react';
import './App.css';
import { PivotControls } from './components/PivotControls';
import { PivotGrid } from './components/PivotGrid';
import { SchemaEditor } from './components/SchemaEditor';
import { SelectionInspector } from './components/SelectionInspector';
import { computePivot } from './domain/pivot';
import type { DatasetFileV1, DatasetSchema, PivotConfig, SelectedCell } from './domain/types';
import { migrateDatasetOnSchemaChange } from './domain/schemaMigration';
import { sampleDataset } from './sample/sampleDataset';

export default function App() {
  const [dataset, setDataset] = useState<DatasetFileV1>(sampleDataset);

  const defaultMeasure =
    dataset.schema.fields.find((f) => f.roles.includes('measure'))?.key ??
    dataset.schema.fields.find((f) => f.type === 'number')?.key ??
    '';

  const [config, setConfig] = useState<PivotConfig>({
    rowKeys: ['date', 'material'],
    colKeys: ['vendor', 'location'],
    slicerKeys: [],
    slicers: {},
    measureKey: defaultMeasure,
  });

  const [selected, setSelected] = useState<SelectedCell | null>(null);
  const [showSchemaEditor, setShowSchemaEditor] = useState(false);

  const pivot = useMemo(
    () => computePivot(dataset.records, dataset.schema, config),
    [dataset.records, dataset.schema, config],
  );

  function applySchema(nextSchema: DatasetSchema) {
    setSelected(null);

    setDataset((prevDataset) => {
      // Note: this call also migrates record data keys (best-effort rename + drop removed fields)
      const { dataset: nextDataset, pivotConfig: nextPivot } = migrateDatasetOnSchemaChange({
        dataset: prevDataset,
        nextSchema,
        pivotConfig: config,
      });

      // Update pivot config alongside dataset.
      setConfig({
        ...nextPivot,
        // Ensure we always have a measure selected when possible
        measureKey: nextPivot.measureKey || defaultMeasure,
      });

      return nextDataset;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 style={{ margin: 0 }}>Griddle</h2>
        <div style={{ color: '#666' }}>Schema-driven pivot</div>
      </header>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <PivotControls
          schema={dataset.schema}
          config={config}
          onChange={(cfg) => {
            setSelected(null);
            setConfig(cfg);
          }}
        />
        <button onClick={() => setShowSchemaEditor((s) => !s)} style={{ cursor: 'pointer' }}>
          {showSchemaEditor ? 'Hide schema editor' : 'Edit schema'}
        </button>
      </div>

      {showSchemaEditor ? (
        <SchemaEditor schema={dataset.schema} onChange={applySchema} />
      ) : null}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PivotGrid pivot={pivot} config={config} selected={selected} onSelect={setSelected} />
        </div>
        <SelectionInspector dataset={dataset} selected={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}
