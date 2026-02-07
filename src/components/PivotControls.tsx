import type { DatasetSchema, PivotConfig, RecordEntity } from '../domain/types';

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
}) {
  const { schema, records, config, onChange } = props;

  const dimOptions = schema.fields
    .filter((f) => f.roles.some((r) => r === 'rowDim' || r === 'colDim' || r === 'slicer'))
    .filter((f) => !f.roles.includes('measure') && !f.roles.includes('flag'))
    .map((f) => ({ value: f.key, label: f.label }));

  const measureOptions = fieldsByRole(schema, 'measure').map((f) => ({
    value: f.key,
    label: f.label,
  }));

  // Any non-measure/non-flag field can act as a slicer (including current row/col dims).
  const slicerFields = schema.fields.filter(
    (f) => !f.roles.includes('measure') && !f.roles.includes('flag'),
  );

  const slicerOptions = slicerFields.map((f) => ({ value: f.key, label: f.label }));

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MultiSelect
          label="Slicers"
          options={slicerOptions}
          values={config.slicerKeys}
          onChange={(slicerKeys) => {
            // Keep existing slicer values for still-selected keys.
            const nextSlicers = Object.fromEntries(
              Object.entries(config.slicers).filter(([k]) => slicerKeys.includes(k)),
            );
            onChange({ ...config, slicerKeys, slicers: nextSlicers });
          }}
        />

        {config.slicerKeys.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {config.slicerKeys.map((k) => {
              const field = slicerFields.find((f) => f.key === k);
              if (!field) return null;

              const options = (field.enum ?? uniqValues(records, k)).map((v) => ({ value: v, label: v }));
              const desired = config.slicers[k];
              const values = Array.isArray(desired) ? desired.map(String) : desired ? [String(desired)] : [];

              return (
                <MultiSelect
                  key={k}
                  label={`Filter: ${field.label}`}
                  options={options}
                  values={values}
                  onChange={(nextValues) => {
                    onChange({
                      ...config,
                      slicers: {
                        ...config.slicers,
                        [k]: nextValues,
                      },
                    });
                  }}
                />
              );
            })}
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
