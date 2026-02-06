import type { DatasetSchema, PivotConfig } from '../domain/types';

function fieldsByRole(schema: DatasetSchema, role: string) {
  return schema.fields.filter((f) => f.roles.includes(role as never));
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
        style={{ minWidth: 220, minHeight: 90 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div style={{ fontSize: 11, color: '#777' }}>Tip: ctrl/cmd+click to select multiple</div>
    </label>
  );
}

export function PivotControls(props: {
  schema: DatasetSchema;
  config: PivotConfig;
  onChange: (cfg: PivotConfig) => void;
}) {
  const { schema, config, onChange } = props;

  const dimOptions = schema.fields.map((f) => ({ value: f.key, label: f.label }));
  const measureOptions = fieldsByRole(schema, 'measure').map((f) => ({
    value: f.key,
    label: f.label,
  }));

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <MultiSelect
        label="Rows"
        options={dimOptions}
        values={config.rowKeys}
        onChange={(rowKeys) => onChange({ ...config, rowKeys })}
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
    </div>
  );
}
