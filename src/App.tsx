import { useMemo, useState } from 'react';
import './App.css';
import { PivotControls } from './components/PivotControls';
import { PivotGrid } from './components/PivotGrid';
import { computePivot } from './domain/pivot';
import type { PivotConfig, SelectedCell } from './domain/types';
import { sampleDataset } from './sample/sampleDataset';

export default function App() {
  const dataset = sampleDataset;

  const defaultMeasure = dataset.schema.fields.find((f) => f.roles.includes('measure'))?.key ?? '';

  const [config, setConfig] = useState<PivotConfig>({
    rowKeys: ['date', 'material'],
    colKeys: ['vendor', 'location'],
    slicerKeys: [],
    slicers: {},
    measureKey: defaultMeasure,
  });

  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const pivot = useMemo(
    () => computePivot(dataset.records, dataset.schema, config),
    [dataset.records, dataset.schema, config],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 style={{ margin: 0 }}>Griddle</h2>
        <div style={{ color: '#666' }}>Schema-driven pivot (Milestone 1)</div>
      </header>

      <PivotControls
        schema={dataset.schema}
        config={config}
        onChange={(cfg) => {
          setSelected(null);
          setConfig(cfg);
        }}
      />

      <PivotGrid pivot={pivot} config={config} selected={selected} onSelect={setSelected} />

      <details open style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Selection debug</summary>
        <pre style={{ margin: 0, paddingTop: 8, overflow: 'auto' }}>
          {JSON.stringify(selected, null, 2)}
        </pre>
      </details>
    </div>
  );
}
