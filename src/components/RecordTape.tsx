import type { DatasetFileV1, FieldDef, SelectedCell } from '../domain/types';
import { findNoteFieldKey, recordNoteValue } from '../domain/noteField';
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
  onUpdateRecordField: (recordId: string, key: string, value: unknown) => void;
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
  onSubmit: (args: {
    measureValues: Record<string, number | ''>;
    flags: Record<string, boolean>;
    details?: Record<string, unknown>;
  }) => void;
}) {
  const { dataset, selected, onUpdateRecordField, onToggleFlag, onSubmit } = props;

  const records = getRecordsForCell(dataset, selected);
  const details = detailsFields(dataset.schema);
  const measures = measureFields(dataset.schema);
  const flags = flagFields(dataset.schema);
  const noteKey = findNoteFieldKey(dataset.schema);

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
              {noteKey ? <th className={`${styles.th} ${styles.noteCell}`} title="Has note" /> : null}
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
                {noteKey ? (
                  <td className={`${styles.td} ${styles.noteCell}`}>
                    {(() => {
                      const note = recordNoteValue(r, noteKey);
                      return note ? <span className={styles.noteDot} title={note} /> : null;
                    })()}
                  </td>
                ) : null}

                {details.map((d) => {
                  const v = r.data[d.key];
                  if (d.enum && d.enum.length > 0) {
                    return (
                      <td key={d.key} className={styles.td}>
                        <select
                          value={String(v ?? '')}
                          onChange={(e) => onUpdateRecordField(r.id, d.key, e.target.value)}
                        >
                          <option value="">(blank)</option>
                          {d.enum.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }

                  if (d.type === 'date') {
                    return (
                      <td key={d.key} className={styles.td}>
                        <input
                          type="date"
                          defaultValue={String(v ?? '')}
                          onBlur={(e) => onUpdateRecordField(r.id, d.key, e.target.value)}
                        />
                      </td>
                    );
                  }

                  if (d.type === 'number') {
                    return (
                      <td key={d.key} className={styles.td}>
                        <input
                          type="number"
                          defaultValue={String(v ?? '')}
                          onBlur={(e) => {
                            const raw = e.target.value;
                            if (raw === '') return onUpdateRecordField(r.id, d.key, '');
                            const n = Number(raw);
                            if (!Number.isFinite(n)) return;
                            onUpdateRecordField(r.id, d.key, n);
                          }}
                        />
                      </td>
                    );
                  }

                  if (d.type === 'boolean') {
                    return (
                      <td key={d.key} className={styles.td}>
                        <input
                          type="checkbox"
                          checked={Boolean(v)}
                          onChange={(e) => onUpdateRecordField(r.id, d.key, e.target.checked)}
                        />
                      </td>
                    );
                  }

                  return (
                    <td key={d.key} className={styles.td}>
                      <input
                        type="text"
                        defaultValue={String(v ?? '')}
                        onBlur={(e) => onUpdateRecordField(r.id, d.key, e.target.value)}
                      />
                    </td>
                  );
                })}

                <RecordTapeRow
                  record={r}
                  measures={measureKeys}
                  flags={flagKeys}
                  onToggleFlag={onToggleFlag}
                  onUpdateMeasure={(k, value) => onUpdateRecordField(r.id, k, value)}
                />
              </tr>
            ))}

            <TapeNewEntryRow
              schema={dataset.schema}
              hasNoteColumn={Boolean(noteKey)}
              focusSeed={`${selected.rowIndex}:${selected.colIndex}`}
              onSubmit={onSubmit}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
