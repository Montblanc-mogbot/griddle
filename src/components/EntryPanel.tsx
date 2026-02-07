import { useState } from 'react';
import type { DatasetFileV1, PivotConfig, SelectedCell } from '../domain/types';
import { BulkMetadataEdit } from './BulkMetadataEdit';
import { EntryHeader } from './EntryHeader';
import { FastDetailsForm } from './FastDetailsForm';
import { RecordTape } from './RecordTape';
import styles from './entryPanel.module.css';

export function EntryPanel(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell;
  onClose: () => void;
  onGoToFullRecords: () => void;
  onSubmit: (args: { measureValues: Record<string, number | ''>; flags: Record<string, boolean>; details?: Record<string, unknown> }) => void;
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
  onBulkToggleFlag: (flagKey: string, value: boolean) => void;
}) {
  const { dataset, config, selected, onClose, onGoToFullRecords, onSubmit, onToggleFlag, onBulkToggleFlag } = props;

  const [detailsDraft, setDetailsDraft] = useState<Record<string, unknown>>({});

  return (
    <div className={styles.panel}>
      <div className={styles.titleRow}>
        <div className={styles.title}>Entry</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onGoToFullRecords} style={{ cursor: 'pointer' }}>
            Full records…
          </button>
          <button onClick={onClose} style={{ cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>

      <EntryHeader dataset={dataset} config={config} selected={selected} />

      <FastDetailsForm schema={dataset.schema} onChange={setDetailsDraft} />

      {/* Bulk metadata should live above the tape (approved layout) */}
      <BulkMetadataEdit schema={dataset.schema} onToggle={onBulkToggleFlag} />

      {/* Tape ledger includes the shaded bottom “new entry” row */}
      <RecordTape
        dataset={dataset}
        selected={selected}
        onToggleFlag={onToggleFlag}
        onSubmit={({ measureValues, flags }) => onSubmit({ measureValues, flags, details: detailsDraft })}
      />
    </div>
  );
}
