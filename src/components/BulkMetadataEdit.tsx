import type { DatasetSchema } from '../domain/types';
import { flagFields } from '../domain/records';

export function BulkMetadataEdit(props: {
  schema: DatasetSchema;
  onToggle: (flagKey: string, value: boolean) => void;
}) {
  const { schema, onToggle } = props;
  const flags = flagFields(schema);

  if (flags.length === 0) return null;

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Bulk metadata (this cell)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {flags.map((f) => (
          <label key={f.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" onChange={(e) => onToggle(f.key, e.target.checked)} />
            <span>{f.label}</span>
          </label>
        ))}
      </div>
      <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
        Checking/unchecking applies the value to every record currently contributing to the selected cell.
      </div>
    </div>
  );
}
