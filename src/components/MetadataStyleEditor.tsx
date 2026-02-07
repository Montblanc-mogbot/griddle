import type { DatasetSchema, FieldDef } from '../domain/types';
import { ensureDefaultFlagRules } from '../domain/metadataStyling';

function FlagRow(props: {
  field: FieldDef;
  onChange: (next: FieldDef) => void;
  onReset: () => void;
}) {
  const { field, onChange, onReset } = props;
  const rules = field.flag?.styleRules ?? {};

  function setRule(kind: 'none' | 'some' | 'all', patch: { bg?: string; text?: string }) {
    const prev = rules[kind] ?? {};
    onChange({
      ...field,
      flag: {
        ...field.flag,
        styleRules: {
          ...rules,
          [kind]: { ...prev, ...patch },
        },
      },
    });
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr 1fr 1fr auto',
        gap: 10,
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid #f1f1f1',
      }}
    >
      <div style={{ fontWeight: 800 }}>{field.label}</div>

      {(['none', 'some', 'all'] as const).map((k) => {
        const bg = rules[k]?.bg;
        const text = rules[k]?.text;
        return (
          <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ width: 46, fontSize: 12, color: '#666', fontWeight: 800 }}>{k}</div>
            <input
              type="color"
              value={bg ?? '#ffffff'}
              onChange={(e) => setRule(k, { bg: e.target.value })}
              title="Background"
            />
            <input
              type="color"
              value={text ?? '#111111'}
              onChange={(e) => setRule(k, { text: e.target.value })}
              title="Text"
            />
            <div
              style={{
                width: 68,
                height: 22,
                borderRadius: 6,
                border: '1px solid #ddd',
                background: bg ?? '#fff',
                color: text ?? '#111',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              Aa
            </div>
          </div>
        );
      })}

      <button onClick={onReset} style={{ padding: '6px 10px', fontSize: 12 }}>
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
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: 12,
        boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
        padding: 12,
        zIndex: 80,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Metadata styling</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            Styles are derived per pivot cell from the underlying records. For each flag: none / some / all.
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
        <div style={{ marginTop: 10, fontSize: 13, color: '#666' }}>
          No flag fields in the schema yet. Mark a boolean field with role <b>flag</b> to enable metadata styling.
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: '#666', fontWeight: 800, marginBottom: 8 }}>
            Each row is a flag. Pick background + text colors for none/some/all.
          </div>

          <div style={{ borderTop: '1px solid #f1f1f1' }}>
            {flags.map((f) => (
              <FlagRow
                key={f.key}
                field={f}
                onChange={(next) => {
                  const nextFields = normalized.fields.map((ff) => (ff.key === next.key ? next : ff));
                  onChange({ ...normalized, fields: nextFields });
                }}
                onReset={() => {
                  // remove rules, then re-ensure defaults
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
