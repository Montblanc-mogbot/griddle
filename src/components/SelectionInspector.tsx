import type { DatasetFileV1, RecordEntity, SelectedCell } from '../domain/types';

function recordById(records: RecordEntity[], id: string): RecordEntity | undefined {
  return records.find((r) => r.id === id);
}

export function SelectionInspector(props: {
  dataset: DatasetFileV1;
  selected: SelectedCell | null;
  onClose?: () => void;
}) {
  const { dataset, selected, onClose } = props;

  if (!selected) {
    return (
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 6,
          padding: 12,
          background: '#fff',
          minWidth: 360,
          maxWidth: 480,
          height: 'fit-content',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Selection</div>
        <div style={{ color: '#666' }}>Click a pivot cell to inspect what it represents.</div>
      </div>
    );
  }

  const { row, col, cell } = selected;
  const ids = cell.recordIds;

  const contributing: RecordEntity[] = ids
    .map((id) => recordById(dataset.records, id))
    .filter((r): r is RecordEntity => Boolean(r));

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 6,
        padding: 12,
        background: '#fff',
        minWidth: 360,
        maxWidth: 520,
        height: 'fit-content',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700 }}>Selection</div>
        {onClose ? (
          <button onClick={onClose} style={{ cursor: 'pointer' }}>
            Clear
          </button>
        ) : null}
      </div>

      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <section>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Cell</div>
          <div style={{ fontVariantNumeric: 'tabular-nums' }}>
            Value: <b>{cell.value === null ? '(empty)' : cell.value}</b>
          </div>
          <div style={{ color: '#666', fontSize: 12 }}>
            Records contributing: {ids.length}
          </div>
        </section>

        <section>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Row dimensions</div>
          <div style={{ display: 'grid', gap: 2 }}>
            {Object.entries(row).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#666' }}>{k}:</span> {String(v || '(blank)')}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Column dimensions</div>
          <div style={{ display: 'grid', gap: 2 }}>
            {Object.entries(col).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: '#666' }}>{k}:</span> {String(v || '(blank)')}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Contributing records</div>
          {ids.length === 0 ? (
            <div style={{ color: '#666' }}>(none)</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#666' }}>
                Showing up to 20 records (IDs + key/value data).
              </div>
              <div style={{ maxHeight: 420, overflow: 'auto', border: '1px solid #eee' }}>
                {contributing.slice(0, 20).map((r) => (
                  <details key={r.id} style={{ padding: '6px 8px', borderBottom: '1px solid #f2f2f2' }}>
                    <summary style={{ cursor: 'pointer' }}>
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{r.id}</span>
                    </summary>
                    <pre style={{ margin: 0, paddingTop: 6, overflow: 'auto' }}>
                      {JSON.stringify(r.data, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
