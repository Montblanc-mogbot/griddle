import type { AxisDomain, FieldDef } from '../domain/types';

export function PivotAxisDomainEditor(props: { field: FieldDef; onChange: (next: FieldDef) => void }) {
  const { field, onChange } = props;

  const enabled = Boolean(field.pivot?.includeEmptyAxisItems);
  const domain = field.pivot?.axisDomain;

  const dr = domain?.kind === 'dateRange' ? domain : null;

  function setDomain(next: AxisDomain | undefined) {
    onChange({
      ...field,
      pivot: {
        ...field.pivot,
        axisDomain: next,
      },
    });
  }

  const isEligible = field.roles.includes('rowDim') || field.roles.includes('colDim');

  if (!isEligible) return null;

  return (
    <div style={{ display: 'grid', gap: 8, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 700 }}>Pivot axis</div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            const includeEmptyAxisItems = e.target.checked;
            onChange({
              ...field,
              pivot: {
                ...field.pivot,
                includeEmptyAxisItems,
                axisDomain:
                  includeEmptyAxisItems
                    ? field.pivot?.axisDomain ??
                      (field.type === 'date'
                        ? { kind: 'dateRange', start: '', end: '', includeWeekends: true }
                        : { kind: 'list', values: [] })
                    : field.pivot?.axisDomain,
              },
            });
          }}
        />
        <span>Include empty items on axes (show members even with no data)</span>
      </label>

      {enabled ? (
        <div style={{ display: 'grid', gap: 8, paddingLeft: 22 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>Domain type</label>
            <select
              value={domain?.kind ?? 'dateRange'}
              onChange={(e) => {
                const kind = e.target.value;
                if (kind === 'dateRange') setDomain({ kind: 'dateRange', start: '', end: '', includeWeekends: true });
                if (kind === 'list') setDomain({ kind: 'list', values: [] });
                if (kind === 'enum') setDomain({ kind: 'enum' });
              }}
            >
              {field.type === 'date' ? <option value="dateRange">dateRange</option> : null}
              <option value="list">list</option>
              {field.type === 'string' ? <option value="enum">enum</option> : null}
            </select>
          </div>

          {domain?.kind === 'dateRange' ? (
            <>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--muted)' }}>Start</label>
                  <input
                    type="date"
                    value={dr?.start ?? ''}
                    onChange={(e) => setDomain({ kind: 'dateRange', start: e.target.value, end: dr?.end ?? '', includeWeekends: dr?.includeWeekends })}
                  />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <label style={{ fontSize: 12, color: 'var(--muted)' }}>End</label>
                  <input
                    type="date"
                    value={dr?.end ?? ''}
                    onChange={(e) => setDomain({ kind: 'dateRange', start: dr?.start ?? '', end: e.target.value, includeWeekends: dr?.includeWeekends })}
                  />
                </div>
              </div>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={dr?.includeWeekends ?? true}
                  onChange={(e) =>
                    setDomain({ kind: 'dateRange', start: dr?.start ?? '', end: dr?.end ?? '', includeWeekends: e.target.checked })
                  }
                />
                <span>Include weekends</span>
              </label>
            </>
          ) : null}

          {domain?.kind === 'list' ? (
            <ListEditor
              value={domain.values}
              onChange={(values) => setDomain({ kind: 'list', values })}
            />
          ) : null}

          {domain?.kind === 'enum' ? (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              Uses this field’s <b>enum</b> values.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ListEditor(props: { value: string[]; onChange: (value: string[]) => void }) {
  const { value, onChange } = props;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--muted)' }}>Values (one per line)</label>
      <textarea
        value={value.join('\n')}
        onChange={(e) => {
          const next = e.target.value
            .split('\n')
            .map((x) => x.trim())
            .filter(Boolean);
          onChange(next);
        }}
        rows={6}
        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
      />
    </div>
  );
}
