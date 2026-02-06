import type { DatasetFileV1, PivotConfig, SelectedCell } from '../domain/types';
import { dimensionKeysFromConfig } from '../domain/records';

export function EntryHeader(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell;
}) {
  const { dataset, config, selected } = props;

  const dimKeys = dimensionKeysFromConfig(config);
  const implied = dimKeys
    .map((k) => ({
      key: k,
      label: dataset.schema.fields.find((f) => f.key === k)?.label ?? k,
      value: selected.row[k] ?? selected.col[k] ?? '',
    }))
    .filter((x) => x.value !== '');

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontWeight: 700 }}>Selection</div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#666' }}>Cell total ({config.measureKey})</div>
          <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {selected.cell.value ?? '(empty)'}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>Records: {selected.cell.recordIds.length}</div>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'grid', gap: 2 }}>
        {implied.map((x) => (
          <div key={x.key} style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 110, color: '#666' }}>{x.label}:</div>
            <div style={{ fontWeight: 600 }}>{String(x.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
