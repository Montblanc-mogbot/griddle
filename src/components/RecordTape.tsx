import type { DatasetFileV1, SelectedCell } from '../domain/types';
import { flagFields, getRecordsForCell, measureFields } from '../domain/records';
import { RecordTapeRow } from './RecordTapeRow';
import type { TapeFlag } from './RecordTapeRow.types';
import styles from './tapeLedger.module.css';

export function RecordTape(props: {
  dataset: DatasetFileV1;
  selected: SelectedCell;
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
}) {
  const { dataset, selected, onToggleFlag } = props;

  const records = getRecordsForCell(dataset, selected);
  const measures = measureFields(dataset.schema);
  const flags = flagFields(dataset.schema);

  const measureKeys = measures.map((m) => m.key);
  const flagKeys: TapeFlag[] = flags.map((f) => ({ key: f.key, label: f.label }));

  return (
    <div className={styles.section}>
      <div className={styles.headerRow}>
        <div style={{ fontWeight: 700 }}>Records in cell</div>
        <div className={styles.muted} style={{ fontSize: 12 }}>
          {records.length} records
        </div>
      </div>

      {records.length === 0 ? (
        <div className={styles.muted} style={{ marginTop: 8 }}>
          (none)
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {measures.map((m) => (
                  <th key={m.key} className={styles.th}>
                    {m.label}
                  </th>
                ))}
                {flags.map((f) => (
                  <th key={f.key} className={`${styles.th} ${styles.thLeft}`} style={{ textAlign: 'center' }}>
                    {f.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <RecordTapeRow
                  key={r.id}
                  record={r}
                  measures={measureKeys}
                  flags={flagKeys}
                  onToggleFlag={onToggleFlag}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
