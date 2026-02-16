import type { RecordEntity } from '../domain/types';
import type { TapeFlag } from './RecordTapeRow.types';
import styles from './tapeLedger.module.css';
import { formatNumber } from '../domain/format';

export function RecordTapeRow(props: {
  record: RecordEntity;
  measures: string[];
  flags: TapeFlag[];
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
  onUpdateMeasure: (measureKey: string, value: number | '' ) => void;
}) {
  const { record, measures, flags, onToggleFlag, onUpdateMeasure } = props;

  return (
    <>
      {measures.map((k) => {
        const v = record.data[k];
        const sv = v === null || v === undefined ? '' : String(v);
        const display = typeof v === 'number' && Number.isFinite(v) ? formatNumber(v) : sv;

        return (
          <td key={k} className={styles.td}>
            <input
              type="number"
              defaultValue={sv}
              title={display}
              onBlur={(e) => {
                const raw = e.target.value;
                if (raw === '') return onUpdateMeasure(k, '');
                const n = Number(raw);
                if (!Number.isFinite(n)) return;
                onUpdateMeasure(k, n);
              }}
              className={styles.measureInput}
            />
          </td>
        );
      })}

      {flags.map((f) => (
        <td key={f.key} className={`${styles.td} ${styles.flagsCell}`}>
          <input
            type="checkbox"
            checked={Boolean(record.data[f.key])}
            onChange={(e) => onToggleFlag(record.id, f.key, e.target.checked)}
          />
        </td>
      ))}
    </>
  );
}

