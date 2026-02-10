import type { DatasetSchema, FieldDef } from '../domain/types';
import { ensureDefaultFlagRules } from '../domain/metadataStyling';

interface StylePropertyConfig {
  key: 'bg' | 'text';
  label: string;
}

const STYLE_PROPERTIES: StylePropertyConfig[] = [
  { key: 'bg', label: 'Background' },
  { key: 'text', label: 'Text color' },
];

function FlagRow(props: {
  field: FieldDef;
  onChange: (next: FieldDef) => void;
  onReset: () => void;
}) {
  const { field, onChange, onReset } = props;
  const rules = field.flag?.styleRules ?? {};

  function setStyleProperty(
    prop: 'bg' | 'text',
    updates: { enabled?: boolean; some?: string; all?: string },
  ) {
    const current = rules[prop] ?? { enabled: false };
    onChange({
      ...field,
      flag: {
        ...field.flag,
        styleRules: {
          ...rules,
          [prop]: { ...current, ...updates },
        },
      },
    });
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr 1fr auto',
        gap: 10,
        alignItems: 'start',
        padding: '12px 0',
        borderBottom: '1px solid var(--border2)',
      }}
    >
      <div style={{ fontWeight: 800, color: 'var(--text)', paddingTop: 8 }}>{field.label}</div>

      {STYLE_PROPERTIES.map((prop) => {
        const config = rules[prop.key];
        const enabled = config?.enabled ?? false;
        const some = config?.some ?? '#ffffff';
        const all = config?.all ?? '#ffffff';

        return (
          <div key={prop.key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setStyleProperty(prop.key, { enabled: e.target.checked })}
                />
                <span style={{ fontSize: 12, fontWeight: 700 }}>{prop.label}</span>
              </label>
            </div>

            {enabled ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', width: 40 }}>Some:</span>
                  <input
                    type="color"
                    value={some}
                    onChange={(e) => setStyleProperty(prop.key, { some: e.target.value })}
                    title={`${prop.label} - Some records`}
                    style={{ width: 50 }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', width: 40 }}>All:</span>
                  <input
                    type="color"
                    value={all}
                    onChange={(e) => setStyleProperty(prop.key, { all: e.target.value })}
                    title={`${prop.label} - All records`}
                    style={{ width: 50 }}
                  />
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginLeft: 20,
                  fontSize: 11,
                  color: 'var(--muted)',
                  fontStyle: 'italic',
                }}
              >
                Using default
              </div>
            )}
          </div>
        );
      })}

      <button onClick={onReset} style={{ padding: '6px 10px', fontSize: 12, marginTop: 8 }}>
        Reset
      </button>
    </div>
  );
}

export function MetadataStyleEditor(props: {
  schema: DatasetSchema;
  onChange: (next: DatasetSchema) => void;
  onClose: () => void;
}) {
  const { schema, onChange, onClose } = props;

  const normalized = ensureDefaultFlagRules(schema);
  const flags = normalized.fields.filter((f) => f.roles.includes('flag'));

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        top: 62,
        width: 860,
        maxWidth: 'calc(100vw - 24px)',
        maxHeight: 'calc(100vh - 80px)',
        overflow: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow)',
        padding: 12,
        zIndex: 80,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, color: 'var(--text)' }}>Metadata styling</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Enable properties per flag. Disabled properties use the default theme. Priority order applies
            when multiple flags match.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onChange(ensureDefaultFlagRules(schema))}
            style={{ padding: '8px 10px', fontSize: 12 }}
          >
            Apply defaults
          </button>
          <button onClick={onClose} style={{ padding: '8px 10px', fontSize: 12 }}>
            Close
          </button>
        </div>
      </div>

      {flags.length === 0 ? (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>
          No flag fields in the schema yet. Mark a boolean field with role <b>flag</b> to enable metadata
          styling.
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr 1fr auto',
              gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--border2)',
              fontSize: 12,
              color: 'var(--muted)',
              fontWeight: 800,
            }}
          >
            <div>Flag</div>
            <div>Background</div>
            <div>Text color</div>
            <div></div>
          </div>

          <div>
            {flags.map((f) => (
              <FlagRow
                key={f.key}
                field={f}
                onChange={(next) => {
                  const nextFields = normalized.fields.map((ff) => (ff.key === next.key ? next : ff));
                  onChange({ ...normalized, fields: nextFields });
                }}
                onReset={() => {
                  const nextFields = normalized.fields.map((ff) => {
                    if (ff.key !== f.key) return ff;
                    return {
                      ...ff,
                      flag: {
                        ...ff.flag,
                        styleRules: undefined,
                      },
                    };
                  });
                  onChange(ensureDefaultFlagRules({ ...normalized, fields: nextFields }));
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
