import type { DatasetFileV1, PivotConfig, SelectedCell } from '../domain/types';
import { dimensionKeysFromConfig } from '../domain/records';
import { formatNumber } from '../domain/format';
import styles from './entryPanel.module.css';

export function EntryHeader(props: {
  dataset: DatasetFileV1;
  config: PivotConfig;
  selected: SelectedCell;
}) {
  const { dataset, config, selected } = props;

  const dimKeys = dimensionKeysFromConfig(config);
  const implied = dimKeys
    .map((k) => ({
      key: k,
      label: dataset.schema.fields.find((f) => f.key === k)?.label ?? k,
      value: selected.row[k] ?? selected.col[k] ?? '',
    }))
    .filter((x) => x.value !== '');

  return (
    <div className={styles.section}>
      <div className={styles.headerTop}>
        <div style={{ fontWeight: 700 }}>Selection</div>
        <div className={styles.headerRight}>
          <div style={{ fontSize: 12 }} className={styles.muted}>
            Cell total ({config.measureKey})
          </div>
          <div style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
            {selected.cell.value === null ? '(empty)' : formatNumber(selected.cell.value)}
          </div>
          <div style={{ fontSize: 12 }} className={styles.muted}>
            Records: {selected.cell.recordIds.length}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 8, display: 'grid', gap: 2 }}>
        {implied.map((x) => (
          <div key={x.key} className={styles.kvRow}>
            <div className={styles.kLabel}>{x.label}:</div>
            <div className={styles.kValue}>{String(x.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
