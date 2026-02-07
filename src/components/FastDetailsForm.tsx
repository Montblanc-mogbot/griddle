import { useMemo, useState } from 'react';
import type { DatasetSchema, FieldDef } from '../domain/types';

function isFast(field: FieldDef): boolean {
  return Boolean(field.entry?.showInFastEntry);
}

export function FastDetailsForm(props: {
  schema: DatasetSchema;
  onChange: (values: Record<string, unknown>) => void;
}) {
  const { schema, onChange } = props;

  const fields = useMemo(
    () => schema.fields.filter((f) => isFast(f) && !f.roles.includes('measure') && !f.roles.includes('flag')),
    [schema],
  );

  const [draft, setDraft] = useState<Record<string, unknown>>({});

  if (fields.length === 0) return null;

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Details</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {fields.map((f) => {
          const v = draft[f.key];

          const set = (next: unknown) => {
            const nextDraft = { ...draft, [f.key]: next };
            setDraft(nextDraft);
            onChange(nextDraft);
          };

          if (f.type === 'boolean') {
            return (
              <label key={f.key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} />
                <span>{f.label}</span>
              </label>
            );
          }

          if (f.enum && f.enum.length > 0) {
            return (
              <label key={f.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>{f.label}</div>
                <select value={String(v ?? '')} onChange={(e) => set(e.target.value)}>
                  <option value="">(blank)</option>
                  {f.enum.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
            );
          }

          if (f.type === 'number') {
            return (
              <label key={f.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>{f.label}</div>
                <input
                  type="number"
                  value={String(v ?? '')}
                  onChange={(e) => set(e.target.value)}
                  placeholder=""
                />
              </label>
            );
          }

          if (f.type === 'date') {
            return (
              <label key={f.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>{f.label}</div>
                <input type="date" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />
              </label>
            );
          }

          return (
            <label key={f.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <div style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>{f.label}</div>
              <input type="text" value={String(v ?? '')} onChange={(e) => set(e.target.value)} />
            </label>
          );
        })}
      </div>
    </div>
  );
}
