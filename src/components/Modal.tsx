import type { ReactNode } from 'react';
import { useEffect } from 'react';

export function Modal(props: {
  title?: string;
  children: ReactNode;
  onClose: () => void;
  width?: number;
}) {
  const { title, children, onClose, width = 1100 } = props;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'auto',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 12,
          boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#fff',
            borderBottom: '1px solid #eee',
            padding: '10px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            zIndex: 1,
          }}
        >
          <div style={{ fontWeight: 900 }}>{title ?? ''}</div>
          <button onClick={onClose} style={{ padding: '6px 10px', fontSize: 12 }}>
            Close
          </button>
        </div>

        <div style={{ padding: 12 }}>{children}</div>
      </div>
    </div>
  );
}
