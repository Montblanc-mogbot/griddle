import type { DatasetFileV1, SelectedCell } from '../domain/types';
import { flagFields, getRecordsForCell, measureFields } from '../domain/records';
import { RecordTapeRow } from './RecordTapeRow';

export function RecordTape(props: {
  dataset: DatasetFileV1;
  selected: SelectedCell;
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
}) {
  const { dataset, selected, onToggleFlag } = props;

  const records = getRecordsForCell(dataset, selected);
  const measures = measureFields(dataset.schema);
  const flags = flagFields(dataset.schema);

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontWeight: 700 }}>Records in cell</div>
        <div style={{ fontSize: 12, color: '#666' }}>{records.length} records</div>
      </div>

      {records.length === 0 ? (
        <div style={{ marginTop: 8, color: '#666' }}>(none)</div>
      ) : (
        <div style={{ marginTop: 8, display: 'grid', gap: 8, maxHeight: 360, overflow: 'auto' }}>
          {records.map((r) => (
            <RecordTapeRow
              key={r.id}
              record={r}
              measures={measures.map((m) => m.key)}
              flags={flags.map((f) => ({ key: f.key, label: f.label }))}
              onToggleFlag={onToggleFlag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
