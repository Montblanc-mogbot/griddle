import type { DatasetFileV1, FieldDef, PivotConfig, RecordEntity, SelectedCell } from '../domain/types';
import { createRecordFromSelection, getRecordsForCell, removeRecords, upsertRecords } from '../domain/records';
import { findNoteFieldKey, recordNoteValue } from '../domain/noteField';
import styles from './bottomPanel.module.css';
import { useMemo, useRef, useState } from 'react';

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

  const [newDraft, setNewDraft] = useState<RecordEntity | null>(null);
  const [workingIds, setWorkingIds] = useState<string[]>([]);
  const [workingAnchorId, setWorkingAnchorId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Use explicit record IDs if provided (bulk mode), otherwise derive from selected cell.
  // In bulk mode, we also include records from the currently-focused cell so that
  // actions like "Add record" (which target the focused cell) show up immediately.
  const records = useMemo(() => {
    const focusedCellIds = selected ? new Set(selected.cell.recordIds) : null;

    if (explicitRecordIds && explicitRecordIds.length > 0) {
      const idSet = new Set(explicitRecordIds);
      return dataset.records.filter((r) => idSet.has(r.id) || Boolean(focusedCellIds?.has(r.id)));
    }

    if (selected) {
      return getRecordsForCell(dataset, selected);
    }

    return [];
  }, [dataset, selected, explicitRecordIds]);
  const fields = dataset.schema.fields;
  const noteKey = findNoteFieldKey(dataset.schema);

  const workingSet = useMemo(() => new Set(workingIds), [workingIds]);

  const activeMeasureKey = config.measureKey;
  const activeMeasureLabel =
    dataset.schema.fields.find((f) => f.key === activeMeasureKey)?.label ?? activeMeasureKey;

  const workingTotals = useMemo(() => {
    let sum = 0;
    let count = 0;
    for (const r of records) {
      if (!workingSet.has(r.id)) continue;
      count++;
      const v = r.data[activeMeasureKey];
      if (typeof v === 'number' && Number.isFinite(v)) sum += v;
      else if (typeof v === 'string') {
        const n = Number(v);
        if (Number.isFinite(n)) sum += n;
      }
    }
    return { count, sum };
  }, [records, workingSet, activeMeasureKey]);

  function updateRecord(next: RecordEntity) {
    onDatasetChange(upsertRecords(dataset, [next]));
  }

  function submitNewDraft() {
    if (!newDraft) return;

    const measureKeys = dataset.schema.fields.filter((f) => f.roles.includes('measure')).map((f) => f.key);
    const hasAnyMeasure = measureKeys.some((k) => {
      const v = newDraft.data[k];
      if (v === null || v === undefined || v === '') return false;
      if (typeof v === 'number') return Number.isFinite(v);
      if (typeof v === 'string') {
        const n = Number(v);
        return Number.isFinite(n);
      }
      return false;
    });

    if (!hasAnyMeasure) {
      window.alert('Cannot create a record without at least one measure value.');
      return;
    }

    const now = new Date().toISOString();
    const finalRec: RecordEntity = {
      ...newDraft,
      id: `r_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`,
      createdAt: now,
      updatedAt: now,
    };

    onDatasetChange(upsertRecords(dataset, [finalRec]));
    setNewDraft(null);
  }

  function addNewRecord() {
    if (!selected) return; // Can't add record in bulk mode without a specific cell context

    // Create a local draft row; we only persist it once the user submits (and passes validation).
    const draft = createRecordFromSelection({
      schema: dataset.schema,
      config,
      selected,
      // Full Records panel doesn’t currently thread the global Filter Set; if needed, we can plumb it.
      measureValues: {},
      flags: {},
    });

    setNewDraft({ ...draft, id: '__new__' });

    // Scroll-to/top focus is handled by the table rendering; user can start typing immediately.
  }

  function deleteRecord(id: string) {
    const ok = window.confirm('Delete this record? This cannot be undone.');
    if (!ok) return;
    onDatasetChange(removeRecords(dataset, [id]));
  }

  function deleteAllRecords() {
    const targetIds = Array.from(new Set(records.map((r) => r.id)));
    if (targetIds.length === 0) return;

    // Strong confirm to avoid accidents.
    const phrase = 'DELETE ALL';
    const typed = window.prompt(
      `This will permanently delete ALL ${targetIds.length} record(s) currently shown in Full Records.\n\nType "${phrase}" to confirm.`,
    );
    if (typed !== phrase) return;

    onDatasetChange(removeRecords(dataset, targetIds));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <div className={styles.title}>Full records</div>
          <ContextPills selected={selected} config={config} />
          <div style={{ fontSize: 12, color: '#666', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{records.length} records in this cell.</span>
            <span>
              <b>Working:</b> {workingTotals.count} | <b>{activeMeasureLabel}:</b> {workingTotals.sum.toFixed(3)}
            </span>
          </div>
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

      <div
        className={styles.body}
        ref={wrapRef}
        onMouseDown={(e) => {
          // Clear "Working" when clicking whitespace (not a record), unless user is holding Ctrl/Meta.
          if (e.ctrlKey || e.metaKey) return;
          const t = e.target;
          if (!(t instanceof HTMLElement)) return;

          // Anything inside a record row (or an editor inside it) should not clear.
          const inRecordRow = Boolean(t.closest('tr[data-record-row="1"]'));
          if (inRecordRow) return;

          // Ignore clicks on header buttons etc (those are above), but body whitespace should clear.
          setWorkingIds([]);
        }}
      >

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee', padding: '6px 8px', width: 70 }}>
                  Working
                </th>
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
              {newDraft ? (
                <tr key="__new__" data-record-row="1" style={{ background: 'rgba(79, 70, 229, 0.06)' }}>
                  <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                    <b>NEW</b>
                  </td>
                  <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#777' }}>(draft)</span>
                  </td>
                  {fields.map((f) => (
                    <td key={f.key} style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px' }}>
                      <CellEditor record={newDraft} field={f} onChange={setNewDraft} />
                    </td>
                  ))}
                  <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', display: 'flex', gap: 8 }}>
                    <button
                      onClick={submitNewDraft}
                      style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.5)', color: 'var(--text)' }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setNewDraft(null)}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ) : null}

              {records.map((r) => {
                const isWorking = workingSet.has(r.id);
                return (
                  <tr
                    key={r.id}
                    data-record-row="1"
                    style={isWorking ? { background: 'rgba(34,197,94,0.06)' } : undefined}
                    onMouseDown={(e) => {
                      // Clicking anywhere in the row toggles "Working".
                      // Shift-click adds a range (Excel-ish).
                      // But don't toggle while the user is interacting with controls.
                      const t = e.target;
                      if (!(t instanceof HTMLElement)) return;
                      const tag = t.tagName.toLowerCase();
                      if (
                        tag === 'input' ||
                        tag === 'select' ||
                        tag === 'textarea' ||
                        tag === 'button' ||
                        t.isContentEditable
                      )
                        return;

                      const idsInOrder = records.map((x) => x.id);

                      if (e.shiftKey && workingAnchorId) {
                        const a = idsInOrder.indexOf(workingAnchorId);
                        const b = idsInOrder.indexOf(r.id);
                        if (a >= 0 && b >= 0) {
                          const lo = Math.min(a, b);
                          const hi = Math.max(a, b);
                          const rangeIds = idsInOrder.slice(lo, hi + 1);
                          setWorkingIds((prev) => {
                            const set = new Set(prev);
                            for (const id of rangeIds) set.add(id);
                            return Array.from(set.values());
                          });
                          return;
                        }
                      }

                      setWorkingAnchorId(r.id);
                      setWorkingIds((prev) => {
                        const set = new Set(prev);
                        if (set.has(r.id)) set.delete(r.id);
                        else set.add(r.id);
                        return Array.from(set.values());
                      });
                    }}
                    title="Click row to toggle Working"
                  >
                    <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      {isWorking ? (
                        <span
                          title="Working"
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background: 'rgba(34,197,94,0.35)',
                            border: '1px solid rgba(34,197,94,0.75)',
                            display: 'inline-block',
                          }}
                        />
                      ) : null}
                    </td>

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
                        style={{
                          background: 'rgba(255, 77, 79, 0.12)',
                          border: '1px solid rgba(255, 77, 79, 0.5)',
                          color: 'var(--text)',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
