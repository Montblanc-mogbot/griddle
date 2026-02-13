import type { DatasetFileV1, FieldDef, PivotConfig, RecordEntity, SelectedCell } from '../domain/types';
import { createRecordFromSelection, getRecordsForCell, removeRecords, upsertRecords } from '../domain/records';
import { findNoteFieldKey, recordNoteValue } from '../domain/noteField';
import styles from './bottomPanel.module.css';
import { useMemo } from 'react';

function ContextPills(props: { selected: SelectedCell | null; config: PivotConfig }) {
  const { selected, config } = props;

  if (!selected) {
    return <div className={styles.context}><span>Bulk selection</span></div>;
  }

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

function setRecordField(record: RecordEntity, field: FieldDef, value: unknown): RecordEntity {
  const nextData = { ...record.data };

  if (value === '' || value === null || value === undefined) {
    delete nextData[field.key];
  } else {
    nextData[field.key] = value;
  }

  return {
    ...record,
    updatedAt: new Date().toISOString(),
    data: nextData,
  };
}

function readFieldValue(record: RecordEntity, field: FieldDef): unknown {
  return record.data[field.key];
}

function CellEditor(props: {
  record: RecordEntity;
  field: FieldDef;
  onChange: (next: RecordEntity) => void;
}) {
  const { record, field, onChange } = props;
  const v = readFieldValue(record, field);

  if (field.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(v)}
        onChange={(e) => onChange(setRecordField(record, field, e.target.checked))}
      />
    );
  }

  if (field.enum && field.enum.length > 0) {
    const sv = v === null || v === undefined ? '' : String(v);
    return (
      <select
        value={sv}
        onChange={(e) => {
          const next = e.target.value;
          onChange(setRecordField(record, field, next === '' ? '' : next));
        }}
      >
        <option value="">(blank)</option>
        {field.enum.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'number') {
    const sv = v === null || v === undefined ? '' : String(v);
    return (
      <input
        type="number"
        defaultValue={sv}
        onBlur={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange(setRecordField(record, field, ''));
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(setRecordField(record, field, n));
        }}
        style={{ width: 110 }}
      />
    );
  }

  if (field.type === 'date') {
    const sv = v === null || v === undefined ? '' : String(v);
    return (
      <input
        type="date"
        defaultValue={sv}
        onBlur={(e) => onChange(setRecordField(record, field, e.target.value))}
        style={{ width: 140 }}
      />
    );
  }

  // string
  const sv = v === null || v === undefined ? '' : String(v);
  return (
    <input
      type="text"
      defaultValue={sv}
      onBlur={(e) => onChange(setRecordField(record, field, e.target.value))}
      style={{ width: 160 }}
    />
  );
}

export function FullRecordsPanel(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell | null;
  recordIds?: string[];
  onClose: () => void;
  onDone: () => void;
  onDatasetChange: (next: DatasetFileV1) => void;
}) {
  const { dataset, config, selected, recordIds: explicitRecordIds, onClose, onDone, onDatasetChange } = props;

  // Use explicit record IDs if provided (bulk mode), otherwise derive from selected cell
  const records = useMemo(() => {
    if (explicitRecordIds && explicitRecordIds.length > 0) {
      const idSet = new Set(explicitRecordIds);
      return dataset.records.filter((r) => idSet.has(r.id));
    }
    if (selected) {
      return getRecordsForCell(dataset, selected);
    }
    return [];
  }, [dataset, selected, explicitRecordIds]);
  const fields = dataset.schema.fields;
  const noteKey = findNoteFieldKey(dataset.schema);

  function updateRecord(next: RecordEntity) {
    onDatasetChange(upsertRecords(dataset, [next]));
  }

  function addNewRecord() {
    if (!selected) return; // Can't add record in bulk mode without a specific cell context
    // Add a record prepopulated from selection dims; user can then fill any other fields.
    const rec = createRecordFromSelection({
      schema: dataset.schema,
      config,
      selected,
      measureValues: {},
      flags: {},
    });
    onDatasetChange(upsertRecords(dataset, [rec]));
  }

  function deleteRecord(id: string) {
    const ok = window.confirm('Delete this record? This cannot be undone.');
    if (!ok) return;
    onDatasetChange(removeRecords(dataset, [id]));
  }

  function deleteAllRecords() {
    if (dataset.records.length === 0) return;

    // Strong confirm to avoid accidents.
    const phrase = 'DELETE ALL';
    const typed = window.prompt(
      `This will permanently delete ALL ${dataset.records.length} records in the dataset.\n\nType "${phrase}" to confirm.`,
    );
    if (typed !== phrase) return;

    onDatasetChange(removeRecords(dataset, dataset.records.map((r) => r.id)));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div className={styles.title}>Full records</div>
          <ContextPills selected={selected} config={config} />
        </div>

        <div className={styles.actions}>
          <button onClick={addNewRecord} disabled={!selected}>Add record</button>
          <button onClick={deleteAllRecords} disabled={dataset.records.length === 0}>
            Delete all
          </button>
          <button onClick={onDone}>Back to entry</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>

      <div className={styles.body}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          {records.length} records in this cell.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '6px 8px' }}>id</th>
                {fields.map((f) => (
                  <th key={f.key} style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '6px 8px' }}>
                    {f.label}
                  </th>
                ))}
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '6px 8px' }} />
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      {r.id}
                      {(() => {
                        const note = recordNoteValue(r, noteKey);
                        return note ? (
                          <span
                            title={note}
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 999,
                              background: 'rgba(79, 70, 229, 0.18)',
                              border: '1px solid rgba(79, 70, 229, 0.35)',
                              display: 'inline-block',
                            }}
                          />
                        ) : null;
                      })()}
                    </span>
                  </td>
                  {fields.map((f) => (
                    <td key={f.key} style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px' }}>
                      <CellEditor record={r} field={f} onChange={updateRecord} />
                    </td>
                  ))}
                  <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px' }}>
                    <button
                      onClick={() => deleteRecord(r.id)}
                      style={{ background: 'rgba(255, 77, 79, 0.12)', border: '1px solid rgba(255, 77, 79, 0.5)', color: 'var(--text)' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
