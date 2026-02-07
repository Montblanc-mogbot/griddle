import { useEffect, useMemo, useRef, useState } from 'react';
import type { DatasetSchema, PivotConfig, RecordEntity } from '../domain/types';

function fieldsByRole(schema: DatasetSchema, role: string) {
  return schema.fields.filter((f) => f.roles.includes(role as never));
}

function asLabel(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(blank)';
  return String(v);
}

function MultiSelect(props: {
  label: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const { label, options, values, onChange } = props;

  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 12, color: '#444' }}>{label}</div>
      <select
        multiple
        value={values}
        onChange={(e) => {
          const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
          onChange(selected);
        }}
        style={{ minWidth: 200, minHeight: 72 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function uniqValues(records: RecordEntity[], key: string, limit = 200): string[] {
  const set = new Set<string>();
  for (const r of records) {
    const v = r.data[key];
    if (v === null || v === undefined || v === '') continue;
    set.add(String(v));
    if (set.size >= limit) break;
  }
  return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
}

export function PivotControls(props: {
  schema: DatasetSchema;
  records: RecordEntity[];
  config: PivotConfig;
  onChange: (cfg: PivotConfig) => void;
  showRowsColsMeasure?: boolean;
  showSlicers?: boolean;
  showRowFilters?: boolean;
}) {
  const {
    schema,
    records,
    config,
    onChange,
    showRowsColsMeasure = true,
    showSlicers = true,
    showRowFilters = true,
  } = props;

  const [rowFilterOpen, setRowFilterOpen] = useState(false);
  const [rowFilterPos, setRowFilterPos] = useState<{ left: number; top: number } | null>(null);
  const rowFilterBtnRef = useRef<HTMLButtonElement | null>(null);
  const [activeRowFilterKey, setActiveRowFilterKey] = useState<string | null>(null);
  const [rowFilterSearch, setRowFilterSearch] = useState('');

  const dimOptions = schema.fields
    .filter((f) => f.roles.some((r) => r === 'rowDim' || r === 'colDim' || r === 'slicer'))
    .filter((f) => !f.roles.includes('measure') && !f.roles.includes('flag'))
    .map((f) => ({ value: f.key, label: f.label }));

  const rowFilterKeys = config.rowKeys;
  const rowFilterFieldByKey = new Map(
    schema.fields.map((f) => [f.key, f] as const),
  );

  const rowFiltersActiveCount = Object.values(config.rowFilters ?? {}).filter(
    (v) => Array.isArray(v) && v.length > 0,
  ).length;

  const measureOptions = fieldsByRole(schema, 'measure').map((f) => ({
    value: f.key,
    label: f.label,
  }));

  // Any non-measure/non-flag field can act as a slicer (including current row/col dims).
  const slicerFields = schema.fields.filter(
    (f) => !f.roles.includes('measure') && !f.roles.includes('flag'),
  );

  const slicerOptions = slicerFields.map((f) => ({ value: f.key, label: f.label }));

  const [activeSlicerKey, setActiveSlicerKey] = useState<string | null>(null);
  const [slicerSearch, setSlicerSearch] = useState('');
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [popoverPos, setPopoverPos] = useState<{ left: number; top: number } | null>(null);

  const activeSlicerField = useMemo(
    () => slicerFields.find((f) => f.key === activeSlicerKey) ?? null,
    [slicerFields, activeSlicerKey],
  );

  const activeOptions = useMemo(() => {
    if (!activeSlicerField) return [];
    const key = activeSlicerField.key;
    const vals = activeSlicerField.enum ?? uniqValues(records, key);
    const q = slicerSearch.trim().toLowerCase();
    const filtered = q ? vals.filter((v) => String(v).toLowerCase().includes(q)) : vals;
    return filtered.map((v) => ({ value: String(v), label: asLabel(v) }));
  }, [activeSlicerField, records, slicerSearch]);

  const activeSelected = useMemo(() => {
    if (!activeSlicerKey) return [];
    const desired = config.slicers[activeSlicerKey];
    return Array.isArray(desired) ? desired.map(String) : desired ? [String(desired)] : [];
  }, [config.slicers, activeSlicerKey]);

  useEffect(() => {
    if (!activeSlicerKey) return;
    const el = chipRefs.current[activeSlicerKey];
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPopoverPos({ left: r.left, top: r.bottom + 6 });
  }, [activeSlicerKey]);

  useEffect(() => {
    if (!rowFilterOpen) return;
    const el = rowFilterBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRowFilterPos({ left: r.left, top: r.bottom + 6 });
  }, [rowFilterOpen]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const t = e.target;
      if (!(t instanceof Node)) return;

      if (activeSlicerKey) {
        const chip = chipRefs.current[activeSlicerKey];
        if (chip && chip.contains(t)) return;
        const pop = document.getElementById('griddle-slicer-popover');
        if (pop && pop.contains(t)) return;
        setActiveSlicerKey(null);
      }

      if (rowFilterOpen) {
        const btn = rowFilterBtnRef.current;
        if (btn && btn.contains(t)) return;
        const pop = document.getElementById('griddle-rowfilter-popover');
        if (pop && pop.contains(t)) return;
        setRowFilterOpen(false);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setActiveSlicerKey(null);
        setRowFilterOpen(false);
      }
    }

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeSlicerKey, rowFilterOpen]);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {showRowsColsMeasure ? (
        <>
          <MultiSelect
            label="Rows"
            options={dimOptions}
            values={config.rowKeys}
            onChange={(rowKeys) => {
              const nextRowFilters = Object.fromEntries(
                Object.entries(config.rowFilters ?? {}).filter(([k]) => rowKeys.includes(k)),
              );
              setActiveRowFilterKey((prev) => (prev && rowKeys.includes(prev) ? prev : null));
              onChange({ ...config, rowKeys, rowFilters: nextRowFilters });
            }}
          />

          <MultiSelect
            label="Columns"
            options={dimOptions}
            values={config.colKeys}
            onChange={(colKeys) => onChange({ ...config, colKeys })}
          />

          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, color: '#444' }}>Measure</div>
            <select
              value={config.measureKey}
              onChange={(e) => onChange({ ...config, measureKey: e.target.value })}
              style={{ minWidth: 220 }}
            >
              {measureOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      {showRowFilters ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 12, color: '#444' }}>Row filters</div>
          <button
            ref={rowFilterBtnRef}
            onClick={() => {
              setRowFilterSearch('');
              setRowFilterOpen((s) => !s);
              if (!activeRowFilterKey) setActiveRowFilterKey(config.rowKeys[0] ?? null);
            }}
            style={{ padding: '8px 10px', borderRadius: 10, fontSize: 12, whiteSpace: 'nowrap' }}
          >
            Configure{rowFiltersActiveCount > 0 ? ` (${rowFiltersActiveCount})` : ''}…
          </button>

          {rowFilterOpen && rowFilterPos ? (
            <div
              id="griddle-rowfilter-popover"
              style={{
                position: 'fixed',
                left: rowFilterPos.left,
                top: rowFilterPos.top,
                width: 420,
                maxHeight: 420,
                overflow: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow)',
                padding: 10,
                zIndex: 60,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>Row filters</div>
                <button onClick={() => setRowFilterOpen(false)} style={{ padding: '4px 8px', fontSize: 12 }}>
                  Close
                </button>
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                {rowFilterKeys.map((k) => {
                  const field = rowFilterFieldByKey.get(k);
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setRowFilterSearch('');
                        setActiveRowFilterKey(k);
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 999,
                        border: '1px solid var(--border)',
                        background: activeRowFilterKey === k ? 'var(--accentSoft)' : 'var(--surface2)',
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      {field?.label ?? k}
                    </button>
                  );
                })}
              </div>

              {activeRowFilterKey ? (() => {
                const field = rowFilterFieldByKey.get(activeRowFilterKey);
                if (!field) return null;
                const allVals = (field.enum ?? uniqValues(records, activeRowFilterKey)).map(String);
                const q = rowFilterSearch.trim().toLowerCase();
                const shownVals = q ? allVals.filter((v) => v.toLowerCase().includes(q)) : allVals;
                const selected = (config.rowFilters?.[activeRowFilterKey] ?? []).map(String);
                const selectedSet = new Set(selected);

                return (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontWeight: 800 }}>{field.label}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => {
                            onChange({
                              ...config,
                              rowFilters: {
                                ...(config.rowFilters ?? {}),
                                [activeRowFilterKey]: allVals,
                              },
                            });
                          }}
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                          Select all
                        </button>
                        <button
                          onClick={() => {
                            onChange({
                              ...config,
                              rowFilters: {
                                ...(config.rowFilters ?? {}),
                                [activeRowFilterKey]: [],
                              },
                            });
                          }}
                          style={{ padding: '6px 10px', fontSize: 12 }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <input
                      value={rowFilterSearch}
                      onChange={(e) => setRowFilterSearch(e.target.value)}
                      placeholder="Search values…"
                      style={{ width: '100%', marginTop: 8, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }}
                    />

                    <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                      {shownVals.map((v) => {
                        const effectiveChecked = selected.length === 0 ? true : selectedSet.has(v);
                        return (
                          <label key={v} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                            <input
                              type="checkbox"
                              checked={effectiveChecked}
                              onChange={() => {
                                let next: string[];
                                if (selected.length === 0) next = allVals.slice();
                                else next = selected.slice();

                                const idx = next.indexOf(v);
                                if (idx >= 0) next.splice(idx, 1);
                                else next.push(v);

                                onChange({
                                  ...config,
                                  rowFilters: {
                                    ...(config.rowFilters ?? {}),
                                    [activeRowFilterKey]: next,
                                  },
                                });
                              }}
                            />
                            <span>{asLabel(v)}</span>
                          </label>
                        );
                      })}

                      {shownVals.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: 12 }}>(no matches)</div> : null}
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                      Current: {selected.length === 0 ? 'All' : `${selected.length} selected`}
                    </div>
                  </div>
                );
              })() : (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>(no row dims selected)</div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {showSlicers ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
          <MultiSelect
            label="Slicers"
            options={slicerOptions}
            values={config.slicerKeys}
            onChange={(slicerKeys) => {
              const nextSlicers = Object.fromEntries(
                Object.entries(config.slicers).filter(([k]) => slicerKeys.includes(k)),
              );
              setActiveSlicerKey(null);
              setSlicerSearch('');
              onChange({ ...config, slicerKeys, slicers: nextSlicers });
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'nowrap',
              overflowX: 'auto',
              maxWidth: 520,
              paddingBottom: 2,
              minHeight: 34,
              alignItems: 'center',
            }}
          >
            {config.slicerKeys.map((k) => {
              const field = slicerFields.find((f) => f.key === k);
              if (!field) return null;

              const desired = config.slicers[k];
              const values = Array.isArray(desired) ? desired.map(String) : desired ? [String(desired)] : [];
              const label =
                values.length === 0
                  ? 'All'
                  : values.length <= 2
                    ? values.join(', ')
                    : `${values.length} selected`;

              return (
                <button
                  key={k}
                  ref={(el) => {
                    chipRefs.current[k] = el;
                  }}
                  onClick={() => {
                    setSlicerSearch('');
                    setActiveSlicerKey((prev) => (prev === k ? null : k));
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'var(--surface2)',
                    boxShadow: activeSlicerKey === k ? 'inset 0 0 0 2px var(--accent)' : 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                    maxWidth: 220,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={`${field.label}: ${label}`}
                >
                  <span style={{ color: 'var(--muted)' }}>{field.label}:</span>
                  <span>{label}</span>
                </button>
              );
            })}

            {config.slicerKeys.length > 0 ? (
              <button
                onClick={() => {
                  const cleared = Object.fromEntries(config.slicerKeys.map((k) => [k, []]));
                  onChange({ ...config, slicers: { ...config.slicers, ...cleared } });
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flex: '0 0 auto',
                  color: 'var(--text)',
                }}
              >
                Clear
              </button>
            ) : null}
          </div>

          {activeSlicerField && popoverPos ? (
            <div
              id="griddle-slicer-popover"
              style={{
                position: 'fixed',
                left: popoverPos.left,
                top: popoverPos.top,
                width: 320,
                maxHeight: 360,
                overflow: 'auto',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                boxShadow: 'var(--shadow)',
                padding: 10,
                zIndex: 50,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{activeSlicerField.label}</div>
                <button
                  onClick={() => setActiveSlicerKey(null)}
                  style={{ padding: '4px 8px', borderRadius: 8, fontSize: 12 }}
                >
                  Close
                </button>
              </div>

              <input
                value={slicerSearch}
                onChange={(e) => setSlicerSearch(e.target.value)}
                placeholder="Search…"
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '6px 8px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  color: 'var(--text)',
                }}
              />

              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    const all = (activeSlicerField.enum ?? uniqValues(records, activeSlicerField.key)).map(String);
                    onChange({ ...config, slicers: { ...config.slicers, [activeSlicerField.key]: all } });
                  }}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12 }}
                >
                  Select all
                </button>
                <button
                  onClick={() => {
                    onChange({ ...config, slicers: { ...config.slicers, [activeSlicerField.key]: [] } });
                  }}
                  style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12 }}
                >
                  Clear
                </button>
              </div>

              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {activeOptions.map((o) => {
                  const checked = activeSelected.includes(o.value);
                  return (
                    <label key={o.value} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? activeSelected.filter((v) => v !== o.value)
                            : [...activeSelected, o.value];
                          onChange({
                            ...config,
                            slicers: {
                              ...config.slicers,
                              [activeSlicerField.key]: next,
                            },
                          });
                        }}
                      />
                      <span>{o.label}</span>
                    </label>
                  );
                })}

                {activeOptions.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: 12 }}>(no matches)</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <MultiSelect
        label="Columns"
        options={dimOptions}
        values={config.colKeys}
        onChange={(colKeys) => onChange({ ...config, colKeys })}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
        <MultiSelect
          label="Slicers"
          options={slicerOptions}
          values={config.slicerKeys}
          onChange={(slicerKeys) => {
            // Keep existing slicer values for still-selected keys.
            const nextSlicers = Object.fromEntries(
              Object.entries(config.slicers).filter(([k]) => slicerKeys.includes(k)),
            );
            setActiveSlicerKey(null);
            setSlicerSearch('');
            onChange({ ...config, slicerKeys, slicers: nextSlicers });
          }}
        />

        {/* Reserve space for chip row to keep toolbar height stable */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'nowrap',
            overflowX: 'auto',
            maxWidth: 520,
            paddingBottom: 2,
            minHeight: 34,
            alignItems: 'center',
          }}
        >
          {config.slicerKeys.map((k) => {
            const field = slicerFields.find((f) => f.key === k);
            if (!field) return null;

            const desired = config.slicers[k];
            const values = Array.isArray(desired) ? desired.map(String) : desired ? [String(desired)] : [];
            const label =
              values.length === 0
                ? 'All'
                : values.length <= 2
                  ? values.join(', ')
                  : `${values.length} selected`;

            return (
              <button
                key={k}
                ref={(el) => {
                  chipRefs.current[k] = el;
                }}
                onClick={() => {
                  setSlicerSearch('');
                  setActiveSlicerKey((prev) => (prev === k ? null : k));
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  boxShadow: activeSlicerKey === k ? 'inset 0 0 0 2px var(--accent)' : 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={`${field.label}: ${label}`}
              >
                <span style={{ color: 'var(--muted)' }}>{field.label}:</span>
                <span>{label}</span>
              </button>
            );
          })}

          {config.slicerKeys.length > 0 ? (
            <button
              onClick={() => {
                const cleared = Object.fromEntries(config.slicerKeys.map((k) => [k, []]));
                onChange({ ...config, slicers: { ...config.slicers, ...cleared } });
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                flex: '0 0 auto',
              }}
            >
              Clear
            </button>
          ) : null}
        </div>

        {activeSlicerField && popoverPos ? (
          <div
            id="griddle-slicer-popover"
            style={{
              position: 'fixed',
              left: popoverPos.left,
              top: popoverPos.top,
              width: 320,
              maxHeight: 360,
              overflow: 'auto',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: 'var(--shadow)',
              padding: 10,
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{activeSlicerField.label}</div>
              <button
                onClick={() => setActiveSlicerKey(null)}
                style={{ padding: '4px 8px', borderRadius: 8, fontSize: 12 }}
              >
                Close
              </button>
            </div>

            <input
              value={slicerSearch}
              onChange={(e) => setSlicerSearch(e.target.value)}
              placeholder="Search…"
              style={{
                width: '100%',
                marginTop: 8,
                padding: '6px 8px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            />

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => {
                  const all = (activeSlicerField.enum ?? uniqValues(records, activeSlicerField.key)).map(String);
                  onChange({ ...config, slicers: { ...config.slicers, [activeSlicerField.key]: all } });
                }}
                style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12 }}
              >
                Select all
              </button>
              <button
                onClick={() => {
                  onChange({ ...config, slicers: { ...config.slicers, [activeSlicerField.key]: [] } });
                }}
                style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12 }}
              >
                Clear
              </button>
            </div>

            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {activeOptions.map((o) => {
                const checked = activeSelected.includes(o.value);
                return (
                  <label key={o.value} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked
                          ? activeSelected.filter((v) => v !== o.value)
                          : [...activeSelected, o.value];
                        onChange({
                          ...config,
                          slicers: {
                            ...config.slicers,
                            [activeSlicerField.key]: next,
                          },
                        });
                      }}
                    />
                    <span>{o.label}</span>
                  </label>
                );
              })}

              {activeOptions.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>(no matches)</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 12, color: '#444' }}>Measure</div>
        <select
          value={config.measureKey}
          onChange={(e) => onChange({ ...config, measureKey: e.target.value })}
          style={{ minWidth: 220 }}
        >
          {measureOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
