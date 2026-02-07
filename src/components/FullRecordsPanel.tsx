import type { DatasetFileV1, PivotConfig, SelectedCell } from '../domain/types';
import { createRecordFromSelection, getRecordsForCell, upsertRecords } from '../domain/records';
import { flagFields, measureFields } from '../domain/records';
import styles from './bottomPanel.module.css';

function ContextPills(props: { selected: SelectedCell; config: PivotConfig }) {
  const { selected, config } = props;

  const dimKeys = Array.from(new Set([...config.rowKeys, ...config.colKeys]));
  return (
    <div className={styles.context}>
      {dimKeys.map((k) => {
        const v = selected.row[k] ?? selected.col[k] ?? '';
        return (
          <span key={k}>
            <b>{k}</b>=<span>{v || '(blank)'}</span>
          </span>
        );
      })}
    </div>
  );
}

export function FullRecordsPanel(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell;
  onClose: () => void;
  onDone: () => void;
  onDatasetChange: (next: DatasetFileV1) => void;
}) {
  const { dataset, config, selected, onClose, onDone, onDatasetChange } = props;

  const records = getRecordsForCell(dataset, selected);
  const measures = measureFields(dataset.schema);
  const flags = flagFields(dataset.schema);

  function addNewRecord() {
    // For now: add a record with empty measures (user can edit later). This unblocks "blank cell" creation.
    const rec = createRecordFromSelection({
      schema: dataset.schema,
      config,
      selected,
      measureValues: {},
      flags: Object.fromEntries(flags.map((f) => [f.key, false])),
    });
    onDatasetChange(upsertRecords(dataset, [rec]));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div className={styles.title}>Full records</div>
          <ContextPills selected={selected} config={config} />
        </div>

        <div className={styles.actions}>
          <button onClick={addNewRecord}>Add record</button>
          <button onClick={onDone}>Back to entry</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>

      <div className={styles.body}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          {records.length} records in this cell. (Editor UI next: inline edit of dims/measures/flags.)
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '6px 8px' }}>id</th>
                {measures.map((m) => (
                  <th key={m.key} style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '6px 8px' }}>
                    {m.label}
                  </th>
                ))}
                {flags.map((f) => (
                  <th key={f.key} style={{ textAlign: 'center', borderBottom: '1px solid #eee', padding: '6px 8px' }}>
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>{r.id}</td>
                  {measures.map((m) => (
                    <td key={m.key} style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px' }}>
                      {String(r.data[m.key] ?? '')}
                    </td>
                  ))}
                  {flags.map((f) => (
                    <td key={f.key} style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', textAlign: 'center' }}>
                      {r.data[f.key] ? '✓' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
