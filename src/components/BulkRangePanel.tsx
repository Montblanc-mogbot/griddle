import type { DatasetFileV1, SelectedCell } from '../domain/types';
import { bulkSetMetadata, getRecordsForCell, upsertRecords } from '../domain/records';
import { flagFields } from '../domain/records';

export function BulkRangePanel(props: {
  dataset: DatasetFileV1;
  selected: SelectedCell | null;
  recordIds: string[];
  cellCount: number;
  onClose: () => void;
  onDatasetChange: (next: DatasetFileV1) => void;
}) {
  const { dataset, selected, recordIds, cellCount, onClose, onDatasetChange } = props;

  const flags = flagFields(dataset.schema);
  const idSet = new Set(recordIds);
  const records = dataset.records.filter((r) => idSet.has(r.id));

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Bulk edit</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {cellCount} cells selected • {records.length} records affected
          </div>
        </div>
        <button onClick={onClose}>Close</button>
      </div>

      {selected ? (
        <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
          Tip: single-cell selection uses Entry. Range selection uses Bulk edit.
        </div>
      ) : null}

      {flags.length === 0 ? (
        <div style={{ marginTop: 14, color: '#666' }}>(no flag fields)</div>
      ) : (
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          {flags.map((f) => (
            <div
              key={f.key}
              style={{
                border: '1px solid #eee',
                borderRadius: 10,
                padding: 10,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 800 }}>{f.label}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    const updated = bulkSetMetadata(records, f.key, true);
                    onDatasetChange(upsertRecords(dataset, updated));
                  }}
                >
                  Set ON
                </button>
                <button
                  onClick={() => {
                    const updated = bulkSetMetadata(records, f.key, false);
                    onDatasetChange(upsertRecords(dataset, updated));
                  }}
                >
                  Set OFF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected ? (
        <div style={{ marginTop: 14, fontSize: 12, color: '#666' }}>
          Single-cell records in view: {getRecordsForCell(dataset, selected).length}
        </div>
      ) : null}
    </div>
  );
}
