import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

function Menu(props: {
  label: string;
  children: ReactNode;
}) {
  const { label, children } = props;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  function updatePos() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 4 });
  }

  useEffect(() => {
    if (!open) return;
    // Defer to avoid setState directly in effect body (lint rule).
    const t = window.setTimeout(updatePos, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (btnRef.current?.contains(t)) return;
      const pop = document.getElementById(`menu-${label}`);
      if (pop?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, label]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((s) => !s)}
        style={{
          padding: '6px 10px',
          borderRadius: 8,
          border: '1px solid transparent',
          background: open ? '#f0f0f0' : 'transparent',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {label}
      </button>

      {open && pos ? (
        <div
          id={`menu-${label}`}
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width: 220,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
            padding: 6,
            zIndex: 90,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem(props: { label: string; onClick: () => void; disabled?: boolean }) {
  const { label, onClick, disabled } = props;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid transparent',
        background: 'transparent',
        fontSize: 13,
        fontWeight: 650,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#eee', margin: '6px 4px' }} />;
}

export function MenuBar(props: {
  onOpenFile: () => void;
  onSaveGriddle: () => void;
  onExportDataset: () => void;
  onShowPivotLayout: () => void;
  onShowFilters: () => void;
  onClearSelection: () => void;
  onShowSchema: () => void;
  onShowStyles: () => void;
}) {
  const {
    onOpenFile,
    onSaveGriddle,
    onExportDataset,
    onShowPivotLayout,
    onShowFilters,
    onClearSelection,
    onShowSchema,
    onShowStyles,
  } = props;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <Menu label="File">
        <MenuItem label="Open…" onClick={onOpenFile} />
        <MenuItem label="Save .griddle" onClick={onSaveGriddle} />
        <MenuItem label="Export dataset.json" onClick={onExportDataset} />
      </Menu>

      <Menu label="Edit">
        <MenuItem label="Clear selection" onClick={onClearSelection} />
      </Menu>

      <Menu label="View">
        <MenuItem label="Pivot layout…" onClick={onShowPivotLayout} />
        <MenuItem label="Filters…" onClick={onShowFilters} />
        <Divider />
        <MenuItem label="Styles…" onClick={onShowStyles} />
        <MenuItem label="Schema…" onClick={onShowSchema} />
      </Menu>

      <Menu label="Help">
        <MenuItem label="(coming soon)" onClick={() => {}} disabled />
      </Menu>
    </div>
  );
}
