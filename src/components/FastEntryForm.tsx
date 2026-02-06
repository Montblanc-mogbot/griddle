import { useEffect, useMemo, useRef, useState } from 'react';
import type { DatasetSchema } from '../domain/types';
import { flagFields, measureFields } from '../domain/records';

export function FastEntryForm(props: {
  schema: DatasetSchema;
  onSubmit: (args: { measureValues: Record<string, number | ''>; flags: Record<string, boolean> }) => void;
}) {
  const { schema, onSubmit } = props;

  const measures = useMemo(() => measureFields(schema), [schema]);
  const flags = useMemo(() => flagFields(schema), [schema]);

  const [measureDrafts, setMeasureDrafts] = useState<Record<string, string>>({});
  const [flagDrafts, setFlagDrafts] = useState<Record<string, boolean>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Keep focus on first measure when measures change.
  useEffect(() => {
    const first = measures[0]?.key;
    if (first) inputRefs.current[first]?.focus();
  }, [measures]);

  function clearEntry() {
    setMeasureDrafts({});
    setFlagDrafts({});
    const first = measures[0]?.key;
    if (first) setTimeout(() => inputRefs.current[first]?.focus(), 0);
  }

  function submit() {
    const measureValues: Record<string, number | ''> = {};
    for (const m of measures) {
      const raw = (measureDrafts[m.key] ?? '').trim();
      if (raw === '') {
        measureValues[m.key] = '';
        continue;
      }
      const n = Number(raw);
      measureValues[m.key] = Number.isFinite(n) ? n : '';
    }

    const flagValues: Record<string, boolean> = {};
    for (const f of flags) flagValues[f.key] = Boolean(flagDrafts[f.key]);

    onSubmit({ measureValues, flags: flagValues });
    clearEntry();
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 10 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Fast entry</div>

      <div style={{ display: 'grid', gap: 8 }}>
        {measures.map((m, idx) => (
          <label key={m.key} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
            <div style={{ color: '#666', fontSize: 12, alignSelf: 'center' }}>{m.label}</div>
            <input
              ref={(el) => {
                inputRefs.current[m.key] = el;
              }}
              value={measureDrafts[m.key] ?? ''}
              onChange={(e) => setMeasureDrafts((p) => ({ ...p, [m.key]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();

                const isLast = idx === measures.length - 1;
                if (!isLast) {
                  const nextKey = measures[idx + 1]?.key;
                  if (nextKey) inputRefs.current[nextKey]?.focus();
                  return;
                }

                submit();
              }}
              placeholder="Type a number"
              inputMode="decimal"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            />
          </label>
        ))}

        {flags.length ? (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Metadata</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {flags.map((f) => (
                <label key={f.key} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(flagDrafts[f.key])}
                    onChange={(e) => setFlagDrafts((p) => ({ ...p, [f.key]: e.target.checked }))}
                  />
                  <span>{f.label}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={clearEntry} style={{ cursor: 'pointer' }}>
            Clear
          </button>
          <button onClick={submit} style={{ cursor: 'pointer' }}>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
