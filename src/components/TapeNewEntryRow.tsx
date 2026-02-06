import { useEffect, useMemo, useRef, useState } from 'react';
import type { DatasetSchema } from '../domain/types';
import { flagFields, measureFields } from '../domain/records';
import styles from './tapeLedger.module.css';

export function TapeNewEntryRow(props: {
  schema: DatasetSchema;
  onSubmit: (args: { measureValues: Record<string, number | ''>; flags: Record<string, boolean> }) => void;
}) {
  const { schema, onSubmit } = props;

  const measures = useMemo(() => measureFields(schema), [schema]);
  const flags = useMemo(() => flagFields(schema), [schema]);

  const [measureDrafts, setMeasureDrafts] = useState<Record<string, string>>({});
  const [flagDrafts, setFlagDrafts] = useState<Record<string, boolean>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function clearAndFocusFirst() {
    setMeasureDrafts({});
    setFlagDrafts({});
    const first = measures[0]?.key;
    if (first) setTimeout(() => inputRefs.current[first]?.focus(), 0);
  }

  useEffect(() => {
    const first = measures[0]?.key;
    if (first) inputRefs.current[first]?.focus();
  }, [measures]);

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
    clearAndFocusFirst();
  }

  return (
    <tr className={styles.newEntryRow}>
      {measures.map((m, idx) => (
        <td key={m.key} className={styles.td}>
          <input
            ref={(el) => {
              inputRefs.current[m.key] = el;
            }}
            className={styles.newEntryInput}
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
            inputMode="decimal"
          />
        </td>
      ))}

      {flags.map((f) => (
        <td key={f.key} className={`${styles.td} ${styles.flagsCell}`}>
          <input
            type="checkbox"
            checked={Boolean(flagDrafts[f.key])}
            onChange={(e) => setFlagDrafts((p) => ({ ...p, [f.key]: e.target.checked }))}
          />
        </td>
      ))}
    </tr>
  );
}
