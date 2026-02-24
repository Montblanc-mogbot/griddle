import { useMemo, useState } from 'react';
import type { DatasetFileV1, FieldDef, PivotConfig, RecordEntity, SelectedCell } from '../domain/types';
import { formatNumber } from '../domain/format';
import { bulkSetMetadata, getRecordsForCell, upsertRecords } from '../domain/records';
import { flagFields, measureFields } from '../domain/records';

type Coverage = 'none' | 'some' | 'all';

function coverageLabel(c: Coverage): string {
  if (c === 'none') return 'none';
  if (c === 'all') return 'all';
  return 'some';
}

interface FlagAggregation {
  flagKey: string;
  label: string;
  whenTrue: number | null;
  whenFalse: number | null;
  countTrue: number;
  countFalse: number;
  coverage: Coverage;
}

function computeFlagAggregations(
  records: RecordEntity[],
  flags: ReturnType<typeof flagFields>,
  measureKey: string,
): FlagAggregation[] {
  return flags.map((f) => {
    let sumTrue = 0;
    let sumFalse = 0;
    let countTrue = 0;
    let countFalse = 0;

    for (const r of records) {
      const measureVal = r.data[measureKey];
      const val = typeof measureVal === 'number' && Number.isFinite(measureVal) ? measureVal : 0;

      if (r.data[f.key] === true) {
        sumTrue += val;
        countTrue++;
      } else {
        sumFalse += val;
        countFalse++;
      }
    }

    const coverage = countTrue === 0 ? 'none' : countTrue === records.length ? 'all' : 'some';

    return {
      flagKey: f.key,
      label: f.label,
      whenTrue: countTrue > 0 ? sumTrue : null,
      whenFalse: countFalse > 0 ? sumFalse : null,
      countTrue,
      countFalse,
      coverage,
    };
  });
}

function setRecordField(record: RecordEntity, field: FieldDef, value: unknown): RecordEntity {
  const nextData = { ...record.data };
  if (value === '' || value === null || value === undefined) delete nextData[field.key];
  else nextData[field.key] = value;

  return { ...record, updatedAt: new Date().toISOString(), data: nextData };
}

function bulkSetField(records: RecordEntity[], field: FieldDef, value: unknown): RecordEntity[] {
  return records.map((r) => setRecordField(r, field, value));
}

function bulkToggleBoolean(records: RecordEntity[], key: string): RecordEntity[] {
  return records.map((r) => {
    const next = !(r.data[key] === true);
    return {
      ...r,
      updatedAt: new Date().toISOString(),
      data: {
        ...r.data,
        [key]: next,
      },
    };
  });
}

function BulkFieldEditor(props: {
  field: FieldDef;
  records: RecordEntity[];
  isDimensionField: boolean;
  onApply: (value: unknown) => void;
  onClear: () => void;
}) {
  const { field, records, isDimensionField, onApply, onClear } = props;

  const [draft, setDraft] = useState('');

  const hint = isDimensionField ? 'Moves records to different cells' : undefined;

  if (field.type === 'boolean') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 800 }}>{field.label}</div>
            {hint ? <div style={{ fontSize: 12, color: '#a16207' }}>{hint}</div> : null}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onApply(true)}>Set true</button>
            <button onClick={() => onApply(false)}>Set false</button>
            <button onClick={() => onApply('__TOGGLE__')}>Toggle</button>
            <button onClick={onClear}>Clear</button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#666' }}>{records.length} records</div>
      </div>
    );
  }

  const options = field.enum ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 800 }}>{field.label}</div>
          {hint ? <div style={{ fontSize: 12, color: '#a16207' }}>{hint}</div> : null}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {options.length > 0 ? (
            <select value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="">(blank)</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : field.type === 'date' ? (
            <input type="date" value={draft} onChange={(e) => setDraft(e.target.value)} />
          ) : field.type === 'number' ? (
            <input type="number" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: 120 }} />
          ) : (
            <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} style={{ width: 180 }} />
          )}

          <button
            onClick={() => {
              if (field.type === 'number') {
                if (draft === '') return onApply('');
                const n = Number(draft);
                if (!Number.isFinite(n)) return;
                return onApply(n);
              }
              onApply(draft);
            }}
          >
            Apply
          </button>
          <button onClick={onClear}>Clear</button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#666' }}>{records.length} records</div>
    </div>
  );
}

export function BulkRangePanel(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell | null;
  recordIds: string[];
  cellCount: number;
  onClose: () => void;
  onGoToFullRecords: () => void;
  onDatasetChange: (next: DatasetFileV1) => void;
}) {
  const { dataset, config, selected, recordIds, cellCount, onClose, onGoToFullRecords, onDatasetChange } = props;

  const flags = flagFields(dataset.schema);
  const measures = new Set(measureFields(dataset.schema).map((f) => f.key));

  const idSet = useMemo(() => new Set(recordIds), [recordIds]);
  const records = useMemo(() => dataset.records.filter((r) => idSet.has(r.id)), [dataset.records, idSet]);

  const flagAggregations = useMemo(
    () => computeFlagAggregations(records, flags, config.measureKey),
    [records, flags, config.measureKey],
  );

  const otherFields = dataset.schema.fields.filter((f) => !measures.has(f.key) && !f.roles.includes('flag'));
  const dimKeys = new Set([...(selected ? Object.keys(selected.row) : []), ...(selected ? Object.keys(selected.col) : [])]);

  const currentMeasure = dataset.schema.fields.find((f) => f.key === config.measureKey);
  const currentTotal = useMemo(() => {
    if (!config.measureKey) return null;
    let sum = 0;
    let any = false;
    for (const r of records) {
      const v = r.data[config.measureKey];
      if (typeof v === 'number' && Number.isFinite(v)) {
        sum += v;
        any = true;
      }
    }
    return any ? sum : null;
  }, [records, config.measureKey]);

  return (
    <div style={{ padding: 12, display: 'grid', gap: 12 }} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <div style={{ fontWeight: 900 }}>Bulk edit</div>

          {currentMeasure && currentTotal !== null ? (
            <div
              style={{
                fontSize: 18,
                fontWeight: 950,
                letterSpacing: -0.2,
                color: 'var(--text)',
              }}
            >
              Total ({currentMeasure.label}): {formatNumber(currentTotal)}
            </div>
          ) : null}

          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {cellCount} cells selected • {records.length} records affected
          </div>
        </div>
        <button onClick={onClose}>Close</button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Range selection = bulk edit. Single cell = Entry.</div>

      <div style={{ display: 'flex', gap: 8, marginTop: -8 }}>
        <button onClick={onGoToFullRecords}>Full records…</button>
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Metadata (flags)</div>

        {flagAggregations.length === 0 ? (
          <div style={{ color: '#666' }}>(no flag fields)</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {flagAggregations.map((agg) => (
              <div
                key={agg.flagKey}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 10,
                  padding: 10,
                  display: 'grid',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{agg.label}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Coverage: {coverageLabel(agg.coverage)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        const updated = bulkSetMetadata(records, agg.flagKey, true);
                        onDatasetChange(upsertRecords(dataset, updated));
                      }}
                    >
                      Set ON
                    </button>
                    <button
                      onClick={() => {
                        const updated = bulkSetMetadata(records, agg.flagKey, false);
                        onDatasetChange(upsertRecords(dataset, updated));
                      }}
                    >
                      Set OFF
                    </button>
                    <button
                      onClick={() => {
                        const updated = bulkToggleBoolean(records, agg.flagKey);
                        onDatasetChange(upsertRecords(dataset, updated));
                      }}
                    >
                      Toggle
                    </button>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--muted)',
                    fontVariantNumeric: 'tabular-nums',
                    paddingTop: 4,
                    borderTop: '1px solid var(--border2)',
                  }}
                >
                  {currentMeasure?.label ?? 'Value'} {agg.whenTrue !== null ? formatNumber(agg.whenTrue) : '—'} ({agg.whenFalse !== null ? formatNumber(agg.whenFalse) : '—'})
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: 10 }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Other fields</div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 10 }}>
          These apply to all affected records. Dimension fields are marked because they move records to different cells.
        </div>

        {otherFields.length === 0 ? (
          <div style={{ color: '#666' }}>(no editable non-measure fields)</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {otherFields.map((f) => {
              const isDim = dimKeys.has(f.key);
              return (
                <div key={f.key} style={{ border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
                  <BulkFieldEditor
                    field={f}
                    records={records}
                    isDimensionField={isDim}
                    onApply={(value) => {
                      if (value === '__TOGGLE__') {
                        const updated = bulkToggleBoolean(records, f.key);
                        onDatasetChange(upsertRecords(dataset, updated));
                        return;
                      }
                      const updated = bulkSetField(records, f, value);
                      onDatasetChange(upsertRecords(dataset, updated));
                    }}
                    onClear={() => {
                      const updated = bulkSetField(records, f, '');
                      onDatasetChange(upsertRecords(dataset, updated));
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected ? (
        <div style={{ fontSize: 12, color: '#666' }}>
          Single-cell records in view: {getRecordsForCell(dataset, selected).length}
        </div>
      ) : null}
    </div>
  );
}
