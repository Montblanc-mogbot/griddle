import { useEffect, useMemo, useRef, useState } from 'react';
import type { DatasetSchema, FieldDef } from '../domain/types';
import { flagFields, measureFields } from '../domain/records';
import styles from './tapeLedger.module.css';

function detailsFields(schema: DatasetSchema): FieldDef[] {
  return schema.fields
    .filter(
      (f) =>
        Boolean(f.entry?.showInFastEntry) &&
        !f.roles.includes('measure') &&
        !f.roles.includes('flag'),
    )
    .slice()
    .sort((a, b) => (a.entry?.order ?? 0) - (b.entry?.order ?? 0));
}

export function TapeNewEntryRow(props: {
  schema: DatasetSchema;
  hasNoteColumn: boolean;
  /** changes when the user selects a new grid cell / opens entry panel; used to re-trigger autofocus */
  focusSeed?: string | number;
  onSubmit: (args: {
    measureValues: Record<string, number | ''>;
    flags: Record<string, boolean>;
    details?: Record<string, unknown>;
  }) => void;
}) {
  const { schema, hasNoteColumn, focusSeed, onSubmit } = props;

  const details = useMemo(() => detailsFields(schema), [schema]);
  const measures = useMemo(() => measureFields(schema), [schema]);
  const flags = useMemo(() => flagFields(schema), [schema]);

  const [detailDrafts, setDetailDrafts] = useState<Record<string, string>>({});
  const [measureDrafts, setMeasureDrafts] = useState<Record<string, string>>({});
  const [flagDrafts, setFlagDrafts] = useState<Record<string, boolean>>({});

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function clearAndFocusFirst() {
    setDetailDrafts({});
    setMeasureDrafts({});
    setFlagDrafts({});
    const first = details[0]?.key ?? measures[0]?.key;
    if (first) setTimeout(() => inputRefs.current[first]?.focus(), 0);
  }

  useEffect(() => {
    const first = details[0]?.key ?? measures[0]?.key;
    if (!first) return;

    // Focus can race with drawer/modal animations; defer one tick.
    const id = window.requestAnimationFrame(() => inputRefs.current[first]?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [details, measures, focusSeed]);

  function submit() {
    const detailsValues: Record<string, unknown> = {};
    for (const d of details) {
      const raw = (detailDrafts[d.key] ?? '').trim();
      if (raw !== '') detailsValues[d.key] = raw;
    }

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

    onSubmit({ measureValues, flags: flagValues, details: detailsValues });
    clearAndFocusFirst();
  }

  const detailCount = details.length;
  const measureCount = measures.length;
  const totalEditable = detailCount + measureCount;

  return (
    <tr className={styles.newEntryRow}>
      {hasNoteColumn ? (
        <td className={`${styles.td} ${styles.noteCell}`} />
      ) : null}
      {details.map((d, idx) => (
        <td key={d.key} className={styles.td}>
          <input
            ref={(el) => {
              inputRefs.current[d.key] = el;
            }}
            className={styles.newEntryInput}
            value={detailDrafts[d.key] ?? ''}
            onChange={(e) => setDetailDrafts((p) => ({ ...p, [d.key]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();

              const isLast = idx === totalEditable - 1;
              if (!isLast) {
                const nextKey = details[idx + 1]?.key ?? measures[0]?.key;
                if (nextKey) inputRefs.current[nextKey]?.focus();
                return;
              }
              submit();
            }}
          />
        </td>
      ))}

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

              const globalIdx = detailCount + idx;
              const isLast = globalIdx === totalEditable - 1;
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
