import { useMemo, useState } from 'react';
import type { DatasetSchema, FilterSet, RecordEntity } from '../domain/types';
import {
  dimensionKeysEligibleForFiltering,
  dimensionLabel,
  filterSetActiveCount,
  getFilter,
  removeFilter,
  uniqueDimensionValues,
  upsertFilter,
} from '../domain/filters';

export function FilterPopup(props: {
  schema: DatasetSchema;
  records: RecordEntity[];
  active: FilterSet;
  onApply: (next: FilterSet) => void;
  onClose: () => void;
}) {
  const { schema, records, active, onApply, onClose } = props;

  const dimensionKeys = useMemo(() => dimensionKeysEligibleForFiltering(schema), [schema]);
  const [draft, setDraft] = useState<FilterSet>(() => ({ name: active.name, filters: active.filters.map((f) => ({ ...f })) }));

  const [activeDim, setActiveDim] = useState<string>(() => dimensionKeys[0] ?? '');
  const [search, setSearch] = useState('');

  const activeFilter = useMemo(() => (activeDim ? getFilter(draft, activeDim) : null), [draft, activeDim]);

  const values = useMemo(() => {
    if (!activeDim) return [];
    const all = uniqueDimensionValues(records, activeDim);
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((v) => v.toLowerCase().includes(q));
  }, [records, activeDim, search]);

  const selectedSet = useMemo(() => new Set(activeFilter?.values ?? []), [activeFilter?.values]);

  function setValues(nextValues: string[]) {
    if (!activeFilter) return;
    const next = { ...activeFilter, values: nextValues };
    // If a filter has no values, remove it entirely (keeps the state clean).
    setDraft((prev) => (next.values.length ? upsertFilter(prev, next) : removeFilter(prev, next.dimensionKey)));
  }

  return (
    <div style={{ display: 'flex', gap: 12, height: 520, width: 860 }}>
      <div
        style={{
          width: 260,
          borderRight: '1px solid var(--border)',
          paddingRight: 12,
          overflow: 'auto',
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
          Dimensions ({filterSetActiveCount(draft)})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {dimensionKeys.map((k) => {
            const isActive = k === activeDim;
            const f = getFilter(draft, k);
            const count = f.values.length;

            return (
              <button
                key={k}
                onClick={() => {
                  setActiveDim(k);
                  setSearch('');
                }}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: isActive ? 'var(--surface2)' : 'var(--surface)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 700 }}>{dimensionLabel(schema, k)}</span>
                  {count > 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{count}</span>
                  ) : null}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>{activeDim ? dimensionLabel(schema, activeDim) : '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{activeDim}</div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
              <input
                type="radio"
                name="mode"
                checked={activeFilter?.mode !== 'exclude'}
                onChange={() => {
                  if (!activeFilter) return;
                  setDraft((prev) => upsertFilter(prev, { ...activeFilter, mode: 'include' }));
                }}
              />
              Include
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}>
              <input
                type="radio"
                name="mode"
                checked={activeFilter?.mode === 'exclude'}
                onChange={() => {
                  if (!activeFilter) return;
                  setDraft((prev) => upsertFilter(prev, { ...activeFilter, mode: 'exclude' }));
                }}
              />
              Exclude
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search values…"
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          />

          <button
            onClick={() => {
              if (!activeDim) return;
              setValues(uniqueDimensionValues(records, activeDim));
            }}
          >
            Select all
          </button>
          <button
            onClick={() => {
              if (!activeDim) return;
              setValues([]);
            }}
          >
            None
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflow: 'auto',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: 10,
            background: 'var(--surface)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {values.map((v) => {
              const checked = selectedSet.has(v);
              return (
                <label
                  key={v}
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selectedSet);
                      if (checked) next.delete(v);
                      else next.add(v);
                      setValues(Array.from(next));
                    }}
                  />
                  <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>{
                    v === '' ? '(empty)' : v
                  }</span>
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            style={{ fontWeight: 800 }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
