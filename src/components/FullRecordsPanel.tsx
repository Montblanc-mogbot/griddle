import type { DatasetFileV1, FieldDef, PivotConfig, RecordEntity, SelectedCell } from '../domain/types';
import {
  assignPersistentRecordIdentity,
  createDraftRecordFromSelection,
  getRecordsForCell,
  hasAnyFiniteMeasureValue,
  patchRecordField,
  readRecordField,
  removeRecords,
  upsertRecords,
} from '../domain/records';
import { findNoteFieldKey, recordNoteValue } from '../domain/noteField';
import type { UiPrefsV1 } from '../domain/uiPrefs';
import { rgbaFromHex } from '../domain/colorUtil';
import styles from './bottomPanel.module.css';
import { formatNumberFullPrecision } from '../domain/format';
import type { MouseEvent } from 'react';
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

function CellEditor(props: {
  record: RecordEntity;
  field: FieldDef;
  onChange: (next: RecordEntity) => void;
}) {
  const { record, field, onChange } = props;
  const v = readRecordField(record, field);

  if (field.type === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={Boolean(v)}
        onChange={(e) => onChange(patchRecordField(record, field, e.target.checked))}
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
          onChange(patchRecordField(record, field, next === '' ? '' : next));
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
          if (raw === '') return onChange(patchRecordField(record, field, ''));
          const n = Number(raw);
          if (!Number.isFinite(n)) return;
          onChange(patchRecordField(record, field, n));
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
        onBlur={(e) => onChange(patchRecordField(record, field, e.target.value))}
        style={{ width: 140 }}
      />
    );
  }

  const sv = v === null || v === undefined ? '' : String(v);
  return (
    <input
      type="text"
      defaultValue={sv}
      onBlur={(e) => onChange(patchRecordField(record, field, e.target.value))}
      style={{ width: 160 }}
    />
  );
}

function FullRecordsHeader(props: {
  selected: SelectedCell | null;
  config: PivotConfig;
  recordCount: number;
  workingCount: number;
  activeMeasureLabel: string;
  workingMeasureSum: number;
  canAddRecord: boolean;
  canDeleteAll: boolean;
  onAddRecord: () => void;
  onDeleteAll: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const {
    selected,
    config,
    recordCount,
    workingCount,
    activeMeasureLabel,
    workingMeasureSum,
    canAddRecord,
    canDeleteAll,
    onAddRecord,
    onDeleteAll,
    onDone,
    onClose,
  } = props;

  return (
    <div className={styles.header}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div className={styles.title}>Full records</div>
        <ContextPills selected={selected} config={config} />
        <div style={{ fontSize: 12, color: '#666', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>{recordCount} records in this cell.</span>
          <span>
            <b>Working:</b> {workingCount} | <b>{activeMeasureLabel}:</b> {formatNumberFullPrecision(workingMeasureSum)}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={onAddRecord} disabled={!canAddRecord}>Add record</button>
        <button onClick={onDeleteAll} disabled={!canDeleteAll}>
          Delete all
        </button>
        <button onClick={onDone}>Back to entry</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function NewDraftRow(props: {
  draft: RecordEntity;
  fields: FieldDef[];
  onChange: (next: RecordEntity) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { draft, fields, onChange, onSubmit, onCancel } = props;

  return (
    <tr key="__new__" data-record-row="1" style={{ background: 'rgba(79, 70, 229, 0.06)' }}>
      <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>
        <b>NEW</b>
      </td>
      <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>
        <span style={{ color: '#777' }}>(draft)</span>
      </td>
      {fields.map((f) => (
        <td key={f.key} style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px' }}>
          <CellEditor record={draft} field={f} onChange={onChange} />
        </td>
      ))}
      <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', display: 'flex', gap: 8 }}>
        <button
          onClick={onSubmit}
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.5)', color: 'var(--text)' }}
        >
          Add
        </button>
        <button
          onClick={onCancel}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}

function FullRecordRow(props: {
  record: RecordEntity;
  fields: FieldDef[];
  noteKey: string | null;
  uiPrefs: UiPrefsV1;
  isWorking: boolean;
  onToggleWorking: (event: MouseEvent<HTMLTableRowElement>) => void;
  onChange: (next: RecordEntity) => void;
  onDelete: (id: string) => void;
}) {
  const { record, fields, noteKey, uiPrefs, isWorking, onToggleWorking, onChange, onDelete } = props;

  return (
    <tr
      key={record.id}
      data-record-row="1"
      style={
        isWorking
          ? { background: rgbaFromHex(uiPrefs.workingGroupHighlightColor, 0.06) }
          : undefined
      }
      onMouseDown={onToggleWorking}
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
              background: rgbaFromHex(uiPrefs.workingGroupHighlightColor, 0.35),
              border: `1px solid ${rgbaFromHex(uiPrefs.workingGroupHighlightColor, 0.75)}`,
              display: 'inline-block',
            }}
          />
        ) : null}
      </td>

      <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px', whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {record.id}
          {(() => {
            const note = recordNoteValue(record, noteKey);
            return note ? (
              <span
                title={note}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: rgbaFromHex(uiPrefs.noteIndicatorColor, (uiPrefs.noteIndicatorIntensity * 0.3) / 100),
                  border: `1px solid ${rgbaFromHex(uiPrefs.noteIndicatorColor, (uiPrefs.noteIndicatorIntensity * 0.6) / 100)}`,
                  display: 'inline-block',
                }}
              />
            ) : null;
          })()}
        </span>
      </td>
      {fields.map((f) => (
        <td key={f.key} style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px' }}>
          <CellEditor record={record} field={f} onChange={onChange} />
        </td>
      ))}
      <td style={{ borderBottom: '1px solid #f1f1f1', padding: '6px 8px' }}>
        <button
          onClick={() => onDelete(record.id)}
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
}

export function FullRecordsPanel(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell | null;
  recordIds?: string[];
  uiPrefs: UiPrefsV1;
  onClose: () => void;
  onDone: () => void;
  onDatasetChange: (next: DatasetFileV1) => void;
}) {
  const { dataset, config, selected, recordIds: explicitRecordIds, uiPrefs, onClose, onDone, onDatasetChange } = props;

  const [newDraft, setNewDraft] = useState<RecordEntity | null>(null);
  const [workingIds, setWorkingIds] = useState<string[]>([]);
  const [workingAnchorId, setWorkingAnchorId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

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

  function persistRecords(updatedRecords: RecordEntity[]) {
    onDatasetChange(upsertRecords(dataset, updatedRecords));
  }

  function updateRecord(next: RecordEntity) {
    persistRecords([next]);
  }

  function submitNewDraft() {
    if (!newDraft) return;

    if (!hasAnyFiniteMeasureValue(dataset.schema, newDraft)) {
      window.alert('Cannot create a record without at least one measure value.');
      return;
    }

    persistRecords([assignPersistentRecordIdentity(newDraft)]);
    setNewDraft(null);
  }

  function addNewRecord() {
    if (!selected) return;
    const draft = createDraftRecordFromSelection({
      schema: dataset.schema,
      config,
      selected,
    });
    setNewDraft({ ...draft, id: '__new__' });
  }

  function deleteRecord(id: string) {
    const ok = window.confirm('Delete this record? This cannot be undone.');
    if (!ok) return;
    onDatasetChange(removeRecords(dataset, [id]));
  }

  function deleteAllRecords() {
    const targetIds = Array.from(new Set(records.map((r) => r.id)));
    if (targetIds.length === 0) return;

    const phrase = 'DELETE ALL';
    const typed = window.prompt(
      `This will permanently delete ALL ${targetIds.length} record(s) currently shown in Full Records.\n\nType "${phrase}" to confirm.`,
    );
    if (typed !== phrase) return;

    onDatasetChange(removeRecords(dataset, targetIds));
  }

  function handleBodyMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (e.ctrlKey || e.metaKey) return;
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const inRecordRow = Boolean(t.closest('tr[data-record-row="1"]'));
    if (inRecordRow) return;

    setWorkingIds([]);
  }

  function handleToggleWorking(recordId: string, event: MouseEvent<HTMLTableRowElement>) {
    const t = event.target;
    if (!(t instanceof HTMLElement)) return;
    const tag = t.tagName.toLowerCase();
    if (
      tag === 'input' ||
      tag === 'select' ||
      tag === 'textarea' ||
      tag === 'button' ||
      t.isContentEditable
    ) {
      return;
    }

    const idsInOrder = records.map((x) => x.id);

    if (event.shiftKey && workingAnchorId) {
      const a = idsInOrder.indexOf(workingAnchorId ?? '');
      const b = idsInOrder.indexOf(recordId);
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

    setWorkingAnchorId(recordId);
    setWorkingIds((prev) => {
      const set = new Set(prev);
      if (set.has(recordId)) set.delete(recordId);
      else set.add(recordId);
      return Array.from(set.values());
    });
  }

  return (
    <div className={styles.panel}>
      <FullRecordsHeader
        selected={selected}
        config={config}
        recordCount={records.length}
        workingCount={workingTotals.count}
        activeMeasureLabel={activeMeasureLabel}
        workingMeasureSum={workingTotals.sum}
        canAddRecord={Boolean(selected)}
        canDeleteAll={dataset.records.length > 0}
        onAddRecord={addNewRecord}
        onDeleteAll={deleteAllRecords}
        onDone={onDone}
        onClose={onClose}
      />

      <div className={styles.body} ref={wrapRef} onMouseDown={handleBodyMouseDown}>
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
                <NewDraftRow
                  draft={newDraft}
                  fields={fields}
                  onChange={setNewDraft}
                  onSubmit={submitNewDraft}
                  onCancel={() => setNewDraft(null)}
                />
              ) : null}

              {records.map((record) => (
                <FullRecordRow
                  key={record.id}
                  record={record}
                  fields={fields}
                  noteKey={noteKey}
                  uiPrefs={uiPrefs}
                  isWorking={workingSet.has(record.id)}
                  onToggleWorking={(event) => handleToggleWorking(record.id, event)}
                  onChange={updateRecord}
                  onDelete={deleteRecord}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
