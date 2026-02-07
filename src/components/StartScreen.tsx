export function StartScreen(props: { onOpen: () => void }) {
  const { onOpen } = props;

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
          <div style={{ fontWeight: 1000, fontSize: 22 }}>Griddle</div>
          <div style={{ color: 'var(--muted)', marginTop: 4 }}>
            Open an existing <b>.griddle</b> file to get started.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={onOpen} style={{ padding: '10px 14px' }}>
            Open…
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Your data stays in your file. (We may later add a “New griddle” wizard.)
        </div>
      </div>
    </div>
  );
}
