import { useMemo } from 'react';
import type { DatasetFileV1, PivotConfig, SelectedCell } from '../domain/types';
import { flagFields, getRecordsForCell } from '../domain/records';
import { formatNumber } from '../domain/format';
import styles from './entryPanel.module.css';

interface FlagAggregation {
  flagKey: string;
  label: string;
  whenTrue: number | null;
  whenFalse: number | null;
  countTrue: number;
  countFalse: number;
}

function computeFlagAggregations(
  dataset: DatasetFileV1,
  config: PivotConfig,
  selected: SelectedCell,
): FlagAggregation[] {
  const flags = flagFields(dataset.schema);
  const records = getRecordsForCell(dataset, selected);
  const measureKey = config.measureKey;

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

    return {
      flagKey: f.key,
      label: f.label,
      whenTrue: countTrue > 0 ? sumTrue : null,
      whenFalse: countFalse > 0 ? sumFalse : null,
      countTrue,
      countFalse,
    };
  });
}

export function BulkMetadataEdit(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell;
  onToggle: (flagKey: string, value: boolean) => void;
}) {
  const { dataset, config, selected, onToggle } = props;
  const aggregations = useMemo(
    () => computeFlagAggregations(dataset, config, selected),
    [dataset, config, selected],
  );

  if (aggregations.length === 0) return null;

  const measureLabel = dataset.schema.fields.find((f) => f.key === config.measureKey)?.label ?? config.measureKey;

  return (
    <div className={styles.section}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>
        Bulk flags (apply to all records in cell)
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {aggregations.map((agg) => (
          <div
            key={agg.flagKey}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 12,
              alignItems: 'center',
              padding: '8px 0',
              borderBottom: '1px solid var(--border2)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  onChange={(e) => onToggle(agg.flagKey, e.target.checked)}
                />
                <span style={{ fontWeight: 600 }}>{agg.label}</span>
              </label>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--muted)',
                  fontVariantNumeric: 'tabular-nums',
                  marginLeft: 24,
                }}
              >
                {agg.whenTrue !== null ? formatNumber(agg.whenTrue) : '—'}
                {' '}
                <span style={{ color: 'var(--muted)', opacity: 0.7 }}>({measureLabel} when true)</span>
                {' · '}
                {agg.whenFalse !== null ? formatNumber(agg.whenFalse) : '—'}
                {' '}
                <span style={{ color: 'var(--muted)', opacity: 0.7 }}>({measureLabel} when false)</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, marginTop: 10 }} className={styles.muted}>
        Checking/unchecking applies the value to every record currently contributing to the selected cell.
      </div>
    </div>
  );
}
