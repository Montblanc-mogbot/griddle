import type { UiPrefsV1 } from '../domain/uiPrefs';
import { DEFAULT_UI_PREFS } from '../domain/uiPrefs';

function Row(props: { label: string; description?: string; children: React.ReactNode }) {
  const { label, description, children } = props;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border2)',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 900 }}>{label}</div>
        {description ? <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{description}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function PreferencesPanel(props: {
  prefs: UiPrefsV1;
  onChange: (next: UiPrefsV1) => void;
}) {
  const { prefs, onChange } = props;

  return (
    <div style={{ color: 'var(--text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Preferences</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            These settings are stored locally in your browser.
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_UI_PREFS)}
          style={{ padding: '8px 10px', fontSize: 12 }}
        >
          Reset to defaults
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <Row
          label="Notes indicator color"
          description="Controls the dot shown when a record has notes (tape + full records)."
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="color"
              value={prefs.noteIndicatorColor}
              onChange={(e) => onChange({ ...prefs, noteIndicatorColor: e.target.value })}
              title="Notes indicator color"
              style={{ width: 56, height: 32 }}
            />
            <code style={{ fontSize: 12, color: 'var(--muted)' }}>{prefs.noteIndicatorColor}</code>
          </div>
        </Row>

        <Row
          label="Working group highlight color"
          description="Controls the highlight for records toggled as Working in Full Records."
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="color"
              value={prefs.workingGroupHighlightColor}
              onChange={(e) => onChange({ ...prefs, workingGroupHighlightColor: e.target.value })}
              title="Working group highlight color"
              style={{ width: 56, height: 32 }}
            />
            <code style={{ fontSize: 12, color: 'var(--muted)' }}>{prefs.workingGroupHighlightColor}</code>
          </div>
        </Row>
      </div>
    </div>
  );
}
