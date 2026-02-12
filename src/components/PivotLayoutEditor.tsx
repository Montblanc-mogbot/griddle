import { useMemo, useState } from 'react';
import type { DatasetSchema, PivotConfig } from '../domain/types';

function byKey(schema: DatasetSchema): Map<string, { key: string; label: string }> {
  return new Map(schema.fields.map((f) => [f.key, { key: f.key, label: f.label }] as const));
}

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

function uniq<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}

function Section(props: {
  title: string;
  subtitle?: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (next: string[]) => void;
  allowAdd: boolean;
}) {
  const { title, subtitle, options, values, onChange, allowAdd } = props;
  const [pending, setPending] = useState('');

  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
      <div>
        <div style={{ fontWeight: 900 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>{subtitle}</div> : null}
      </div>

      {allowAdd ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={pending} onChange={(e) => setPending(e.target.value)} style={{ flex: 1 }}>
            <option value="">Add field…</option>
            {options
              .filter((o) => !values.includes(o.value))
              .map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
          </select>
          <button
            onClick={() => {
              if (!pending) return;
              onChange([...values, pending]);
              setPending('');
            }}
            disabled={!pending}
          >
            Add
          </button>
        </div>
      ) : null}

      <div style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)', padding: 8 }}>
        {values.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>(none)</div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {values.map((k, idx) => {
              const opt = options.find((o) => o.value === k);
              return (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 8,
                    border: '1px solid var(--border2)',
                    background: 'var(--surface2)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800 }}>{opt?.label ?? k}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k}</div>
                  </div>

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button onClick={() => idx > 0 && onChange(move(values, idx, idx - 1))} disabled={idx === 0}>
                      ↑
                    </button>
                    <button
                      onClick={() => idx < values.length - 1 && onChange(move(values, idx, idx + 1))}
                      disabled={idx === values.length - 1}
                    >
                      ↓
                    </button>
                    <button onClick={() => onChange(values.filter((x) => x !== k))}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function PivotLayoutEditor(props: {
  schema: DatasetSchema;
  config: PivotConfig;
  onChange: (cfg: PivotConfig) => void;
}) {
  const { schema, config, onChange } = props;

  const dimFields = useMemo(
    () => schema.fields.filter((f) => !f.roles.includes('measure') && !f.roles.includes('flag')),
    [schema.fields],
  );

  const dimOptions = dimFields.map((f) => ({ value: f.key, label: f.label }));
  const measureOptions = schema.fields.filter((f) => f.roles.includes('measure')).map((f) => ({ value: f.key, label: f.label }));

  const keyMap = useMemo(() => byKey(schema), [schema]);

  function removeAll(xs: string[], remove: Set<string>): string[] {
    return xs.filter((x) => !remove.has(x));
  }

  function setFilters(keys: string[]) {
    const next = uniq(keys);
    const moved = new Set(next);
    onChange({
      ...config,
      slicerKeys: next,
      rowKeys: removeAll(config.rowKeys, moved),
      colKeys: removeAll(config.colKeys, moved),
    });
  }

  function setRows(keys: string[]) {
    const next = uniq(keys);
    const moved = new Set(next);
    onChange({
      ...config,
      rowKeys: next,
      slicerKeys: removeAll(config.slicerKeys, moved),
      colKeys: removeAll(config.colKeys, moved),
    });
  }

  function setCols(keys: string[]) {
    const next = uniq(keys);
    const moved = new Set(next);
    onChange({
      ...config,
      colKeys: next,
      slicerKeys: removeAll(config.slicerKeys, moved),
      rowKeys: removeAll(config.rowKeys, moved),
    });
  }

  const chosenDims = new Set([...config.slicerKeys, ...config.rowKeys, ...config.colKeys]);
  const dimOptionsAll = dimOptions;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        Choose which fields appear on each axis. <b>Filters</b> are dimensions not pivoted, but still available in the filter popup.
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Section
          title="Filters"
          subtitle="Filter-only dimensions"
          options={dimOptionsAll}
          values={config.slicerKeys}
          onChange={setFilters}
          allowAdd
        />

        <Section
          title="Rows"
          subtitle="Row dimensions (order matters)"
          options={dimOptionsAll}
          values={config.rowKeys}
          onChange={setRows}
          allowAdd
        />

        <Section
          title="Columns"
          subtitle="Column dimensions (order matters)"
          options={dimOptionsAll}
          values={config.colKeys}
          onChange={setCols}
          allowAdd
        />

        <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
          <div>
            <div style={{ fontWeight: 900 }}>Measures</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Choose the active measure</div>
          </div>

          <select value={config.measureKey} onChange={(e) => onChange({ ...config, measureKey: e.target.value })}>
            {measureOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Dimensions chosen: {Array.from(chosenDims).map((k) => keyMap.get(k)?.label ?? k).join(', ') || '(none)'}
          </div>
        </div>
      </div>
    </div>
  );
}
