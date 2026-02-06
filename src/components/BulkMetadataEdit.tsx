import type { DatasetSchema } from '../domain/types';
import { flagFields } from '../domain/records';
import styles from './entryPanel.module.css';

export function BulkMetadataEdit(props: {
  schema: DatasetSchema;
  onToggle: (flagKey: string, value: boolean) => void;
}) {
  const { schema, onToggle } = props;
  const flags = flagFields(schema);

  if (flags.length === 0) return null;

  return (
    <div className={styles.section}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Bulk flags (apply to all records in cell)</div>
      <div className={styles.bulkFlags}>
        {flags.map((f) => (
          <label key={f.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" onChange={(e) => onToggle(f.key, e.target.checked)} />
            <span>{f.label}</span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 12, marginTop: 6 }} className={styles.muted}>
        Checking/unchecking applies the value to every record currently contributing to the selected cell.
      </div>
    </div>
  );
}
