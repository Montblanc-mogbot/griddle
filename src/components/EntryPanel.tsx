import type { DatasetFileV1, PivotConfig, SelectedCell } from '../domain/types';
import { BulkMetadataEdit } from './BulkMetadataEdit';
import { EntryHeader } from './EntryHeader';
import { FastEntryForm } from './FastEntryForm';
import { RecordTape } from './RecordTape';

export function EntryPanel(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell;
  onClose: () => void;
  onSubmit: (args: { measureValues: Record<string, number | ''>; flags: Record<string, boolean> }) => void;
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
  onBulkToggleFlag: (flagKey: string, value: boolean) => void;
}) {
  const { dataset, config, selected, onClose, onSubmit, onToggleFlag, onBulkToggleFlag } = props;

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        background: '#fff',
        padding: 12,
        display: 'grid',
        gap: 12,
        minWidth: 420,
        maxWidth: 520,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800 }}>Entry</div>
        <button onClick={onClose} style={{ cursor: 'pointer' }}>
          Close
        </button>
      </div>

      <EntryHeader dataset={dataset} config={config} selected={selected} />

      <FastEntryForm schema={dataset.schema} onSubmit={onSubmit} />

      <BulkMetadataEdit schema={dataset.schema} onToggle={onBulkToggleFlag} />

      <RecordTape
        dataset={dataset}
        selected={selected}
        onToggleFlag={onToggleFlag}
      />
    </div>
  );
}
