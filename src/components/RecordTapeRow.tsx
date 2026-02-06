import type { RecordEntity } from '../domain/types';
import type { TapeFlag } from './RecordTapeRow.types';
import styles from './tapeLedger.module.css';
import { formatNumber } from '../domain/format';

export function RecordTapeRow(props: {
  record: RecordEntity;
  measures: string[];
  flags: TapeFlag[];
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
}) {
  const { record, measures, flags, onToggleFlag } = props;

  return (
    <tr>
      {measures.map((k) => {
        const v = record.data[k];
        const num = typeof v === 'number' && Number.isFinite(v) ? formatNumber(v) : v ? String(v) : '';
        return (
          <td key={k} className={styles.td}>
            {num || ''}
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
    </tr>
  );
}
