import type { RecordEntity } from '../domain/types';
import type { TapeFlag } from './RecordTapeRow.types';
import { getNumber } from './RecordTapeRow.types';

export function RecordTapeRow(props: {
  record: RecordEntity;
  measures: string[];
  flags: TapeFlag[];
  onToggleFlag: (recordId: string, flagKey: string, value: boolean) => void;
}) {
  const { record, measures, flags, onToggleFlag } = props;

  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {measures.map((k) => (
            <div key={k} style={{ fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: '#666', fontSize: 12 }}>{k}:</span>{' '}
              <b>{getNumber(record, k) || '-'}</b>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#999' }}>{record.id}</div>
      </div>

      {flags.length ? (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {flags.map((f) => (
            <label key={f.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={Boolean(record.data[f.key])}
                onChange={(e) => onToggleFlag(record.id, f.key, e.target.checked)}
              />
              <span style={{ fontSize: 12 }}>{f.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
