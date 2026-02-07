import type { DatasetFileV1, FieldDef, SelectedCell } from '../domain/types';
import { flagFields, getRecordsForCell, measureFields } from '../domain/records';
import { RecordTapeRow } from './RecordTapeRow';
import type { TapeFlag } from './RecordTapeRow.types';
import styles from './tapeLedger.module.css';

import { TapeNewEntryRow } from './TapeNewEntryRow';

function detailsFields(schema: DatasetFileV1['schema']): FieldDef[] {
  return schema.fields
    .filter(
      (f) =>
        Boolean(f.entry?.showInFastEntry) &&
        !f.roles.includes('measure') &&
        !f.roles.includes('flag'),
    )
    .slice()
    .sort((a, b) => (a.entry?.order ?? 0) - (b.entry?.order ?? 0));
}

export function RecordTape(props: {
  dataset: DatasetFileV1;
  selected: SelectedCell;
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
  onSubmit: (args: {
    measureValues: Record<string, number | ''>;
    flags: Record<string, boolean>;
    details?: Record<string, unknown>;
  }) => void;
}) {
  const { dataset, selected, onToggleFlag, onSubmit } = props;

  const records = getRecordsForCell(dataset, selected);
  const details = detailsFields(dataset.schema);
  const measures = measureFields(dataset.schema);
  const flags = flagFields(dataset.schema);

  const detailKeys = details.map((d) => d.key);
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
      ) : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {details.map((d) => (
                <th key={d.key} className={styles.th}>
                  {d.label}
                </th>
              ))}
              {measures.map((m) => (
                <th key={m.key} className={styles.th}>
                  {m.label}
                </th>
              ))}
              {flags.map((f) => (
                <th
                  key={f.key}
                  className={`${styles.th} ${styles.thLeft}`}
                  style={{ textAlign: 'center' }}
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                {detailKeys.map((k) => (
                  <td key={k} className={styles.td}>
                    {String(r.data[k] ?? '')}
                  </td>
                ))}

                <RecordTapeRow
                  record={r}
                  measures={measureKeys}
                  flags={flagKeys}
                  onToggleFlag={onToggleFlag}
                />
              </tr>
            ))}

            <TapeNewEntryRow schema={dataset.schema} onSubmit={onSubmit} />
          </tbody>
        </table>
      </div>
    </div>
  );
}
