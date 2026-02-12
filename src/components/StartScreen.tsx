export function StartScreen(props: { onOpen: () => void; onNew: () => void }) {
  const { onOpen, onNew } = props;

  return (
    <div
      style={{
        height: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        color: 'var(--text)',
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 560, width: '100%', display: 'grid', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/griddle-logo.png" alt="Griddle" style={{ width: 34, height: 34 }} />
            <div style={{ fontWeight: 1000, fontSize: 22 }}>Griddle</div>
          </div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>
            Open an existing <b>.griddle</b> file to get started.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={onNew} style={{ padding: '10px 14px', fontWeight: 900 }}>
            New…
          </button>
          <button onClick={onOpen} style={{ padding: '10px 14px' }}>
            Open…
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          New creates an empty griddle; Open loads an existing <b>.griddle</b> file.
        </div>
      </div>
    </div>
  );
}
