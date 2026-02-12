import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './menu.module.css';

export function Menu(props: {
  label: string;
  children: ReactNode;
}) {
  const { label, children } = props;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  function updatePos() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.left, top: r.bottom + 6 });
  }

  useEffect(() => {
    if (!open) return;
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
    <div className={styles.menuWrap}>
      <button
        ref={btnRef}
        onClick={() => setOpen((s) => !s)}
        className={styles.menuButton}
        aria-expanded={open}
      >
        {label}
      </button>

      {open && pos ? (
        <div
          id={`menu-${label}`}
          className={styles.menuPopover}
          style={{ left: pos.left, top: pos.top }}
          role="menu"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem(props: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { label, shortcut, onClick, disabled, danger } = props;
  return (
    <button
      className={`${styles.menuItem} ${danger ? styles.danger : ''}`}
      onClick={onClick}
      disabled={disabled}
      role="menuitem"
    >
      <span>{label}</span>
      {shortcut ? <span className={styles.shortcut}>{shortcut}</span> : null}
    </button>
  );
}

export function MenuDivider() {
  return <div className={styles.divider} />;
}
