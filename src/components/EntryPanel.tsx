import type { DatasetFileV1, PivotConfig, SelectedCell } from '../domain/types';
import { BulkMetadataEdit } from './BulkMetadataEdit';
import { EntryHeader } from './EntryHeader';
import { RecordTape } from './RecordTape';
import styles from './entryPanel.module.css';

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
    <div className={styles.panel}>
      <div className={styles.titleRow}>
        <div className={styles.title}>Entry</div>
        <button onClick={onClose} style={{ cursor: 'pointer' }}>
          Close
        </button>
      </div>

      <EntryHeader dataset={dataset} config={config} selected={selected} />

      {/* Bulk metadata should live above the tape (approved layout) */}
      <BulkMetadataEdit schema={dataset.schema} onToggle={onBulkToggleFlag} />

      {/* Tape ledger includes the shaded bottom “new entry” row */}
      <RecordTape
        dataset={dataset}
        selected={selected}
        onToggleFlag={onToggleFlag}
        onSubmit={onSubmit}
      />
    </div>
  );
}
