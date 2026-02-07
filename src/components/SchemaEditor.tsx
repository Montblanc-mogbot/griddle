import { useMemo, useState } from 'react';
import type { DatasetSchema, FieldDef, FieldRole, FieldType } from '../domain/types';

const ALL_ROLES: FieldRole[] = ['rowDim', 'colDim', 'slicer', 'measure', 'flag'];
const ALL_TYPES: FieldType[] = ['string', 'number', 'boolean', 'date'];

function slugifyKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

function uniqueKey(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

export function SchemaEditor(props: {
  schema: DatasetSchema;
  onChange: (schema: DatasetSchema) => void;
}) {
  const { schema, onChange } = props;

  const [selectedKey, setSelectedKey] = useState<string | null>(schema.fields[0]?.key ?? null);

  const selected = useMemo(
    () => schema.fields.find((f) => f.key === selectedKey) ?? null,
    [schema.fields, selectedKey],
  );

  const existingKeys = useMemo(() => new Set(schema.fields.map((f) => f.key)), [schema.fields]);

  function updateField(next: FieldDef) {
    const nextFields = schema.fields.map((f) => (f.key === next.key ? next : f));
    onChange({ ...schema, fields: nextFields });
  }

  function deleteField(key: string) {
    const nextFields = schema.fields.filter((f) => f.key !== key);
    onChange({ ...schema, fields: nextFields });
    setSelectedKey(nextFields[0]?.key ?? null);
  }

  function addField() {
    const base = uniqueKey('new_field', existingKeys);
    const next: FieldDef = {
      key: base,
      label: 'New field',
      type: 'string',
      roles: ['rowDim'],
    };
    onChange({ ...schema, fields: [...schema.fields, next] });
    setSelectedKey(next.key);
  }

  function renameField(field: FieldDef, nextKey: string) {
    const cleaned = slugifyKey(nextKey);
    if (!cleaned) return;

    if (cleaned !== field.key && existingKeys.has(cleaned)) return;

    const nextFields = schema.fields.map((f) => {
      if (f.key !== field.key) return f;
      return { ...field, key: cleaned };
    });

    onChange({ ...schema, fields: nextFields });
    setSelectedKey(cleaned);
  }

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 6,
          padding: 12,
          minWidth: 260,
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>Schema</div>
          <button onClick={addField} style={{ cursor: 'pointer' }}>
            + Field
          </button>
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {schema.fields.map((f) => {
            const isSel = f.key === selectedKey;
            return (
              <button
                key={f.key}
                onClick={() => setSelectedKey(f.key)}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 6,
                  border: '1px solid ' + (isSel ? '#13c2c2' : '#eee'),
                  background: isSel ? '#e6fffb' : '#fafafa',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 600 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{f.key}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 6,
          padding: 12,
          background: '#fff',
          minWidth: 420,
          flex: 1,
        }}
      >
        <div style={{ fontWeight: 700 }}>Field editor</div>

        {!selected ? (
          <div style={{ marginTop: 10, color: '#666' }}>Select a field to edit.</div>
        ) : (
          <div style={{ marginTop: 10, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#666' }}>Label</label>
              <input
                value={selected.label}
                onChange={(e) => updateField({ ...selected, label: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#666' }}>Key</label>
              <input
                value={selected.key}
                onChange={(e) => renameField(selected, e.target.value)}
              />
              <div style={{ fontSize: 12, color: '#999' }}>
                Keys must be unique and are used inside record JSON.
              </div>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#666' }}>Type</label>
              <select
                value={selected.type}
                onChange={(e) => updateField({ ...selected, type: e.target.value as FieldType })}
              >
                {ALL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#666' }}>Roles</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {ALL_ROLES.map((role) => {
                  const checked = selected.roles.includes(role);
                  return (
                    <label key={role} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const nextRoles = e.target.checked
                            ? [...selected.roles, role]
                            : selected.roles.filter((r) => r !== role);
                          updateField({ ...selected, roles: nextRoles });
                        }}
                      />
                      <span>{role}</span>
                    </label>
                  );
                })}
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>
                Note: we allow empty roles for flexibility; pivot controls will only show eligible fields.
              </div>
            </div>

            <div style={{ display: 'grid', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#666' }}>Entry UI</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={Boolean(selected.entry?.showInFastEntry)}
                  onChange={(e) => {
                    updateField({
                      ...selected,
                      entry: {
                        ...selected.entry,
                        showInFastEntry: e.target.checked,
                      },
                    });
                  }}
                />
                <span>Show in fast entry</span>
              </label>
              <div style={{ fontSize: 12, color: '#999' }}>
                Fast entry is the right-side Entry drawer.
              </div>
            </div>

            {selected.type === 'string' ? (
              <EnumEditor
                value={selected.enum ?? []}
                onChange={(next) => updateField({ ...selected, enum: next.length ? next : undefined })}
              />
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => deleteField(selected.key)}
                style={{ cursor: 'pointer', background: '#fff1f0', border: '1px solid #ffa39e' }}
              >
                Delete field
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EnumEditor(props: { value: string[]; onChange: (value: string[]) => void }) {
  const { value, onChange } = props;
  const [draft, setDraft] = useState(value.join('\n'));

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, color: '#666' }}>Enum (one option per line)</label>
      <textarea
        rows={6}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const next = e.target.value
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);
          onChange(Array.from(new Set(next)));
        }}
      />
      <div style={{ fontSize: 12, color: '#999' }}>Optional. Used for categorical pickers later.</div>
    </div>
  );
}
